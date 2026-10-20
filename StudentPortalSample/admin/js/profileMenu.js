(function () {
    'use strict';

    var STYLE_ID = 'cec-profile-menu-style';

    function injectStyles() {
        if (document.getElementById(STYLE_ID)) {
            return;
        }

        var css = [
            '.profile-wrap { position: relative; display: flex; }',
            '.profile-wrap .profile-button { flex: none; }',
            '.profile-menu {',
            '    position: absolute;',
            '    top: calc(100% + 14px);',
            '    right: 0;',
            '    width: 250px;',
            '    max-width: calc(100vw - 32px);',
            '    background: #FFFFFF;',
            '    border: 1px solid #E3E8F0;',
            '    border-radius: 14px;',
            '    box-shadow: 0 18px 44px rgba(15, 30, 60, 0.18);',
            '    z-index: 90;',
            '    overflow: hidden;',
            '    animation: profile-pop 0.16s ease-out;',
            '}',
            '@keyframes profile-pop {',
            '    from { opacity: 0; transform: translateY(-8px); }',
            '    to { opacity: 1; transform: translateY(0); }',
            '}',
            '.profile-menu-head {',
            '    display: flex;',
            '    align-items: center;',
            '    gap: 11px;',
            '    padding: 15px 16px;',
            '    background: #F8FAFD;',
            '    border-bottom: 1px solid #EDF1F7;',
            '}',
            '.profile-menu-avatar {',
            '    display: grid;',
            '    flex: none;',
            '    width: 40px;',
            '    height: 40px;',
            '    place-items: center;',
            '    border-radius: 50%;',
            '    color: #FFFFFF;',
            '    background: #1D4E9B;',
            '    font-size: 14px;',
            '    font-weight: 700;',
            '}',
            '.profile-menu-head strong {',
            '    display: block;',
            '    font-size: 13.5px;',
            '    color: #0F1E3C;',
            '    line-height: 1.3;',
            '}',
            '.profile-menu-head small {',
            '    display: block;',
            '    margin-top: 2px;',
            '    font-size: 11.5px;',
            '    color: #60728B;',
            '    word-break: break-all;',
            '}',
            '.profile-menu-list { padding: 6px; }',
            '.profile-menu-item {',
            '    display: flex;',
            '    align-items: center;',
            '    gap: 11px;',
            '    padding: 10px 11px;',
            '    border-radius: 8px;',
            '    font-size: 13px;',
            '    font-weight: 600;',
            '    color: #16305C;',
            '    text-decoration: none;',
            '    transition: background 0.15s ease;',
            '}',
            '.profile-menu-item i {',
            '    width: 16px;',
            '    text-align: center;',
            '    font-size: 13px;',
            '    color: #60728B;',
            '}',
            '.profile-menu-item:hover { background: #F1F5FB; }',
            '.profile-menu-item.is-danger { color: #B3261E; }',
            '.profile-menu-item.is-danger i { color: #B3261E; }',
            '.profile-menu-item.is-danger:hover { background: #FBE4E4; }',
            '.profile-menu-divider {',
            '    height: 1px;',
            '    margin: 5px 8px;',
            '    background: #EDF1F7;',
            '}'
        ].join('\n');

        var style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = css;
        document.head.appendChild(style);
    }

    function createPanel() {
        var panel = document.createElement('div');
        panel.className = 'profile-menu';
        panel.setAttribute('role', 'menu');
        panel.hidden = true;

        panel.innerHTML = [
            '<div class="profile-menu-head">',
            '    <span class="profile-menu-avatar">EC</span>',
            '    <span>',
            '        <strong>Elena Cruz</strong>',
            '        <small>elenacruz@cec.edu.ph</small>',
            '    </span>',
            '</div>',
            '<div class="profile-menu-list">',
            '    <a class="profile-menu-item" role="menuitem" href="../profile/profile.html"><i class="fa-regular fa-user" aria-hidden="true"></i> Profile</a>',
            '    <a class="profile-menu-item" role="menuitem" href="../users/user-management.html"><i class="fa-solid fa-user-gear" aria-hidden="true"></i> User Management</a>',
            '    <a class="profile-menu-item" role="menuitem" href="../settings/settings.html"><i class="fa-solid fa-gear" aria-hidden="true"></i> Settings</a>',
            '    <div class="profile-menu-divider" role="separator"></div>',
            '    <a class="profile-menu-item is-danger" role="menuitem" href="../../../index/index.html"><i class="fa-solid fa-arrow-right-from-bracket" aria-hidden="true"></i> Logout</a>',
            '</div>'
        ].join('\n');

        return panel;
    }

    function init(button) {
        if (button.getAttribute('data-profile-init')) {
            return;
        }
        button.setAttribute('data-profile-init', '1');
        button.setAttribute('aria-haspopup', 'true');
        button.setAttribute('aria-expanded', 'false');

        var wrap = document.createElement('span');
        wrap.className = 'profile-wrap';
        button.parentNode.insertBefore(wrap, button);
        wrap.appendChild(button);

        var panel = createPanel();
        wrap.appendChild(panel);

        function close() {
            panel.hidden = true;
            button.setAttribute('aria-expanded', 'false');
        }

        function open() {
            panel.hidden = false;
            button.setAttribute('aria-expanded', 'true');
        }

        button.addEventListener('click', function () {
            if (panel.hidden) {
                open();
            } else {
                close();
            }
        });

        document.addEventListener('click', function (event) {
            if (!wrap.contains(event.target)) {
                close();
            }
        });
        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') {
                close();
            }
        });
    }

    function start() {
        injectStyles();
        document.querySelectorAll('.profile-button').forEach(init);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();
