/* Session guard redirect tests using a minimal DOM shim.
   Run: node _dev-tests/guard.test.js */
'use strict';

const path = require('path');
const assert = require('assert');

const ROOT_DIR = path.join(__dirname, '..', 'StudentPortalSample');
const GUARD = path.join(ROOT_DIR, 'js', 'session-guard.js');

function makeStorage() {
    const map = new Map();
    return {
        getItem: (k) => (map.has(k) ? map.get(k) : null),
        setItem: (k, v) => map.set(k, String(v)),
        removeItem: (k) => map.delete(k),
        clear: () => map.clear()
    };
}

let passed = 0, failed = 0;
function check(label, fn) {
    try { fn(); passed++; console.log('  PASS  ' + label); }
    catch (err) { failed++; console.log('  FAIL  ' + label + '\n        ' + err.message); }
}

const Auth = require(path.join(ROOT_DIR, 'js', 'auth.js'));

function runGuard(opts) {
    // fresh environment per run
    globalThis.localStorage = makeStorage();
    globalThis.sessionStorage = makeStorage();
    Auth.resetDemoData();

    let replaced = null;
    const listeners = {};

    const win = {
        location: {
            pathname: opts.pathname,
            href: 'file://' + path.join(ROOT_DIR, opts.pathname).replace(/\\/g, '/'),
            replace: (target) => { replaced = target; }
        }
    };
    global.window = win;
    global.location = win.location;

    global.document = {
        currentScript: { src: 'file:///' + path.join(ROOT_DIR, 'js', 'session-guard.js').replace(/\\/g, '/') },
        readyState: 'complete',
        body: { getAttribute: (name) => (name === 'data-portal' ? (opts.dataPortal || null) : null) },
        getElementById: () => null,
        querySelector: () => null,
        querySelectorAll: () => [],
        createElement: () => ({ setAttribute() {}, appendChild() {}, querySelector: () => ({ textContent: '' }), classList: { add() {}, remove() {} }, remove() {}, style: {}, textContent: '', innerHTML: '' }),
        head: { appendChild() {} },
        addEventListener: (type, fn) => { listeners[type] = fn; }
    };

    // sign in a user if requested
    if (opts.loginAs) {
        const demo = Auth.DEMO_ACCOUNTS().find(a => a.role === opts.loginAs);
        const res = Auth.login(demo.username, demo.password, true);
        assert.strictEqual(res.ok, true, 'setup login failed: ' + res.message);
    }

    delete win.CECGuardLoaded;
    delete win.CECSession;
    win.CECAuth = Auth;

    const code = require('fs').readFileSync(GUARD, 'utf8');
    try {
        new Function(code)(); // eslint-disable-line no-new-func
    } catch (err) {
        if (!replaced) throw err; // redirect intent can abort DOM work; ignore only if redirecting
    }

    return { replaced, listeners, win };
}

const ADMIN_PAGE = '/StudentPortalSample/admin/pages/dashboard/admin.html';
const STUDENT_PAGE = '/StudentPortalSample/student-portal/pages/dashboard/student-dashboard.html';

console.log('\n--- 11. Protected pages redirect unauthenticated users ---');
check('no session -> redirected to login with expired notice', () => {
    const r = runGuard({ pathname: ADMIN_PAGE, dataPortal: 'admin' });
    assert.ok(r.replaced, 'expected a redirect');
    assert.ok(/index\/index\.html\?expired=1$/.test(r.replaced), 'got: ' + r.replaced);
});

