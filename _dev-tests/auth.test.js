/* Demo auth scenario tests (frontend-only). Run: node _dev-tests/auth.test.js */
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT = path.join(__dirname, '..', 'StudentPortalSample');

/* ---- storage shims ---- */
function makeStorage() {
    const map = new Map();
    return {
        getItem: (k) => (map.has(k) ? map.get(k) : null),
        setItem: (k, v) => map.set(k, String(v)),
        removeItem: (k) => map.delete(k),
        clear: () => map.clear(),
        get length() { return map.size; }
    };
}
globalThis.localStorage = makeStorage();
globalThis.sessionStorage = makeStorage();

const Auth = require(path.join(ROOT, 'js', 'auth.js'));

let passed = 0, failed = 0;
function check(label, fn) {
    try {
        fn();
        passed++;
        console.log('  PASS  ' + label);
    } catch (err) {
        failed++;
        console.log('  FAIL  ' + label + '\n        ' + err.message);
    }
}
function reset() {
    localStorage.clear();
    sessionStorage.clear();
    Auth.resetDemoData();
    localStorage.clear();
    sessionStorage.clear();
}
function destFile(destination) {
    return path.join(ROOT, destination.split('?')[0]);
}

console.log('\n--- 1-6. Valid demo logins open the right portal ---');
const ROLES = {
    student: '2024-12345',
    faculty: 'FAC-12345',
    registrar: 'REG-12345',
    admin: 'ADMIN-12345'
};
for (const [role, id] of Object.entries(ROLES)) {
    check(`valid ${role} login (${id})`, () => {
        reset();
        const demo = Auth.DEMO_ACCOUNTS().find(a => a.role === role);
        const res = Auth.login(demo.username, demo.password, false);
        assert.strictEqual(res.ok, true, res.message);
        assert.strictEqual(res.user.role, role);
        assert.ok(res.destination, 'no destination');
        assert.ok(fs.existsSync(destFile(res.destination)), 'destination missing on disk: ' + res.destination);
    });
}

check('login accepts id, username, and email interchangeable', () => {
    reset();
    const demo = Auth.DEMO_ACCOUNTS().find(a => a.role === 'student');
    for (const ident of [demo.id, demo.username, demo.email, demo.id.toUpperCase(), '  ' + demo.username + '  ']) {
        const res = Auth.login(ident, demo.password, false);
        assert.strictEqual(res.ok, true, 'failed for identifier ' + ident);
    }
});

console.log('\n--- 7. Incorrect credentials show an error ---');
check('wrong password rejected with message', () => {
    reset();
    const res = Auth.login('juan.delacruz', 'WrongPassword1', false);
    assert.strictEqual(res.ok, false);
    assert.strictEqual(res.code, 'invalid');
    assert.ok(res.message.length > 10);
    assert.strictEqual(Auth.getSession(), null);
});
check('unknown identifier rejected', () => {
    reset();
    const res = Auth.login('nobody.here', 'whatever123', false);
    assert.strictEqual(res.ok, false);
    assert.strictEqual(res.code, 'invalid');
});

console.log('\n--- 8. Inactive accounts cannot log in ---');
check('inactive demo account denied with explanation', () => {
    reset();
    const res = Auth.login('rosa.lim', 'Student123!', false);
    assert.strictEqual(res.ok, false);
    assert.strictEqual(res.code, 'inactive');
    assert.ok(/inactive/i.test(res.message));
    assert.strictEqual(Auth.getSession(), null);
});

console.log('\n--- 9. Empty required fields show validation messages ---');
check('empty identifier', () => {
    reset();
    const res = Auth.login('', 'x12345', false);
    assert.strictEqual(res.ok, false);
    assert.strictEqual(res.code, 'empty-id');
});
check('empty password', () => {
    reset();
    const res = Auth.login('juan.delacruz', '', false);
    assert.strictEqual(res.ok, false);
    assert.strictEqual(res.code, 'empty-password');
});

console.log('\n--- 10. Logout clears the demo session ---');
check('logout clears session from both storages', () => {
    reset();
    Auth.login('elena.cruz', 'Admin123!', true);
    assert.ok(Auth.isLoggedIn());
    Auth.logout();
    assert.strictEqual(Auth.getSession(), null);
    assert.strictEqual(localStorage.getItem('cec_session_v1'), null);
    assert.strictEqual(sessionStorage.getItem('cec_session_v1'), null);
});

console.log('\n--- Remember Me controls persistence ---');
check('remember=true stores session in localStorage', () => {
    reset();
    Auth.login('elena.cruz', 'Admin123!', true);
    assert.ok(localStorage.getItem('cec_session_v1'), 'missing localStorage session');
    assert.strictEqual(sessionStorage.getItem('cec_session_v1'), null);
});
check('remember=false stores session in sessionStorage only', () => {
    reset();
    Auth.login('elena.cruz', 'Admin123!', false);
    assert.ok(sessionStorage.getItem('cec_session_v1'), 'missing sessionStorage session');
    assert.strictEqual(localStorage.getItem('cec_session_v1'), null);
    assert.ok(Auth.getSession(), 'session should still be readable');
});

