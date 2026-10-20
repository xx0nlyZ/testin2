/* End-to-end browser tests: real Edge headless + CDP against a local static server.
   Covers the scenarios in the spec's testing list.
   Run: node _dev-tests/browser.integration.js */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.join(__dirname, '..', 'StudentPortalSample');
const PORT = 8123;
const BASE = `http://127.0.0.1:${PORT}`;
const DEBUG_PORT = 9333;
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PROFILE = path.join(require('os').tmpdir(), 'cec-e2e-profile-' + Date.now());

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
    else { failed++; failures.push(label + (detail ? ' â€” ' + detail : '')); console.log('  FAIL  ' + label + (detail ? '\n        ' + detail : '')); }
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
                    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text || 'eval exception');
                    return r.result && r.result.value;
                },
                navigate(url) {
                    return api.send('Page.navigate', { url }, 8000).catch(() => null);
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

async function goto(cdp, url, readyExpr = 'document.readyState === "complete"') {
    await cdp.navigate(url);
    await waitFor(cdp, readyExpr, 10000);
    await sleep(300);
}

async function waitPath(cdp, pattern, timeout = 8000) {
    const re = pattern instanceof RegExp ? pattern : new RegExp(pattern);
    const start = Date.now();
    while (Date.now() - start < timeout) {
        try {
            const loc = await cdp.eval('location.pathname + location.search');
            if (loc && re.test(loc)) return loc;
        } catch (e) { /* navigating */ }
        await sleep(250);
    }
    return null;
}

async function uiLogin(cdp, id, password, remember, expectFail) {
    await goto(cdp, BASE + '/index/index.html');
    await waitFor(cdp, '!!document.getElementById("login-form")');
    await cdp.eval(`(() => {
        document.getElementById('login-id').value = ${JSON.stringify(id)};
        document.getElementById('login-password').value = ${JSON.stringify(password)};
        document.getElementById('login-remember').checked = ${remember ? 'true' : 'false'};
        document.getElementById('login-form').dispatchEvent(new Event('submit', { cancelable: true }));
        return true;
    })()`);
    await sleep(1200); // 650ms fake delay + 450ms redirect
    if (expectFail) return await cdp.eval('location.pathname + location.search');
    // wait until navigation leaves the login page (or settle if login failed on purpose)
    const start = Date.now();
    while (Date.now() - start < 5000) {
        try {
            const loc = await cdp.eval('location.pathname + location.search');
            if (loc && !/\/index\/index\.html$/.test(loc)) { await sleep(400); return loc; }
        } catch (e) { /* navigating */ }
        await sleep(250);
    }
    return await cdp.eval('location.pathname + location.search');
}

async function main() {
    await new Promise(r => server.listen(PORT, '127.0.0.1', r));

    const edge = spawn(EDGE, [
        '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
        '--hide-scrollbars', '--remote-debugging-port=' + DEBUG_PORT,
        '--user-data-dir=' + PROFILE, BASE + '/index/index.html'
    ], { stdio: 'ignore' });

    let cdp = null;
    for (let i = 0; i < 40 && !cdp; i++) {
        try {
            const list = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json();
            const page = list.find(t => t.type === 'page' && t.webSocketDebuggerUrl && t.url.startsWith(BASE))
                || list.find(t => t.type === 'page' && t.webSocketDebuggerUrl && t.url.startsWith('about:blank'));
            if (page) cdp = await connectCdp(page.webSocketDebuggerUrl);
        } catch (e) { /* not up yet */ }
        if (!cdp) await sleep(400);
    }
    if (!cdp) throw new Error('Could not attach to headless Edge over CDP');

    await cdp.eval('true');
    await sleep(1200);

    const EXPECT = {
        student: '/student-portal/pages/dashboard/student-dashboard.html',
        faculty: '/faculty/pages/dashboard/faculty-dashboard.html',
        registrar: '/registrar/pages/dashboard/registrar.html',
        admin: '/admin/pages/dashboard/admin.html'
    };
    const DEMO = {
        student: ['juan.delacruz', 'Student123!'],
        faculty: ['charles.bacus', 'Faculty123!'],
        registrar: ['rosa.manalo', 'Registrar123!'],
        admin: ['elena.cruz', 'Admin123!']
    };

    try {
        console.log('\n--- 1-6. Valid logins open the right portal ---');
        for (const role of Object.keys(DEMO)) {
            const [user, pass] = DEMO[role];
            const loc = await uiLogin(cdp, user, pass, false);
            check(`${role} login lands on its portal`, loc.startsWith(EXPECT[role]), 'landed on ' + loc);
            if (['student', 'faculty', 'registrar', 'admin'].includes(role)) {
                const shown = await cdp.eval('document.querySelector(".profile-button .profile-info strong")?.textContent || ""');
                check(`${role} dashboard shows signed-in name`, shown.trim().length > 0, 'profile name empty');
                const hasLogout = await cdp.eval('!!document.querySelector(".cec-logout-link")');
                check(`${role} navigation has a logout button`, hasLogout);
            } else {
                const hasLogout = await cdp.eval('!!document.querySelector(".cec-logout-link") || !!document.getElementById("logout-btn")');
                check(`${role} notice page offers a logout button`, hasLogout);
            }
        }

        console.log('\n--- 7. Incorrect credentials show an error ---');
        await uiLogin(cdp, 'juan.delacruz', 'WrongPassword1', false, true);
        let alertText = await cdp.eval('document.getElementById("login-alert-text").textContent');
        let onLogin = await cdp.eval('location.pathname.endsWith("/index/index.html")');
        check('wrong password stays on login with error', onLogin && /Incorrect/i.test(alertText), alertText);

        await uiLogin(cdp, 'unknown.user', 'whatever1', false, true);
        alertText = await cdp.eval('document.getElementById("login-alert-text").textContent');
        check('unknown account shows error', /Incorrect/i.test(alertText), alertText);

        console.log('\n--- 8. Inactive account cannot log in ---');
        await uiLogin(cdp, 'rosa.lim', 'Student123!', false, true);
        alertText = await cdp.eval('document.getElementById("login-alert-text").textContent');
        onLogin = await cdp.eval('location.pathname.endsWith("/index/index.html")');
        check('inactive account denied with explanation', onLogin && /inactive/i.test(alertText), alertText);

        console.log('\n--- 9. Empty required fields show validation messages ---');
        await goto(cdp, BASE + '/index/index.html');
        await waitFor(cdp, '!!document.getElementById("login-form")');
        await cdp.eval(`document.getElementById('login-form').dispatchEvent(new Event('submit', { cancelable: true })); true`);
        await sleep(300);
        const emptyAlert = await cdp.eval('document.getElementById("login-alert-text").textContent');
        const idErr = await cdp.eval('document.getElementById("id-error").textContent');
        const pwErr = await cdp.eval('document.getElementById("password-error").textContent');
        check('empty submit shows field errors', /Fill in the required fields/.test(emptyAlert) && idErr.length > 0 && pwErr.length > 0, `${emptyAlert} | ${idErr} | ${pwErr}`);

        console.log('\n--- Password visibility toggle ---');
        const toggle = await cdp.eval(`(() => {
            const input = document.getElementById('login-password');
            const before = input.type;
            document.getElementById('pw-toggle').click();
            const after = input.type;
            document.getElementById('pw-toggle').click();
            return before + '>' + after + '>' + input.type;
        })()`);
        check('show/hide password toggle works', toggle === 'password>text>password', toggle);

        console.log('\n--- 11. Protected pages redirect unauthenticated users ---');
        await cdp.eval('sessionStorage.clear(); localStorage.removeItem("cec_session_v1"); true');
        await goto(cdp, BASE + '/admin/pages/dashboard/admin.html');
        let loc = await waitPath(cdp, /\/index\/index\.html\?expired=1$/);
        check('admin page without session -> login', !!loc, 'still on ' + await cdp.eval('location.pathname + location.search'));

        console.log('\n--- Role-based route checks (URL access) ---');
        await uiLogin(cdp, 'juan.delacruz', 'Student123!', false);
        await goto(cdp, BASE + '/admin/pages/dashboard/admin.html');
        loc = await waitPath(cdp, /student-dashboard\.html$/);
        check('student opening admin URL returned to own portal', loc === EXPECT.student, 'landed on ' + (loc || await cdp.eval('location.pathname')));
        const toastShown = await waitFor(cdp, '!!document.querySelector(".cec-guard-toast")', 4000);
        check('route check shows a notice toast', !!toastShown);

        console.log('\n--- 10. Logout clears the demo session ---');
        await cdp.eval(`(() => { const a = document.querySelector('.cec-logout-link'); if (a) a.click(); return true; })()`);
        loc = await waitPath(cdp, /\/index\/index\.html$/);
        const sessionGone = await cdp.eval('!localStorage.getItem("cec_session_v1") && !sessionStorage.getItem("cec_session_v1")');
        check('logout lands on login page', !!loc, 'landed on ' + (loc || await cdp.eval('location.pathname')));
        check('logout clears stored session', sessionGone);

        console.log('\n--- Remember Me persistence ---');
        await uiLogin(cdp, 'elena.cruz', 'Admin123!', true);
        const remembered = await cdp.eval('!!localStorage.getItem("cec_session_v1")');
        await cdp.eval('sessionStorage.removeItem("cec_session_v1"); true');
        await goto(cdp, BASE + '/admin/pages/dashboard/admin.html');
        const stillIn = await waitPath(cdp, /admin\.html$/, 5000);
        check('remember-me session survives sessionStorage loss', remembered && stillIn === EXPECT.admin, 'remembered=' + remembered + ' loc=' + (stillIn || await cdp.eval('location.pathname')));

        console.log('\n--- 12. Admin account creation limited to Faculty/Registrar ---');
        await goto(cdp, BASE + '/admin/pages/users/user-management.html');
        await waitFor(cdp, 'document.querySelectorAll("#user-tbody tr").length > 0', 10000);
        const roleOptions = await cdp.eval(`Array.from(document.querySelectorAll('#new-role option')).map(o => o.value).join(',')`);
        check('admin role dropdown offers only Faculty/Registrar (plus placeholder)', roleOptions === ',Faculty,Registrar', 'options: ' + roleOptions);
        const adminRows = await cdp.eval('document.querySelectorAll("#user-tbody tr").length');
        check('user table renders merged auth accounts', adminRows > 0, 'rows: ' + adminRows);

        const created = await cdp.eval(`(() => {
            document.getElementById('create-account-btn').click();
            document.getElementById('new-full-name').value = 'Test Lecturer';
            document.getElementById('new-user-id').value = 'FAC-90001';
            document.getElementById('new-email').value = 'test.lecturer@cec.edu.ph';
            document.getElementById('new-role').value = 'Faculty';
            document.getElementById('new-status').value = 'Active';
            document.getElementById('new-password').value = 'Temp1234!';
            document.getElementById('btn-save-account').click();
            return true;
        })()`);
        await sleep(500);
        const accountExists = await cdp.eval(`CECAuth.listAccounts().some(a => a.id === 'FAC-90001' && a.role === 'faculty')`);
        const toastText = await cdp.eval('document.getElementById("cec-toast") ? document.getElementById("cec-toast").textContent : ""');
        check('admin creates a Faculty account through the UI', accountExists && /account created/i.test(toastText), toastText);

        await uiLogin(cdp, 'test.lecturer', 'Temp1234!', false);
        loc = await cdp.eval('location.pathname');
        check('newly created faculty account can log in', loc === EXPECT.faculty, 'landed on ' + loc);

        console.log('\n--- 13. Registrar account creation limited to Students ---');
        await uiLogin(cdp, 'rosa.manalo', 'Registrar123!', false);
        await goto(cdp, BASE + '/registrar/pages/student-record/student-records.html');
        await waitFor(cdp, 'document.querySelectorAll("#student-tbody tr").length > 0', 10000);
        const regFields = await cdp.eval(`['new-section','new-email','new-password'].every(id => !!document.getElementById(id))`);
        check('registrar add-student form has section, email, temporary password', regFields);
        const studentRows = await cdp.eval('document.querySelectorAll("#student-tbody tr").length');
        const studentAccounts = await cdp.eval('CECAuth.listAccounts().filter(a => a.role === "student").length');
        check('registrar table merges student accounts from auth store', studentRows >= studentAccounts && studentAccounts >= 2, 'rows: ' + studentRows + ' accounts: ' + studentAccounts);

        const registrarBlocked = await cdp.eval(`CECAuth.createAccount({name:'X', id:'X-1', email:'x@cec.edu.ph', role:'faculty', password:'Temp1234!'}, 'registrar').code`);
        check('registrar cannot create faculty accounts', registrarBlocked === 'forbidden', 'code: ' + registrarBlocked);

        await cdp.eval(`(() => {
            document.getElementById('btn-add-student').click();
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
        await sleep(500);
        const studentCreated = await cdp.eval(`CECAuth.listAccounts().some(a => a.id === '2026-77777' && a.role === 'student')`);
        check('registrar creates a Student account through the UI', studentCreated);
        await uiLogin(cdp, '2026-77777', 'Temp1234!', false);
        loc = await cdp.eval('location.pathname');
        check('newly created student account can log in', loc === EXPECT.student, 'landed on ' + loc);

        console.log('\n--- 14. Public registration grants nothing ---');
        const before = await cdp.eval('CECAuth.listAccounts().length');
        await goto(cdp, BASE + '/index/register.html');
        await waitFor(cdp, '!!document.getElementById("request-form")');
        await cdp.eval(`(() => {
            document.getElementById('req-name').value = 'Requesting Student';
            document.getElementById('req-email').value = 'requesting@student.cec.edu.ph';
            document.getElementById('request-form').dispatchEvent(new Event('submit', { cancelable: true }));
            return true;
        })()`);
        await sleep(900);
        const after = await cdp.eval('CECAuth.listAccounts().length');
        const doneShown = await cdp.eval('!document.getElementById("request-done").hidden');
        check('registration request records without creating an account', after === before && doneShown, `accounts ${before} -> ${after}`);

        console.log('\n--- Removed roles (Finance / IT) are gone ---');
        const removed = await cdp.eval(`CECAuth.listAccounts().filter(a => a.role === 'finance' || a.role === 'it').length`);
        check('no finance/IT demo accounts exist', removed === 0, 'found ' + removed);
        await uiLogin(cdp, 'carlo.tan', 'Finance123!', false, true);
        let finAlert = await cdp.eval('document.getElementById("login-alert-text").textContent');
        let finOnLogin = await cdp.eval('location.pathname.endsWith("/index/index.html")');
        check('former finance credentials no longer work', finOnLogin && /Incorrect/i.test(finAlert), finAlert);
        await uiLogin(cdp, 'miguel.sy', 'IT123!', false, true);
        let itAlert = await cdp.eval('document.getElementById("login-alert-text").textContent');
        let itOnLogin = await cdp.eval('location.pathname.endsWith("/index/index.html")');
        check('former IT credentials no longer work', itOnLogin && /Incorrect/i.test(itAlert), itAlert);

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

main().catch(err => { console.error(err); process.exit(1); });
