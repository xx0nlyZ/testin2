(function () {
    'use strict';

    var NOTIFICATIONS = [
        {
            icon: 'fa-solid fa-bullhorn',
            tone: 'info',
            title: 'New announcement posted',
            body: 'Midterm schedule for the 1st Semester is now available for all students.',
            time: '2 hours ago'
        },
        {
            icon: 'fa-solid fa-award',
            tone: 'success',
            title: 'Grades published',
            body: 'Final grades for IT 101 - Fundamentals of Programming have been released.',
            time: 'Yesterday'
        },
        {
            icon: 'fa-solid fa-calendar-check',
            tone: 'warning',
            title: 'Upcoming deadline',
            body: 'Enrollment adjustment requests close on October 15, 2026.',
            time: '2 days ago'
        },
        {
            icon: 'fa-solid fa-credit-card',
            tone: 'info',
            title: 'Payment reminder',
            body: 'Second installment for the current semester is due on October 20, 2026.',
            time: '3 days ago'
        },
        {
            icon: 'fa-solid fa-shield-halved',
            tone: 'muted',
            title: 'New login detected',
            body: 'Your account was accessed from Chrome on Windows.',
            time: '1 week ago'
        }
    ];

    var STYLE_ID = 'cec-notif-menu-style';

    function injectStyles() {
        if (document.getElementById(STYLE_ID)) {
            return;
        }

        var css = [
            '.notif-wrap { position: relative; display: flex; }',
            '.notif-wrap .header-icon { flex: none; }',
            '.notif-panel {',
            '    position: absolute;',
            '    top: calc(100% + 14px);',
            '    right: -8px;',
            '    width: 360px;',
            '    max-width: calc(100vw - 32px);',
            '    background: #FFFFFF;',
            '    border: 1px solid #E3E8F0;',
            '    border-radius: 14px;',
            '    box-shadow: 0 18px 44px rgba(15, 30, 60, 0.18);',
            '    z-index: 90;',
            '    overflow: hidden;',
            '    animation: notif-pop 0.16s ease-out;',
            '}',
            '@keyframes notif-pop {',
            '    from { opacity: 0; transform: translateY(-8px); }',
            '    to { opacity: 1; transform: translateY(0); }',
            '}',
            '.notif-head {',
            '    display: flex;',
            '    align-items: center;',
            '    justify-content: space-between;',
            '    gap: 12px;',
            '    padding: 14px 16px;',
            '    border-bottom: 1px solid #EDF1F7;',
            '    background: #F8FAFD;',
            '}',
            '.notif-head strong { font-size: 14px; color: #0F1E3C; }',
            '.notif-clear {',
            '    border: 0;',
            '    background: transparent;',
            '    font-size: 12px;',
            '    font-weight: 600;',
            '    color: #C2410C;',
            '    cursor: pointer;',
            '    padding: 0;',
            '}',
            '.notif-clear:hover { text-decoration: underline; }',
            '.notif-list {',
            '    list-style: none;',
            '    margin: 0;',
            '    padding: 0;',
            '    max-height: 340px;',
            '    overflow-y: auto;',
            '}',
            '.notif-item {',
            '    display: flex;',
            '    gap: 12px;',
            '    align-items: flex-start;',
            '    padding: 13px 16px;',
            '    border-bottom: 1px solid #F2F5FA;',
            '    cursor: pointer;',
            '    transition: background 0.15s ease;',
            '}',
            '.notif-item:hover { background: #F7F9FC; }',
            '.notif-item:last-child { border-bottom: 0; }',
            '.notif-item.is-read { opacity: 0.66; }',
            '.notif-icon {',
            '    flex: none;',
            '    width: 34px;',
            '    height: 34px;',
            '    border-radius: 10px;',
            '    display: flex;',
            '    align-items: center;',
            '    justify-content: center;',
            '    font-size: 14px;',
            '    background: #EEF3FB;',
            '    color: #16305C;',
            '}',
            '.notif-item.tone-success .notif-icon { background: #E7F6EC; color: #15803D; }',
            '.notif-item.tone-warning .notif-icon { background: #FDF3E3; color: #B45309; }',
            '.notif-item.tone-muted .notif-icon { background: #F1F3F7; color: #475569; }',
            '.notif-body { min-width: 0; flex: 1; }',
            '.notif-body strong {',
            '    display: block;',
            '    font-size: 13px;',
            '    color: #0F1E3C;',
            '    line-height: 1.35;',
            '}',
            '.notif-body p {',
            '    margin: 3px 0 0;',
            '    font-size: 12.5px;',
            '    color: #5A6B87;',
            '    line-height: 1.45;',
            '}',
            '.notif-body small { display: block; margin-top: 5px; font-size: 11.5px; color: #93A1B8; }',
            '.notif-foot {',
            '    display: block;',
            '    padding: 12px 16px;',
            '    text-align: center;',
            '    font-size: 12.5px;',
            '    font-weight: 600;',
            '    color: #16305C;',
            '    text-decoration: none;',
            '    background: #F8FAFD;',
            '    border-top: 1px solid #EDF1F7;',
            '}',
            '.notif-foot:hover { background: #EFF4FB; }'
        ].join('\n');

        var style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = css;
        document.head.appendChild(style);
    }

    function createPanel() {
        var panel = document.createElement('div');
        panel.className = 'notif-panel';
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-label', 'Notifications');
        panel.hidden = true;

        var html = [
            '<div class="notif-head">',
            '    <strong>Notifications</strong>',
            '    <button type="button" class="notif-clear">Mark all as read</button>',
            '</div>',
            '<ul class="notif-list">'
        ];

        NOTIFICATIONS.forEach(function (item, index) {
            html.push(
                '<li class="notif-item tone-' + item.tone + '" data-notif-index="' + index + '">',
                '    <span class="notif-icon" aria-hidden="true"><i class="' + item.icon + '"></i></span>',
                '    <span class="notif-body">',
                '        <strong>' + item.title + '</strong>',
                '        <p>' + item.body + '</p>',
                '        <small>' + item.time + '</small>',
                '    </span>',
                '</li>'
            );
        });

        html.push('</ul>', '<a class="notif-foot" href="../announcement/index.html">View all announcements</a>');
        panel.innerHTML = html.join('\n');

        return panel;
    }

    function init(bell) {
        if (bell.getAttribute('data-notif-init')) {
            return;
        }
        bell.setAttribute('data-notif-init', '1');
        bell.setAttribute('aria-haspopup', 'true');
        bell.setAttribute('aria-expanded', 'false');

        var wrap = document.createElement('span');
        wrap.className = 'notif-wrap';
        bell.parentNode.insertBefore(wrap, bell);
        wrap.appendChild(bell);

        var panel = createPanel();
        wrap.appendChild(panel);

        function close() {
            panel.hidden = true;
            bell.setAttribute('aria-expanded', 'false');
        }

        function open() {
            panel.hidden = false;
            bell.setAttribute('aria-expanded', 'true');
        }

        bell.addEventListener('click', function () {
            if (panel.hidden) {
                open();
            } else {
                close();
            }
        });

        panel.querySelector('.notif-clear').addEventListener('click', function () {
            panel.querySelectorAll('.notif-item').forEach(function (li) {
                li.classList.add('is-read');
            });
            var dot = bell.querySelector('.notif-dot');
            if (dot) {
                dot.style.display = 'none';
            }
        });

        panel.querySelectorAll('.notif-item').forEach(function (li) {
            li.addEventListener('click', function () {
                li.classList.add('is-read');
            });
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
        document.querySelectorAll('.header-icon[aria-label="Notifications"]').forEach(init);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();