console.log('\n--- 11. Protected pages carry the session check (static) ---');
check('every portal page loads auth.js + session-guard.js', () => {
    const pages = [];
    for (const portal of ['admin', 'faculty', 'registrar', 'student-portal']) {
        const walk = (dir) => {
            for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
                const full = path.join(dir, entry.name);
                if (entry.isDirectory()) walk(full);
                else if (entry.name.endsWith('.html')) pages.push(full);
            }
        };
        walk(path.join(ROOT, portal));
    }
    assert.ok(pages.length >= 100, 'expected 100+ portal pages, found ' + pages.length);
    const missing = pages.filter(p => {
        const html = fs.readFileSync(p, 'utf8');
        return !/session-guard\.js/.test(html) || !/js\/auth\.js/.test(html);
    });
    assert.deepStrictEqual(missing.map(p => path.relative(ROOT, p)), [], 'pages missing guard/auth');
});
check('every portal page declares its role via data-portal', () => {
    const missing = [];
    const walk = (dir) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) walk(full);
            else if (entry.name.endsWith('.html')) {
                const html = fs.readFileSync(full, 'utf8');
                if (!/data-portal="/.test(html)) missing.push(path.relative(ROOT, full));
            }
        }
    };
    for (const portal of ['admin', 'faculty', 'registrar', 'student-portal']) walk(path.join(ROOT, portal));
    assert.deepStrictEqual(missing, []);
});
check('login/index pages are NOT guarded', () => {
    for (const page of ['index/index.html', 'index/register.html', 'index/recovery.html', 'index/reset-password.html']) {
        const html = fs.readFileSync(path.join(ROOT, page), 'utf8');
        assert.ok(!/session-guard\.js/.test(html), page + ' should not be guarded');
    }
});

console.log('\n--- 12. Admin account creation limited to Faculty and Registrar ---');
const adminNew = [
    { role: 'faculty', allowed: true },
    { role: 'registrar', allowed: true },
    { role: 'student', allowed: false },
    { role: 'admin', allowed: false }
];
for (const t of adminNew) {
    check(`admin -> ${t.role} ${t.allowed ? 'allowed' : 'blocked'}`, () => {
        reset();
        Auth.login('elena.cruz', 'Admin123!', true);
        const res = Auth.createAccount({
            name: 'Test ' + t.role,
            id: 'TST-' + t.role.toUpperCase() + '-1',
            email: t.role + '.test@cec.edu.ph',
            role: t.role,
            password: 'Temp1234!',
            status: 'Active'
        }, 'admin');
        assert.strictEqual(res.ok, t.allowed, res.ok ? 'should have been blocked' : res.message);
        if (!t.allowed) assert.strictEqual(res.code, 'forbidden');
    });
}

console.log('\n--- 13. Registrar account creation limited to Students ---');
const regNew = [
    { role: 'student', allowed: true },
    { role: 'faculty', allowed: false },
    { role: 'registrar', allowed: false },
    { role: 'admin', allowed: false }
];
for (const t of regNew) {
    check(`registrar -> ${t.role} ${t.allowed ? 'allowed' : 'blocked'}`, () => {
        reset();
        Auth.login('rosa.manalo', 'Registrar123!', true);
        const res = Auth.createAccount({
            name: 'Test ' + t.role,
            id: 'TST-' + t.role.toUpperCase() + '-2',
            email: t.role + '.reg@cec.edu.ph',
            role: t.role,
            password: 'Temp1234!',
            status: 'Active'
        }, 'registrar');
        assert.strictEqual(res.ok, t.allowed, res.ok ? 'should have been blocked' : res.message);
    });
}
check('faculty and student sessions cannot create any account', () => {
    reset();
    for (const actor of ['faculty', 'student']) {
        const res = Auth.createAccount({
            name: 'X', id: 'X-1', email: 'x@cec.edu.ph', role: 'student',
            password: 'Temp1234!', status: 'Active'
        }, actor);
        assert.strictEqual(res.ok, false, actor + ' must not create accounts');
        assert.strictEqual(res.code, 'forbidden');
    }
});
check('no session cannot create an account', () => {
    reset();
    const res = Auth.createAccount({ name: 'X', id: 'X-2', email: 'y@cec.edu.ph', role: 'student', password: 'Temp1234!' }, null);
    assert.strictEqual(res.ok, false);
    assert.strictEqual(res.code, 'no-session');
});
check('created account can log in with its role and reaches its portal', () => {
    reset();
    Auth.login('rosa.manalo', 'Registrar123!', true);
    const created = Auth.createAccount({
        name: 'Maria Santos',
        id: '2025-11111',
        email: 'maria.santos@student.cec.edu.ph',
        role: 'student',
        password: 'Temp1234!',
        status: 'Active',
        meta: { course: 'BS Criminology', year: '1st Year', section: 'BSCRIM-1A' }
    }, 'registrar');
    assert.strictEqual(created.ok, true, created.message);
    Auth.logout();
    const login = Auth.login('maria.santos', 'Temp1234!', false);
    assert.strictEqual(login.ok, true, login.message);
    assert.strictEqual(login.user.role, 'student');
    assert.ok(fs.existsSync(destFile(login.destination)));
});
check('duplicate ID/email/username rejected', () => {
    reset();
    Auth.login('rosa.manalo', 'Registrar123!', true);
    const first = Auth.createAccount({ name: 'A B', id: '2025-22222', email: 'ab@cec.edu.ph', role: 'student', password: 'Temp1234!' }, 'registrar');
    assert.strictEqual(first.ok, true);
    const dupe = Auth.createAccount({ name: 'A B', id: '2025-22222', email: 'other@cec.edu.ph', role: 'student', password: 'Temp1234!' }, 'registrar');
    assert.strictEqual(dupe.ok, false);
    assert.strictEqual(dupe.code, 'duplicate');
});
check('weak temporary password rejected', () => {
    reset();
    Auth.login('rosa.manalo', 'Registrar123!', true);
    const res = Auth.createAccount({ name: 'A B', id: '2025-33333', email: 'abc@cec.edu.ph', role: 'student', password: '123' }, 'registrar');
    assert.strictEqual(res.ok, false);
    assert.strictEqual(res.code, 'password');
});

