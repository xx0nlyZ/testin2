/* ==========================================================================
   CEC SCHOOL PORTAL - SESSION GUARD (frontend only)
   Basic demo route protection: requires a simulated session, checks the
   signed-in role against the portal page, shows the signed-in user, and
   wires up logout. Loaded at the end of every protected portal page.
   ========================================================================== */
(function () {
    'use strict';

    if (window.CECGuardLoaded) return;
    window.CECGuardLoaded = true;

    var script = document.currentScript;
    var ROOT = script && script.src
        ? script.src.replace(/js\/session-guard\.js.*$/, '')
        : '../../../';

    function url(path) { return new URL(path, ROOT).href; }

    var LOGIN_URL = url('index/index.html');

    var Auth = window.CECAuth || null;
    var session = Auth ? Auth.getSession() : null;

    function go(target) { window.location.replace(target); }

    if (!session) {
        go(LOGIN_URL + '?expired=1');
        return;
    }

    /* ---- Which portal does this page belong to? ---- */
    function requiredRole() {
        var declared = document.body && document.body.getAttribute('data-portal');
        if (declared) return declared;
        var path = window.location.pathname.toLowerCase();
        if (path.indexOf('/admin/') !== -1) return 'admin';
        if (path.indexOf('/faculty/') !== -1) return 'faculty';
        if (path.indexOf('/registrar/') !== -1) return 'registrar';
        if (path.indexOf('/student-portal/') !== -1) return 'student';
        return null;
    }

    var need = requiredRole();
    if (need && session.role !== need) {
        var home = Auth ? Auth.dashboardPathFor(session.role) : null;
        try {
            sessionStorage.setItem('cec_guard_notice',
                'That portal belongs to a different role. You were returned to your own portal.');
        } catch (err) { /* ignore */ }
        go(home ? url(home) : url('index/index.html?denied=1'));
        return;
    }

    /* ---- Show any notice left by the route check ---- */
    function consumeNotice() {
        var message = null;
        try {
            message = sessionStorage.getItem('cec_guard_notice');
            sessionStorage.removeItem('cec_guard_notice');
        } catch (err) { /* ignore */ }
        if (!message) return;

        var toast = document.createElement('div');
        toast.className = 'cec-guard-toast';
        toast.setAttribute('role', 'status');
        toast.innerHTML = '<i class="fa-solid fa-circle-exclamation" aria-hidden="true"></i><span></span>';
        toast.querySelector('span').textContent = message;
        document.body.appendChild(toast);
        setTimeout(function () { toast.classList.add('show'); }, 30);
        setTimeout(function () {
            toast.classList.remove('show');
            setTimeout(function () { toast.remove(); }, 300);
        }, 4200);
    }

    /* ---- Show the signed-in user ---- */
    function initials(name) {
        return String(name || '').split(/\s+/).filter(Boolean)
            .slice(0, 2).map(function (p) { return p.charAt(0).toUpperCase(); })
            .join('') || 'CEC';
    }

    function fill(scope, nameSel, nameValue, smallSel, smallValue) {
        var el = scope.querySelector(nameSel);
        if (el) el.textContent = nameValue;
        var sub = scope.querySelector(smallSel);
        if (sub && smallValue) sub.textContent = smallValue;
    }

    function paintIdentity() {
        var roleLabel = Auth ? Auth.roleLabel(session.role) : session.role;
        var avatars = document.querySelectorAll('.profile-avatar, .profile-menu-avatar');
        Array.prototype.forEach.call(avatars, function (el) { el.textContent = initials(session.name); });

        var buttons = document.querySelectorAll('.profile-button');
        Array.prototype.forEach.call(buttons, function (btn) {
            fill(btn, 'strong', session.name, 'small', roleLabel);
        });

        var heads = document.querySelectorAll('.profile-menu-head');
        Array.prototype.forEach.call(heads, function (head) {
            fill(head, 'strong', session.name, 'small', session.email || session.username);
        });
    }

    /* ---- Logout button in the portal navigation ---- */
    function injectStyles() {
        if (document.getElementById('cec-guard-style')) return;
        var style = document.createElement('style');
        style.id = 'cec-guard-style';
        style.textContent =
            '.cec-logout-link { color: #B3261E; }\n' +
            '.cec-logout-link i { color: #B3261E; }\n' +
            '.cec-logout-link:hover { background: #FBE4E4; color: #8E1D1D; }\n' +
            '.cec-logout-link:hover i { color: #8E1D1D; }\n' +
            '.cec-guard-toast { position: fixed; right: 20px; bottom: 20px; z-index: 99999; display: flex; align-items: center; gap: 9px; max-width: min(360px, calc(100vw - 40px)); padding: 12px 16px; border-radius: 8px; color: #8E1D1D; background: #FBE4E4; border: 1px solid #F0C2C2; box-shadow: 0 8px 24px rgba(15, 30, 60, 0.18); font-size: 13px; font-weight: 600; line-height: 1.45; opacity: 0; transform: translateY(10px); transition: opacity 0.25s ease, transform 0.25s ease; }\n' +
            '.cec-guard-toast.show { opacity: 1; transform: translateY(0); }\n' +
            '@media (prefers-reduced-motion: reduce) { .cec-guard-toast { transition: none; transform: none; } }';
        document.head.appendChild(style);
    }

    function injectLogoutLink() {
        var nav = document.querySelector('.sidebar-nav');
        if (!nav || nav.querySelector('.cec-logout-link')) return;
        var section = document.createElement('div');
        section.className = 'nav-section';
        section.textContent = 'Session';
        var link = document.createElement('a');
        link.href = LOGIN_URL;
        link.className = 'cec-logout-link';
        link.innerHTML = '<i class="fa-solid fa-arrow-right-from-bracket" aria-hidden="true"></i><span>Log out</span>';
        nav.appendChild(section);
        nav.appendChild(link);
    }

    /* ---- Logout click handling (sidebar link + profile menu item) ---- */
    document.addEventListener('click', function (event) {
        var target = event.target;
        if (!target || !target.closest) return;
        var link = target.closest('.cec-logout-link, .profile-menu-item.is-danger');
        if (!link) return;
        event.preventDefault();
        if (Auth) Auth.logout();
        window.location.href = LOGIN_URL;
    });

    function init() {
        injectStyles();
        paintIdentity();
        injectLogoutLink();
        consumeNotice();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.CECSession = session;
})();
