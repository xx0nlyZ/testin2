/* ==========================================================================
   CEC SCHOOL PORTAL - DEMO AUTH (frontend only)
   Simulated accounts, sessions, and account-creation rules using
   localStorage/sessionStorage. No backend, no real security.
   ========================================================================== */
(function (global, factory) {
    var api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (global) global.CECAuth = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
    'use strict';

    var ACCOUNTS_KEY = 'cec_accounts_v1';
    var SESSION_KEY = 'cec_session_v1';
    var RESET_KEY = 'cec_reset_requests_v1';
    var REQUEST_KEY = 'cec_student_requests_v1';

    var memoryFallback = {};
    var hasStorage = false;

    function storage() {
        try {
            if (typeof localStorage !== 'undefined') {
                var probe = '__cec_probe__';
                localStorage.setItem(probe, '1');
                localStorage.removeItem(probe);
                hasStorage = true;
                return localStorage;
            }
        } catch (err) { /* fall through */ }
        hasStorage = false;
        return {
            getItem: function (k) { return Object.prototype.hasOwnProperty.call(memoryFallback, k) ? memoryFallback[k] : null; },
            setItem: function (k, v) { memoryFallback[k] = String(v); },
            removeItem: function (k) { delete memoryFallback[k]; }
        };
    }

    function readList(key) {
        try {
            var raw = storage().getItem(key);
            var list = raw ? JSON.parse(raw) : null;
            return Array.isArray(list) ? list : [];
        } catch (err) {
            return [];
        }
    }

    function writeList(key, list) {
        storage().setItem(key, JSON.stringify(list));
    }

    function readSession() {
        var store = typeof sessionStorage !== 'undefined' ? sessionStorage : storage();
        var candidates = [storage(), store];
        for (var i = 0; i < candidates.length; i++) {
            try {
                var raw = candidates[i].getItem(SESSION_KEY);
                if (raw) return JSON.parse(raw);
            } catch (err) { /* ignore */ }
        }
        return null;
    }

    /* ---------------- Demo data ---------------- */

    function demoAccounts() {
        return [
            {
                id: '2024-12345', username: 'juan.delacruz', email: 'juan.delacruz@student.cec.edu.ph',
                password: 'Student123!', name: 'Juan Dela Cruz', role: 'student', status: 'Active', source: 'demo',
                meta: { course: 'BS Information Technology', year: '1st Year', section: 'BSIT-1A' }
            },
            {
                id: 'FAC-12345', username: 'charles.bacus', email: 'charles.bacus@cec.edu.ph',
                password: 'Faculty123!', name: 'Mr. Charles Bacus', role: 'faculty', status: 'Active', source: 'demo',
                meta: {}
            },
            {
                id: 'REG-12345', username: 'rosa.manalo', email: 'rosa.manalo@cec.edu.ph',
                password: 'Registrar123!', name: 'Rosa Manalo', role: 'registrar', status: 'Active', source: 'demo',
                meta: {}
            },
            {
                id: 'ADMIN-12345', username: 'elena.cruz', email: 'elena.cruz@cec.edu.ph',
                password: 'Admin123!', name: 'Elena Cruz', role: 'admin', status: 'Active', source: 'demo',
                meta: {}
            },
            {
                id: '2024-99999', username: 'rosa.lim', email: 'rosa.lim@student.cec.edu.ph',
                password: 'Student123!', name: 'Rosa Lim', role: 'student', status: 'Inactive', source: 'demo',
                meta: { course: 'BS Tourism Management', year: '2nd Year', section: 'BSTM-2B' }
            }
        ];
    }

    function getAccounts() {
        var list = readList(ACCOUNTS_KEY);
        if (!list.length) {
            list = demoAccounts();
            writeList(ACCOUNTS_KEY, list);
        }
        return list;
    }

    function saveAccounts(list) {
        writeList(ACCOUNTS_KEY, list);
    }

    function normalize(value) {
        return String(value == null ? '' : value).trim().toLowerCase();
    }

    function findAccount(identifier) {
        var key = normalize(identifier);
        if (!key) return null;
        var list = getAccounts();
        for (var i = 0; i < list.length; i++) {
            var acc = list[i];
            if (normalize(acc.id) === key || normalize(acc.username) === key || normalize(acc.email) === key) {
                return acc;
            }
        }
        return null;
    }

    /* ---------------- Portal destinations ---------------- */

    var DASHBOARDS = {
        student: 'student-portal/pages/dashboard/student-dashboard.html',
        faculty: 'faculty/pages/dashboard/faculty-dashboard.html',
        registrar: 'registrar/pages/dashboard/registrar.html',
        admin: 'admin/pages/dashboard/admin.html'
    };

    var ROLE_LABELS = {
        student: 'Student',
        faculty: 'Faculty',
        registrar: 'Registrar',
        admin: 'Admin'
    };

    /* Who may create which accounts (frontend demonstration rules). */
    var CREATE_RULES = {
        admin: ['faculty', 'registrar'],
        registrar: ['student']
    };

    function dashboardPathFor(role) {
        return DASHBOARDS[role] || null;
    }

    /* ---------------- Session ---------------- */

    function publicUser(acc) {
        return {
            id: acc.id,
            username: acc.username,
            email: acc.email,
            name: acc.name,
            role: acc.role,
            status: acc.status,
            meta: acc.meta || {}
        };
    }

    function login(identifier, password, remember) {
        if (!String(identifier || '').trim()) {
            return { ok: false, code: 'empty-id', message: 'Enter your Student ID, username, or email.' };
        }
        if (!String(password || '')) {
            return { ok: false, code: 'empty-password', message: 'Enter your password.' };
        }

        var acc = findAccount(identifier);
        if (!acc || acc.password !== String(password)) {
            return {
                ok: false,
                code: 'invalid',
                message: 'Incorrect Student ID/username/email or password. Check your details and try again.'
            };
        }
        if (acc.status !== 'Active') {
            var label = acc.status === 'Suspended' ? 'suspended' : 'inactive';
            return {
                ok: false,
                code: 'inactive',
                message: 'This account is ' + label + '. Contact the Registrar\'s Office or the administrator to reactivate it.'
            };
        }

        var session = publicUser(acc);
        session.loggedInAt = new Date().toISOString();
        session.remember = !!remember;

        var target = remember ? storage() : (typeof sessionStorage !== 'undefined' ? sessionStorage : storage());
        try { storage().removeItem(SESSION_KEY); } catch (err) { /* ignore */ }
        try { if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(SESSION_KEY); } catch (err) { /* ignore */ }
        target.setItem(SESSION_KEY, JSON.stringify(session));

        return { ok: true, user: session, destination: dashboardPathFor(session.role) };
    }

    function getSession() {
        return readSession();
    }

    function isLoggedIn() {
        return !!readSession();
    }

    function logout() {
        try { storage().removeItem(SESSION_KEY); } catch (err) { /* ignore */ }
        try { if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(SESSION_KEY); } catch (err) { /* ignore */ }
    }

    /* ---------------- Account creation rules ---------------- */

    function canCreate(actorRole, targetRole) {
        var allowed = CREATE_RULES[actorRole] || [];
        return allowed.indexOf(targetRole) !== -1;
    }

    function createAccount(data, actorRole) {
        var targetRole = normalize(data && data.role);

        if (!actorRole) {
            return { ok: false, code: 'no-session', message: 'Sign in first to create an account.' };
        }
        if (!canCreate(actorRole, targetRole)) {
            return {
                ok: false,
                code: 'forbidden',
                message: actorRole === 'registrar'
                    ? 'The Registrar\'s Office can only create Student accounts.'
                    : 'Administrators can only create Faculty and Registrar accounts. Student accounts are created by the Registrar.'
            };
        }

        var name = String(data.name || '').trim();
        var id = String(data.id || '').trim();
        var email = String(data.email || '').trim();
        var username = String(data.username || '').trim();
        var password = String(data.password || '').trim();

        if (!name || !id || !email || !password) {
            return { ok: false, code: 'required', message: 'Fill in all required fields (name, ID, email, temporary password).' };
        }
        if (!/^\S+@\S+\.\S+$/.test(email)) {
            return { ok: false, code: 'email', message: 'Enter a valid email address.' };
        }
        if (password.length < 6) {
            return { ok: false, code: 'password', message: 'The temporary password must be at least 6 characters.' };
        }
        if (!username) {
            username = autoUsername(name);
        }
        if (findAccount(id) || findAccount(username) || findAccount(email)) {
            return { ok: false, code: 'duplicate', message: 'That ID, username, or email is already registered.' };
        }

        var status = (data.status === 'Inactive' || data.status === 'Suspended') ? data.status : 'Active';
        var account = {
            id: id,
            username: username,
            email: email,
            password: password,
            name: name,
            role: targetRole,
            status: status,
            source: actorRole === 'registrar' ? 'registrar' : 'admin',
            createdAt: new Date().toISOString(),
            meta: data.meta || {}
        };

        var list = getAccounts();
        list.push(account);
        saveAccounts(list);

        return { ok: true, account: publicUser(account), username: username, password: password };
    }

    function autoUsername(fullName) {
        var parts = String(fullName).toLowerCase().split(/\s+/).filter(Boolean);
        if (!parts.length) return 'cec.user';
        var base = parts.length === 1 ? parts[0] : parts[0] + '.' + parts[parts.length - 1];
        base = base.replace(/[^a-z0-9.]/g, '');
        var candidate = base;
        var n = 1;
        while (findAccount(candidate)) {
            n++;
            candidate = base + n;
        }
        return candidate;
    }

    function listAccounts() {
        return getAccounts().map(publicUser);
    }

    /* ---------------- Password recovery (simulated) ---------------- */

    function requestPasswordReset(identifier) {
        var key = String(identifier || '').trim();
        if (!key) {
            return { ok: false, code: 'required', message: 'Enter your Student ID, username, or registered email.' };
        }
        var acc = findAccount(key);
        var requests = readList(RESET_KEY);
        requests.push({ identifier: key, requestedAt: new Date().toISOString() });
        writeList(RESET_KEY, requests);

        if (acc) {
            return { ok: true, code: 'recorded', account: publicUser(acc) };
        }
        return { ok: true, code: 'recorded-unknown' };
    }

    function resetPassword(identifier, newPassword) {
        var acc = findAccount(identifier);
        if (!acc) {
            return { ok: false, code: 'invalid', message: 'No demo account matches that ID, username, or email.' };
        }
        if (acc.source !== 'demo') {
            return {
                ok: false,
                code: 'not-demo',
                message: 'Password reset only works for the built-in demo accounts in this frontend demo.'
            };
        }
        var value = String(newPassword || '');
        if (value.length < 6) {
            return { ok: false, code: 'password', message: 'The new password must be at least 6 characters.' };
        }
        var list = getAccounts();
        for (var i = 0; i < list.length; i++) {
            if (list[i].id === acc.id) list[i].password = value;
        }
        saveAccounts(list);
        return { ok: true, username: acc.username };
    }

    /* ---------------- Student account requests ---------------- */

    function submitStudentRequest(data) {
        var name = String(data && data.fullName || '').trim();
        var email = String(data && data.email || '').trim();
        if (!name) return { ok: false, code: 'required', message: 'Enter your full name.' };
        if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, code: 'email', message: 'Enter a valid email address.' };

        var requests = readList(REQUEST_KEY);
        requests.push({
            fullName: name,
            email: email,
            studentId: String(data.studentId || '').trim(),
            course: String(data.course || '').trim(),
            year: String(data.year || '').trim(),
            status: 'pending',
            submittedAt: new Date().toISOString()
        });
        writeList(REQUEST_KEY, requests);
        return { ok: true };
    }

    function resetDemoData() {
        saveAccounts(demoAccounts());
        writeList(RESET_KEY, []);
        writeList(REQUEST_KEY, []);
        logout();
    }

    return {
        login: login,
        getSession: getSession,
        isLoggedIn: isLoggedIn,
        logout: logout,
        dashboardPathFor: dashboardPathFor,
        roleLabel: function (role) { return ROLE_LABELS[role] || role; },
        canCreate: canCreate,
        createAccount: createAccount,
        listAccounts: listAccounts,
        requestPasswordReset: requestPasswordReset,
        resetPassword: resetPassword,
        submitStudentRequest: submitStudentRequest,
        resetDemoData: resetDemoData,
        hasStorage: function () { storage(); return hasStorage; },
        DEMO_ACCOUNTS: demoAccounts
    };
});