console.log('\n--- 14. Public registration cannot create privileged accounts ---');
check('student request stores a pending request, grants nothing', () => {
    reset();
    const before = Auth.listAccounts().length;
    const res = Auth.submitStudentRequest({
        fullName: 'Pending Student',
        email: 'pending@student.cec.edu.ph',
        studentId: '2025-44444',
        course: 'BS Tourism Management',
        year: '1st Year'
    });
    assert.strictEqual(res.ok, true);
    assert.strictEqual(Auth.listAccounts().length, before, 'request must not create a login account');
    assert.strictEqual(Auth.getSession(), null, 'request must not sign anyone in');
});
check('register.html has no role selector and no privileged options', () => {
    const html = fs.readFileSync(path.join(ROOT, 'index/register.html'), 'utf8');
    assert.ok(!/name="role"/i.test(html), 'register form must not have a role field');
    assert.ok(!/<option[^>]*>(Admin|Faculty|Registrar|Finance|IT)</i.test(html), 'no privileged role options');
    assert.ok(/created by the Registrar/i.test(html), 'must explain registrar-created accounts');
});
check('login page has no role selector', () => {
    const html = fs.readFileSync(path.join(ROOT, 'index/index.html'), 'utf8');
    assert.ok(!/name="role"/i.test(html));
    assert.ok(!/select/i.test(html.match(/<form[\s\S]*<\/form>/)[0]), 'login form must not contain a select');
});
check('invalid student request rejected', () => {
    reset();
    assert.strictEqual(Auth.submitStudentRequest({ fullName: '', email: 'a@b.ph' }).ok, false);
    assert.strictEqual(Auth.submitStudentRequest({ fullName: 'X', email: 'nope' }).ok, false);
});

console.log('\n--- Password recovery (simulated) ---');
check('recovery request recorded for known account', () => {
    reset();
    const res = Auth.requestPasswordReset('juan.delacruz');
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.code, 'recorded');
    assert.ok(JSON.parse(localStorage.getItem('cec_reset_requests_v1')).length === 1);
});
check('recovery request for unknown identifier still returns generic ok', () => {
    reset();
    const res = Auth.requestPasswordReset('unknown.user');
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.code, 'recorded-unknown');
});
check('empty recovery identifier rejected', () => {
    reset();
    assert.strictEqual(Auth.requestPasswordReset('  ').ok, false);
});
check('demo resetPassword updates only demo accounts', () => {
    reset();
    Auth.login('rosa.manalo', 'Registrar123!', true);
    const created = Auth.createAccount({ name: 'New Kid', id: '2025-55555', email: 'newkid@cec.edu.ph', role: 'student', password: 'Temp1234!' }, 'registrar');
    const ok = Auth.resetPassword('juan.delacruz', 'BrandNew1!');
    assert.strictEqual(ok.ok, true);
    assert.strictEqual(Auth.login('juan.delacruz', 'BrandNew1!', false).ok, true);
    const blocked = Auth.resetPassword(created.username, 'BrandNew1!');
    assert.strictEqual(blocked.ok, false);
    assert.strictEqual(blocked.code, 'not-demo');
});
check('short reset password rejected', () => {
    reset();
    assert.strictEqual(Auth.resetPassword('juan.delacruz', '12345').ok, false);
});

console.log('\n--- Dashboard mapping sanity ---');
check('each role maps to an existing dashboard file', () => {
    for (const role of Object.keys(ROLES)) {
        const dest = Auth.dashboardPathFor(role);
        assert.ok(dest, 'no destination for ' + role);
        assert.ok(fs.existsSync(destFile(dest)), 'missing file for ' + role + ': ' + dest);
    }
});
check('only the four supported roles have destinations', () => {
    assert.strictEqual(Auth.dashboardPathFor('finance'), null);
    assert.strictEqual(Auth.dashboardPathFor('it'), null);
});

console.log('\n========================================');
console.log(`  ${passed} passed, ${failed} failed`);
console.log('========================================\n');
process.exit(failed ? 1 : 0);
