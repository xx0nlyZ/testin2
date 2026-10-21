/* Registrar Preferences tests: real Edge headless + CDP against a local
   static server. Covers every preference on the Settings > Preferences page
   and proves each one actually changes the portal:
     - light / dark theme applies portal-wide
     - accent colour applies portal-wide
     - font size scales the whole portal
     - language translates the shared chrome (English / Tagalog / Chinese)
     - date format changes the rendered dates

   Run: node _dev-tests/registrar-preferences.test.js */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.join(__dirname, '..', 'StudentPortalSample');
const PORT = 8126;
const BASE = `http://127.0.0.1:${PORT}`;
const DEBUG_PORT = 9337;
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PROFILE = path.join(require('os').tmpdir(), 'cec-preferences-' + Date.now());

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
        const errors = [];
        let nextId = 1;
        ws.onmessage = (e) => {
            let m;
            try { m = JSON.parse(e.data); } catch (err) { return; }
            if (m.id && pending.has(m.id)) {
                const { res, rej } = pending.get(m.id);
                pending.delete(m.id);
                if (m.error) rej(new Error(m.error.message || 'CDP error: ' + m.method));
                else res(m.result || {});
                return;
            }
            /* collect page-side errors */
            if (m.method === 'Runtime.exceptionThrown') {
                const d = m.params.exceptionDetails || {};
                errors.push((d.exception && d.exception.description) || d.text || 'exception');
            }
            if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
                errors.push((m.params.args || []).map(a => a.value || a.description || '').join(' '));
            }
            if (m.method === 'Log.entryAdded' && m.params.entry && m.params.entry.level === 'error') {
                errors.push((m.params.entry.url ? m.params.entry.url + ' ' : '') + m.params.entry.text);
            }
        };
        ws.onopen = () => {
            const api = {
                errors,
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
    await sleep(450);
}

/* Seed a registrar session so the session guard lets the page through. */
const REGISTRAR_SESSION = JSON.stringify({
    id: 'REG-12345', username: 'rosa.manalo', email: 'registrar@cec.edu.ph',
    name: 'Rosa Manalo', role: 'registrar', status: 'Active', meta: {},
    loggedInAt: new Date().toISOString(), remember: true
});

const PREFS_URL = BASE + '/registrar/pages/settings/preferences.html';
const DASH_URL = BASE + '/registrar/pages/dashboard/registrar.html';
const RECORDS_URL = BASE + '/registrar/pages/student-record/student-records.html';
const HISTORY_URL = BASE + '/registrar/pages/settings/login-history.html';

/* Clear every stored preference so each scenario starts from the defaults. */
async function resetPrefs(cdp) {
    await cdp.eval(`Object.keys(localStorage)
        .filter(k => k.indexOf('settings') === 0 || k.indexOf('cec-pref') === 0)
        .forEach(k => localStorage.removeItem(k)); true`);
}

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

    const consoleErrors = cdp.errors;

    try {
        await cdp.eval('true');
        await cdp.send('Page.enable');
        await cdp.send('Runtime.enable');
        await cdp.send('Log.enable');

        /* establish the origin, then seed the session */
        await goto(cdp, BASE + '/index/index.html');
        await cdp.eval(`localStorage.setItem('cec_session_v1', ${JSON.stringify(REGISTRAR_SESSION)}); true`);
        await cdp.viewport(1440, 900);

        console.log('\n--- The preferences page wires every control ---');
        await resetPrefs(cdp);
        await goto(cdp, PREFS_URL);
        const wiring = JSON.parse(await cdp.eval(`(() => JSON.stringify({
            runtime: typeof window.CECPrefs === 'object',
            i18n: typeof window.CECI18n === 'object',
            languages: Array.from(document.getElementById('language').options).map(o => o.value).join(','),
            dateFormats: Array.from(document.getElementById('date-format').options).map(o => o.value).join(','),
            themes: document.querySelectorAll('.theme-card').length,
            dots: document.querySelectorAll('.color-dot').length,
            fonts: document.querySelectorAll('#font-size-group button').length
        }))()`));
        check('the preferences runtime is loaded', wiring.runtime && wiring.i18n, JSON.stringify(wiring));
        check('the language select offers English, Tagalog and Chinese',
            wiring.languages === 'en,fil,zh', wiring.languages);
        check('the date format select offers the three formats',
            wiring.dateFormats === 'MM/DD/YYYY,DD/MM/YYYY,YYYY-MM-DD', wiring.dateFormats);
        check('the theme cards are present', wiring.themes === 2, 'themes: ' + wiring.themes);
        check('the accent colour dots are present', wiring.dots === 5, 'dots: ' + wiring.dots);
        check('the font size buttons are present', wiring.fonts === 3, 'fonts: ' + wiring.fonts);

        console.log('\n--- Appearance applies portal-wide ---');
        await cdp.eval(`document.querySelector('.theme-card[data-theme="dark"]').click(); true`);
        await sleep(300);
        check('dark mode is switched on',
            await cdp.eval(`document.documentElement.classList.contains('theme-dark')`), 'class missing');
        check('the change is confirmed with a toast',
            await cdp.eval(`!!document.querySelector('.toast')`), 'no toast');

        await goto(cdp, DASH_URL);
        const dark = JSON.parse(await cdp.eval(`(() => {
            const cs = getComputedStyle(document.documentElement);
            return JSON.stringify({
                themed: document.documentElement.classList.contains('theme-dark'),
                canvas: getComputedStyle(document.body).backgroundColor,
                header: getComputedStyle(document.querySelector('.app-header')).backgroundColor,
                card: getComputedStyle(document.querySelector('.kpi-card')).backgroundColor,
                text: getComputedStyle(document.body).color
            });
        })()`));
        check('dark mode follows to the dashboard', dark.themed, JSON.stringify(dark));
        check('the dashboard canvas is dark', dark.canvas === 'rgb(22, 33, 58)', dark.canvas);
        check('the dashboard header is dark', dark.header === 'rgb(27, 39, 64)', dark.header);
        check('the dashboard cards are dark', dark.card === 'rgb(27, 39, 64)', dark.card);
        check('the body text is light on the dark canvas', dark.text === 'rgb(220, 231, 245)', dark.text);

        console.log('\n--- The theme is applied before the page paints ---');
        const headOrder = JSON.parse(await cdp.eval(`(() => {
            const head = document.head.innerHTML;
            return JSON.stringify({
                themeCssBeforeScripts: head.indexOf('reg-theme.css') > -1 && head.indexOf('reg-theme.css') < head.indexOf('preferences.js'),
                prefsScriptInHead: head.indexOf('preferences.js') > -1
            });
        })()`));
        check('the appearance runtime loads in the head, so there is no flash',
            headOrder.prefsScriptInHead && headOrder.themeCssBeforeScripts, JSON.stringify(headOrder));

        console.log('\n--- Accent colour applies portal-wide ---');
        await goto(cdp, PREFS_URL);
        await cdp.eval(`document.querySelector('.color-dot[data-color="purple"]').click(); true`);
        await sleep(250);
        const accent = JSON.parse(await cdp.eval(`(() => JSON.stringify({
            primary: getComputedStyle(document.documentElement).getPropertyValue('--primary').trim(),
            accentText: getComputedStyle(document.documentElement).getPropertyValue('--accent-text').trim()
        }))()`));
        check('the accent colour is stored on the page', accent.primary === '#7C3AED', accent.primary);
        check('the accent has a readable variant for the dark theme',
            accent.accentText.toUpperCase() === '#C3A0F0', accent.accentText);
        await goto(cdp, RECORDS_URL);
        const accentOnRecords = await cdp.eval(`getComputedStyle(document.documentElement).getPropertyValue('--primary').trim()`);
        check('the accent colour follows to other pages', accentOnRecords === '#7C3AED', accentOnRecords);

        console.log('\n--- Font size scales the whole portal ---');
        await goto(cdp, PREFS_URL);
        await cdp.eval(`document.querySelector('#font-size-group button[data-font="18"]').click(); true`);
        await sleep(250);
        await goto(cdp, DASH_URL);
        const big = JSON.parse(await cdp.eval(`(() => JSON.stringify({
            root: getComputedStyle(document.documentElement).fontSize,
            nav: getComputedStyle(document.querySelector('.sidebar-nav a')).fontSize,
            body: getComputedStyle(document.body).fontSize
        }))()`));
        check('the root font size follows to other pages', big.root === '18px', big.root);
        check('body copy scales with the preference', big.body === '18px', big.body);
        check('the sidebar navigation scales too', big.nav === '15.75px', big.nav);
        const overflow = await cdp.eval(`document.documentElement.scrollWidth > window.innerWidth`);
        check('the larger font does not break the layout', !overflow, 'horizontal scroll appeared');

        console.log('\n--- Language translates the shared chrome ---');
        await goto(cdp, PREFS_URL);
        await cdp.eval(`(() => {
            const el = document.getElementById('language');
            el.value = 'zh';
            el.dispatchEvent(new Event('change'));
            return true;
        })()`);
        await sleep(300);
        const translated = JSON.parse(await cdp.eval(`(() => {
            const nav = document.querySelector('.sidebar-nav a span');
            const head = document.querySelector('.page-title h1');
            const brand = document.querySelector('.sidebar-brand span');
            return JSON.stringify({
                nav: nav ? nav.textContent.trim() : '',
                title: head ? head.textContent.trim() : '',
                brand: brand ? brand.textContent.trim() : '',
                lang: document.documentElement.lang
            });
        })()`));
        check('the language select translates the navigation', translated.nav !== 'Dashboard', translated.nav);
        check('the language select translates the page title', translated.title !== 'Preferences', translated.title);
        check('the language select translates the brand', translated.brand !== 'REGISTRAR PORTAL SYSTEM', translated.brand);
        check('the html lang attribute is updated', translated.lang === 'zh', translated.lang);
        const placeholders = await cdp.eval(`(() => {
            const out = [];
            document.querySelectorAll('[data-i18n]').forEach(el => {
                if (!el.textContent.trim()) out.push(el.getAttribute('data-i18n'));
            });
            return JSON.stringify(out);
        })()`);
        check('no untranslated placeholders are left behind', placeholders === '[]', placeholders);

        await goto(cdp, DASH_URL);
        const follows = JSON.parse(await cdp.eval(`(() => JSON.stringify({
            nav: document.querySelector('.sidebar-nav a span').textContent.trim(),
            lang: document.documentElement.lang
        }))()`));
        check('the language follows to other pages', follows.nav !== 'Dashboard', follows.nav);
        check('the language follows to other pages in the html lang attribute', follows.lang === 'zh', follows.lang);

        console.log('\n--- Tagalog works too ---');
        await goto(cdp, PREFS_URL);
        await cdp.eval(`(() => {
            const el = document.getElementById('language');
            el.value = 'fil';
            el.dispatchEvent(new Event('change'));
            return true;
        })()`);
        await sleep(300);
        const tagalog = JSON.parse(await cdp.eval(`(() => JSON.stringify({
            records: document.querySelector('.sidebar-nav a:nth-child(2) span').textContent.trim(),
            lang: document.documentElement.lang
        }))()`));
        check('Tagalog translates the chrome', tagalog.records === 'Mga Tala ng Mag-aaral', tagalog.records);
        check('Tagalog is reflected in the html lang attribute', tagalog.lang === 'fil', tagalog.lang);

        console.log('\n--- Date format applies to rendered dates ---');
        await resetPrefs(cdp);
        await goto(cdp, HISTORY_URL);
        const first = await cdp.eval(`(() => {
            const cell = document.querySelector('.data-table tbody td');
            return cell ? cell.textContent.trim() : '';
        })()`);
        check('login history renders a date', /\d/.test(first), first);
        await cdp.eval(`(() => {
            CECPrefs.set('dateFormat', 'YYYY-MM-DD');
            return true;
        })()`);
        await sleep(350);
        const iso = await cdp.eval(`(() => {
            const cell = document.querySelector('.data-table tbody td');
            return cell ? cell.textContent.trim() : '';
        })()`);
        check('the date format preference re-renders the dates', /^\d{4}-\d{2}-\d{2}/.test(iso), iso);

        console.log('\n--- Light mode and the defaults still work ---');
        await resetPrefs(cdp);
        await goto(cdp, DASH_URL);
        const light = JSON.parse(await cdp.eval(`(() => JSON.stringify({
            canvas: getComputedStyle(document.body).backgroundColor,
            root: getComputedStyle(document.documentElement).fontSize,
            themed: document.documentElement.classList.contains('theme-dark')
        }))()`));
        check('light mode restores the light canvas', light.canvas === 'rgb(245, 247, 250)', light.canvas);
        check('the default font size is restored', light.root === '16px', light.root);
        check('the default theme is light', !light.themed, 'still dark');

        console.log('\n--- No runtime errors ---');
        const realErrors = consoleErrors.filter(e => !/favicon\.ico/i.test(e));
        check('no console errors while the preferences run', realErrors.length === 0, realErrors.join(' | '));

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
