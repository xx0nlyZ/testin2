/* Registrar "Add Student" dialog tests: real Edge headless + CDP against a
   local static server. Covers the redesigned dialog - layout, inline
   validation, account creation and dismissal.

   Run: node _dev-tests/registrar-add-student.test.js */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.join(__dirname, '..', 'StudentPortalSample');
const PORT = 8124;
const BASE = `http://127.0.0.1:${PORT}`;
const DEBUG_PORT = 9335;
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PROFILE = path.join(require('os').tmpdir(), 'cec-add-student-' + Date.now());

const MIME = {
    '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.json': 'application/json'
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

let passed = 0, failed = 0;
const failures = [];
function check(label, ok, detail) {
    if (ok) { passed++; console.log('  PASS  ' + label); }
    else { failed++; failures.push(label + (detail ? ' -> ' + detail : '')); console.log('  FAIL  ' + label + (detail ? '\n        ' + detail : '')); }
}

/* ---------- static server ---------- */
const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split('?')[0]);
    let file = path.join(ROOT, urlPath === '/' ? 'index/index.html' : urlPath);
    if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
    fs.readFile(file, (err, data) => {
        if (err) { res.writeHead(404); return res.end('not found'); }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
        res.end(data);
    });
});

/* ---------- minimal CDP client ---------- */
function connectCdp(wsUrl) {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(wsUrl);
        const pending = new Map();
        let nextId = 1;
        ws.onmessage = (e) => {
            let m;
            try { m = JSON.parse(e.data); } catch (err) { return; }
            if (m.id && pending.has(m.id)) {
                const { res, rej } = pending.get(m.id);
                pending.delete(m.id);
                if (m.error) rej(new Error(m.error.message || 'CDP error: ' + m.method));
                else res(m.result || {});
            }
        };
        ws.onopen = () => {
            const api = {
                send(method, params = {}, timeout = 15000) {
                    return new Promise((res, rej) => {
                        const id = nextId++;
                        pending.set(id, { res, rej });
                        ws.send(JSON.stringify({ id, method, params }));
                        setTimeout(() => { if (pending.has(id)) { pending.delete(id); rej(new Error('CDP timeout: ' + method)); } }, timeout);
                    });
                },
                async eval(expression) {
                    const r = await api.send('Runtime.evaluate', {
                        expression, returnByValue: true, awaitPromise: true
                    }, 6000);
                    if (r.exceptionDetails) {
                        const d = r.exceptionDetails;
                        throw new Error((d.exception && d.exception.description) || d.text || 'eval exception');
                    }
                    return r.result && r.result.value;
                },
                navigate(url) {
                    return api.send('Page.navigate', { url }, 8000).catch(() => null);
                },
                async viewport(width, height) {
                    await api.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
                },
                close() { try { ws.close(); } catch (e) { /* ignore */ } }
            };
            resolve(api);
        };
        ws.onerror = (e) => reject(new Error('WebSocket error: ' + (e.message || e)));
    });
}

async function waitFor(cdp, expression, timeout = 8000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        try {
            const v = await cdp.eval(expression);
            if (v) return v;
        } catch (e) { /* context may be navigating */ }
        await sleep(250);
    }
    return null;
}

async function goto(cdp, url) {
    await cdp.navigate(url);
    await waitFor(cdp, 'document.readyState === "complete"', 10000);
    await sleep(400);
}

/* Seed a registrar session so the session guard lets the page through. */
const REGISTRAR_SESSION = JSON.stringify({
    id: 'REG-12345', username: 'rosa.manalo', email: 'registrar@cec.edu.ph',
    name: 'Rosa Manalo', role: 'registrar', status: 'Active', meta: {},
    loggedInAt: new Date().toISOString(), remember: true
});

const RECORDS_URL = BASE + '/registrar/pages/student-record/student-records.html';