console.log('\n--- 3. URL access is blocked across roles ---');
check('student opening an admin URL -> returned to student dashboard', () => {
    const r = runGuard({ pathname: ADMIN_PAGE, dataPortal: 'admin', loginAs: 'student' });
    assert.ok(r.replaced, 'expected a redirect');
    assert.ok(/student-portal\/pages\/dashboard\/student-dashboard\.html$/.test(r.replaced), 'got: ' + r.replaced);
    assert.ok(globalThis.sessionStorage.getItem('cec_guard_notice'), 'expected a notice for the user');
});
check('admin opening a student URL -> returned to admin dashboard', () => {
    const r = runGuard({ pathname: STUDENT_PAGE, dataPortal: 'student', loginAs: 'admin' });
    assert.ok(r.replaced, 'expected a redirect');
    assert.ok(/admin\/pages\/dashboard\/admin\.html$/.test(r.replaced), 'got: ' + r.replaced);
});
check('unknown/stale role session -> returned to login (denied)', () => {
    globalThis.localStorage = makeStorage();
    globalThis.sessionStorage = makeStorage();
    Auth.resetDemoData();
    // simulate a session whose role no longer maps to any portal
    globalThis.localStorage.setItem('cec_session_v1', JSON.stringify({
        id: 'X-1', username: 'stale.user', email: 'stale@cec.edu.ph',
        name: 'Stale User', role: 'finance', status: 'Active'
    }));
    globalThis.sessionStorage.setItem('cec_session_v1', globalThis.localStorage.getItem('cec_session_v1'));

    let replaced = null;
    const win = {
        location: {
            pathname: ADMIN_PAGE,
            href: 'file://' + path.join(ROOT_DIR, ADMIN_PAGE).replace(/\\/g, '/'),
            replace: (target) => { replaced = target; }
        }
    };
    global.window = win;
    global.location = win.location;
    global.document = {
        currentScript: { src: 'file:///' + path.join(ROOT_DIR, 'js', 'session-guard.js').replace(/\\/g, '/') },
        readyState: 'complete',
        body: { getAttribute: (name) => (name === 'data-portal' ? 'admin' : null) },
        getElementById: () => null,
        querySelector: () => null,
        querySelectorAll: () => [],
        createElement: () => ({ setAttribute() {}, appendChild() {}, querySelector: () => ({ textContent: '' }), classList: { add() {}, remove() {} }, remove() {}, style: {}, textContent: '', innerHTML: '' }),
        head: { appendChild() {} },
        addEventListener: () => {}
    };
    win.CECAuth = Auth;
    const code = require('fs').readFileSync(GUARD, 'utf8');
    try { new Function(code)(); } catch (err) { if (!replaced) throw err; }

    assert.ok(replaced, 'expected a redirect');
    assert.ok(/index\/index\.html\?denied=1$/.test(replaced), 'got: ' + replaced);
});

console.log('\n--- Correct role stays on the page ---');
check('admin on admin page is not redirected', () => {
    const r = runGuard({ pathname: ADMIN_PAGE, dataPortal: 'admin', loginAs: 'admin' });
    assert.strictEqual(r.replaced, null, 'unexpected redirect: ' + r.replaced);
    assert.ok(r.win.CECSession, 'session should be exposed');
    assert.strictEqual(r.win.CECSession.role, 'admin');
});
check('student on student page is not redirected', () => {
    const r = runGuard({ pathname: STUDENT_PAGE, dataPortal: 'student', loginAs: 'student' });
    assert.strictEqual(r.replaced, null, 'unexpected redirect: ' + r.replaced);
});

console.log('\n--- Logout handling ---');
check('logout click clears the session and sends user to login', () => {
    const r = runGuard({ pathname: ADMIN_PAGE, dataPortal: 'admin', loginAs: 'admin' });
    assert.ok(r.listeners.click, 'guard should register a document click listener');
    let prevented = false;
    r.listeners.click({
        target: { closest: (sel) => (sel.indexOf('.cec-logout-link') !== -1 ? {} : null) },
        preventDefault: () => { prevented = true; }
    });
    assert.ok(prevented, 'default navigation should be prevented');
    assert.strictEqual(Auth.getSession(), null, 'session should be cleared');
    assert.ok(/index\/index\.html$/.test(r.win.location.href), 'should land on login: ' + r.win.location.href);
});

console.log('\n========================================');
console.log(`  ${passed} passed, ${failed} failed`);
console.log('========================================\n');
process.exit(failed ? 1 : 0);