async function main() {
    await new Promise(r => server.listen(PORT, '127.0.0.1', r));

    const edge = spawn(EDGE, [
        '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
        '--hide-scrollbars', '--remote-debugging-port=' + DEBUG_PORT,
        '--user-data-dir=' + PROFILE, 'about:blank'
    ], { stdio: 'ignore' });

    let cdp = null;
    for (let i = 0; i < 40 && !cdp; i++) {
        try {
            const list = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json();
            const page = list.find(t => t.type === 'page' && t.webSocketDebuggerUrl);
            if (page) cdp = await connectCdp(page.webSocketDebuggerUrl);
        } catch (e) { /* not up yet */ }
        if (!cdp) await sleep(400);
    }
    if (!cdp) throw new Error('Could not attach to headless Edge over CDP');

    try {
        await cdp.eval('true');
        await cdp.send('Page.enable');

        /* establish the origin, then seed the session */
        await goto(cdp, BASE + '/index/index.html');
        await cdp.eval(`localStorage.setItem('cec_session_v1', ${JSON.stringify(REGISTRAR_SESSION)}); true`);

        await cdp.viewport(1440, 900);
        await goto(cdp, RECORDS_URL);
        await waitFor(cdp, '!!document.getElementById("btn-add-student")');

        console.log('\n--- The dialog is built from the shared registrar form system ---');
        const layout = await cdp.eval(`(() => {
            const cs = getComputedStyle(document.getElementById('new-name'));
            const grid = getComputedStyle(document.querySelector('#add-student-form .form-grid'));
            const label = getComputedStyle(document.querySelector('#add-student-form .field label'));
            const em = getComputedStyle(document.querySelector('#add-student-form .field label em'));
            return JSON.stringify({
                border: cs.borderTopColor,
                radius: getComputedStyle(document.getElementById('new-name')).borderRadius,
                font: cs.fontFamily,
                columns: grid.gridTemplateColumns,
                labelSize: label.fontSize,
                labelWeight: label.fontWeight,
                requiredColor: em.color,
                requiredStyle: em.fontStyle,
                sections: document.querySelectorAll('#add-student-form .card').length
            });
        })()`);
        const L = JSON.parse(layout);
        check('inputs use the registrar field styling', L.border === 'rgb(205, 217, 232)' && L.radius === '8px' && /Arial/.test(L.font), layout);
        check('form lays out in two columns', L.columns.trim().split(/\s+/).length === 2, L.columns);
        check('labels use the registrar label styling', L.labelSize === '12.5px' && L.labelWeight === '700', layout);
        check('required marker is the registrar red', L.requiredColor === 'rgb(179, 38, 30)' && L.requiredStyle === 'normal', layout);
        check('dialog groups fields into three sections', L.sections === 3, 'sections: ' + L.sections);

        console.log('\n--- Opening and dismissing the dialog ---');
        await cdp.eval(`document.getElementById('btn-add-student').click(); true`);
        await sleep(400);
        check('dialog opens from the Add Student button', await cdp.eval(`document.getElementById('modal-add').classList.contains('active')`));
        check('dialog fits the viewport', await cdp.eval(`(() => {
            const b = document.querySelector('#modal-add .modal').getBoundingClientRect();
            return b.top >= 0 && b.bottom <= innerHeight + 1 && b.left >= 0 && b.right <= innerWidth + 1;
        })()`));
        check('no element overflows the dialog', await cdp.eval(`(() => {
            const mb = document.querySelector('#modal-add .modal').getBoundingClientRect();
            return Array.from(document.querySelectorAll('#modal-add *')).every(el => {
                const b = el.getBoundingClientRect();
                return b.width === 0 || (b.right <= mb.right + 1 && b.left >= mb.left - 1);
            });
        })()`));
        check('focus moves into the dialog', await cdp.eval(`document.activeElement && document.activeElement.closest('#modal-add') !== null`));

        await cdp.eval(`document.querySelector('#modal-add [data-close]').click(); true`);
        await sleep(250);
        check('cancel closes the dialog', await cdp.eval(`!document.getElementById('modal-add').classList.contains('active')`));

        await cdp.eval(`document.getElementById('btn-add-student').click(); true`);
        await sleep(300);
        await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
        await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
        await sleep(250);
        check('Escape closes the dialog', await cdp.eval(`!document.getElementById('modal-add').classList.contains('active')`));

        console.log('\n--- Empty submit is rejected with inline field errors ---');
        const before = await cdp.eval('CECAuth.listAccounts().length');
        await cdp.eval(`document.getElementById('btn-add-student').click(); true`);
        await sleep(300);
        await cdp.eval(`document.getElementById('btn-save-student').click(); true`);
        await sleep(400);
        const invalidCount = await cdp.eval(`document.querySelectorAll('#add-student-form .invalid').length`);
        const visibleErrors = await cdp.eval(`document.querySelectorAll('#add-student-form .field-error.visible').length`);
        check('every empty required field is flagged', invalidCount === 7 && visibleErrors === 7, `invalid: ${invalidCount}, errors: ${visibleErrors}`);
        check('the dialog stays open on an invalid submit', await cdp.eval(`document.getElementById('modal-add').classList.contains('active')`));
        check('no account is created by an invalid submit', await cdp.eval('CECAuth.listAccounts().length') === before);
        check('a toast explains the failure', /highlighted/i.test(await cdp.eval(`document.querySelector('#toast-wrap .toast')?.textContent || ''`)));

        console.log('\n--- A valid submit creates the student account ---');
        await cdp.eval(`(() => {
            document.getElementById('new-name').value = 'Newly Enrolled';
            document.getElementById('new-id').value = '2026-77777';
            document.getElementById('new-course').value = 'BS Information Technology';
            document.getElementById('new-year').value = '1st Year';
            document.getElementById('new-section').value = 'BSIT-1Z';
            document.getElementById('new-status').value = 'Active';
            document.getElementById('new-email').value = 'newly.enrolled@student.cec.edu.ph';
            document.getElementById('new-password').value = 'Temp1234!';
            document.getElementById('btn-save-student').click();
            return true;
        })()`);
        await sleep(600);
        check('the dialog closes after a valid submit', await cdp.eval(`!document.getElementById('modal-add').classList.contains('active')`));
        const created = await cdp.eval(`CECAuth.listAccounts().some(a => a.id === '2026-77777' && a.role === 'student')`);
        check('the student account exists', created);
        const login = await cdp.eval(`JSON.stringify(CECAuth.login('2026-77777', 'Temp1234!', false))`);
        check('the new student can sign in', JSON.parse(login).ok === true, login);
        /* the sign-in replaced the registrar session - put it back for the remaining checks */
        await cdp.eval(`localStorage.setItem('cec_session_v1', ${JSON.stringify(REGISTRAR_SESSION)}); sessionStorage.removeItem('cec_session_v1'); true`);
        check('the new student is listed in the table', await cdp.eval(`document.querySelector('#student-tbody').textContent.includes('2026-77777')`));

        console.log('\n--- The confirmation dialog matches the same shell ---');
        const deleteShell = await cdp.eval(`(() => {
            const btn = document.querySelector('#student-tbody .btn-delete-row');
            if (btn) btn.click();
            return true;
        })()`);
        await sleep(400);
        check('the delete confirmation opens', deleteShell && await cdp.eval(`document.getElementById('modal-delete').classList.contains('active')`));
        check('the delete button is the shared danger style', await cdp.eval(`getComputedStyle(document.getElementById('btn-confirm-delete')).backgroundColor === 'rgb(179, 38, 30)'`));

        console.log('\n--- Mobile layout ---');
        await cdp.viewport(390, 844);
        await goto(cdp, RECORDS_URL);
        await sleep(400);
        await cdp.eval(`document.getElementById('btn-add-student').click(); true`);
        await sleep(400);
        const mobile = await cdp.eval(`(() => {
            const b = document.querySelector('#modal-add .modal').getBoundingClientRect();
            const grid = getComputedStyle(document.querySelector('#add-student-form .form-grid'));
            const body = document.querySelector('#modal-add .modal-body');
            return JSON.stringify({
                fits: b.top >= 0 && b.bottom <= innerHeight + 1,
                columns: grid.gridTemplateColumns,
                scrolls: body.scrollHeight > body.clientHeight,
                footVisible: document.querySelector('#modal-add .modal-foot').getBoundingClientRect().bottom <= innerHeight + 1
            });
        })()`);
        const M = JSON.parse(mobile);
        check('the dialog fits a phone screen', M.fits, mobile);
        check('the form collapses to one column', !/\s/.test(M.columns.trim()), M.columns);
        check('the dialog body scrolls and keeps the actions visible', M.scrolls && M.footVisible, mobile);

    } catch (err) {
        failed++;
        failures.push('FATAL: ' + err.message);
        console.log('\nFATAL: ' + err.message + '\n' + err.stack);
    } finally {
        try { cdp.close(); } catch (e) { /* ignore */ }
        try { edge.kill(); } catch (e) { /* ignore */ }
        server.close();
        try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch (e) { /* ignore */ }
    }

    console.log('\n========================================');
    console.log(`  ${passed} passed, ${failed} failed`);
    if (failures.length) failures.forEach(f => console.log('  - ' + f));
    console.log('========================================\n');
    process.exit(failed ? 1 : 0);
}

main();
