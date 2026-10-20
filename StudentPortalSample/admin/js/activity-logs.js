(function () {
    'use strict';

    function mulberry32(a) {
        return function () {
            a |= 0; a = a + 0x6D2B79F5 | 0;
            var t = Math.imul(a ^ a >>> 15, 1 | a);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }

    var rand = mulberry32(20260523);

    var NAME_POOLS = {
        Administrator: ['Elena Cruz'],
        Faculty: ['Maria Santos', 'Ramon Villanueva', 'Leo Cabrera', 'Anna Rodriguez'],
        Student: ['Juan Dela Cruz', 'Ana Torres', 'Paolo Reyes', 'Sofia Garcia', 'Miguel Fernandez', 'Liza Pangilinan', 'Carlo Mendoza', 'Rita Aquino'],
        Parent: ['Emmanuel Torres', 'Grace Torres', 'Rodrigo Santos', 'Lorna Santos']
    };
    var ROLE_WEIGHTS = ['Administrator', 'Faculty', 'Student', 'Student', 'Parent', 'Faculty'];

    var ACTIONS = ['Login', 'View', 'Create', 'Update', 'Delete'];
    var ACTION_WEIGHTS = ['Login', 'Login', 'Login', 'View', 'View', 'View', 'Create', 'Create', 'Update', 'Delete'];
    var RESOURCES = {
        Login: ['User Account', 'Admin Portal', 'Student Portal'],
        View: ['Audit Log', 'Announcement', 'Report', 'Enrollment Record', 'Student Record'],
        Create: ['Announcement', 'Enrollment Record', 'User Account'],
        Update: ['User Account', 'System Settings', 'Course Section', 'Announcement'],
        Delete: ['File', 'Backup File', 'User Account', 'Course Section']
    };
    var STATUS_WEIGHTS = ['Success', 'Success', 'Success', 'Success', 'Success', 'Failed', 'Failed'];

    var RANGE_OFFSETS = {
        current: { min: 0, max: 21 },
        prev: { min: 8, max: 14 },
        older: { min: 15, max: 21 },
        all: null
    };

    var ROLE_BADGE = {
        Administrator: 'badge-navy',
        Faculty: 'badge-blue',
        Student: 'badge-green',
        Parent: 'badge-amber'
    };

    var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    var LOGS = [];
    (function buildLogs() {
        var base = new Date(2024, 4, 20, 23, 59, 0);
        for (var i = 0; i < 4832; i++) {
            var role = ROLE_WEIGHTS[Math.floor(rand() * ROLE_WEIGHTS.length)];
            var names = NAME_POOLS[role];
            var user = names[Math.floor(rand() * names.length)];
            var action = ACTION_WEIGHTS[Math.floor(rand() * ACTION_WEIGHTS.length)];
            var resourcePool = RESOURCES[action];
            var offset = Math.floor(rand() * 22);
            var date = new Date(base);
            date.setDate(date.getDate() - offset);
            date.setHours(Math.floor(rand() * 24), Math.floor(rand() * 60), 0, 0);

            LOGS.push({
                id: 'LOG-' + (9001 + i),
                date: date,
                offset: offset,
                user: user,
                role: role,
                action: action,
                resource: resourcePool[Math.floor(rand() * resourcePool.length)],
                ip: '192.168.' + Math.floor(rand() * 255) + '.' + (1 + Math.floor(rand() * 254)),
                status: STATUS_WEIGHTS[Math.floor(rand() * STATUS_WEIGHTS.length)]
            });
        }
    })();

    var DISTINCT_USERS = [];
    (function collectUsers() {
        var seen = {};
        LOGS.forEach(function (l) {
            if (!seen[l.user]) {
                seen[l.user] = true;
                DISTINCT_USERS.push(l.user);
            }
        });
    })();

    var state = {
        page: 1,
        size: 10,
        range: 'current',
        user: '',
        role: '',
        action: ''
    };

    var lastTotal = 1;

    function pad(n) {
        return String(n).padStart(2, '0');
    }

    function fmtTs(date) {
        var day = MONTHS[date.getMonth()] + ' ' + pad(date.getDate()) + ', ' + date.getFullYear();
        var h = date.getHours();
        var ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        return { day: day, time: pad(h) + ':' + pad(date.getMinutes()) + ' ' + ampm };
    }

    function initials(name) {
        return name.split(/\s+/).filter(function (p) { return p; })
            .slice(0, 2).map(function (p) { return p[0].toUpperCase(); })
            .join('');
    }

    function matches(entry) {
        var bounds = RANGE_OFFSETS[state.range];
        if (bounds && (entry.offset < bounds.min || entry.offset > bounds.max)) return false;
        if (state.user && entry.user !== state.user) return false;
        if (state.role && entry.role !== state.role) return false;
        if (state.action && entry.action !== state.action) return false;
        return true;
    }

    function rowHtml(entry) {
        var t = fmtTs(entry.date);
        var badge = ROLE_BADGE[entry.role] || 'badge-blue';
        var pill = entry.status === 'Success' ? 'status-green' : 'status-red';
        var icon = entry.status === 'Success' ? 'fa-circle-check' : 'fa-circle-xmark';
        return '<tr>' +
            '<td class="cell-ts"><strong>' + t.day + '</strong><span>' + t.time + '</span></td>' +
            '<td><div class="user-cell">' +
            '<span class="mini-avatar">' + initials(entry.user) + '</span>' +
            '<span class="user-meta"><strong>' + entry.user + '</strong></span>' +
            '</div></td>' +
            '<td><span class="role-badge ' + badge + '">' + entry.role + '</span></td>' +
            '<td>' + entry.action + '</td>' +
            '<td class="username-cell">' + entry.resource + '</td>' +
            '<td class="username-cell">' + entry.ip + '</td>' +
            '<td><span class="status-badge ' + pill + '"><i class="fa-solid ' + icon + '" aria-hidden="true"></i> ' + entry.status + '</span></td>' +
            '</tr>';
    }

    function skeletonRowsHtml() {
        var html = '';
        for (var i = 0; i < 8; i++) {
            html += '<tr><td colspan="7"><div class="skeleton row-skel"></div></td></tr>';
        }
        return html;
    }

    function emptyRowHtml() {
        return '<tr class="empty-row"><td colspan="7">No audit logs match your filters.</td></tr>';
    }

    function pageList(current, total) {
        var wanted = {};
        var add = function (n) {
            if (n >= 1 && n <= total) wanted[n] = true;
        };
        add(1);
        add(total);
        for (var w = current - 2; w <= current + 2; w++) add(w);
        var keys = Object.keys(wanted).map(Number).sort(function (a, b) { return a - b; });
        var out = [];
        for (var i = 0; i < keys.length; i++) {
            if (i > 0 && keys[i] - keys[i - 1] > 1) out.push('...');
            out.push(keys[i]);
        }
        return out;
    }

    function renderRows() {
        var tbody = document.getElementById('audit-tbody');
        var info = document.getElementById('page-info');
        if (!tbody) return;

        var list = LOGS.filter(matches);
        lastTotal = Math.max(1, Math.ceil(list.length / state.size));
        if (state.page > lastTotal) state.page = lastTotal;
        if (state.page < 1) state.page = 1;

        var start = (state.page - 1) * state.size;
        var pageItems = list.slice(start, start + state.size);

        tbody.innerHTML = pageItems.length
            ? pageItems.map(rowHtml).join('')
            : emptyRowHtml();

        if (info) {
            var from = list.length ? start + 1 : 0;
            info.textContent = 'Showing ' + from + ' - ' + (start + pageItems.length) + ' of ' + list.length.toLocaleString() + ' logs';
        }

        renderPagination();
    }

    function renderPagination() {
        var container = document.getElementById('page-numbers');
        if (!container) return;

        var html = '';
        pageList(state.page, lastTotal).forEach(function (entry) {
            if (entry === '...') {
                html += '<span class="page-ellipsis" aria-hidden="true">…</span>';
            } else {
                html += '<button type="button" class="page-num' + (entry === state.page ? ' active' : '') + '" data-page="' + entry + '">' + entry + '</button>';
            }
        });
        container.innerHTML = html;

        var prev = document.getElementById('prev-page');
        var next = document.getElementById('next-page');
        if (prev) prev.disabled = state.page <= 1;
        if (next) next.disabled = state.page >= lastTotal;
    }

    function loadLogs() {
        var tbody = document.getElementById('audit-tbody');
        if (tbody) tbody.innerHTML = skeletonRowsHtml();

        setTimeout(function () {
            renderRows();
        }, 450);
    }

    function bindUserOptions() {
        var el = document.getElementById('user-filter');
        if (!el) return;
        DISTINCT_USERS.slice(0, 12).forEach(function (name) {
            var opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            el.appendChild(opt);
        });
    }

    function readQueryParams() {
        var params = new URLSearchParams(window.location.search);
        var map = { date: 'range', user: 'user', role: 'role', action: 'action' };
        Object.keys(map).forEach(function (key) {
            var value = params.get(key);
            if (!value) return;
            var field = map[key];
            var el = document.getElementById(field === 'range' ? 'date-range' : field + '-filter');
            if (!el) return;
            var valid = Array.prototype.some.call(el.options, function (o) { return o.value === value; });
            if (valid) el.value = value;
        });
    }

    function syncStateFromControls() {
        var dateEl = document.getElementById('date-range');
        var userEl = document.getElementById('user-filter');
        var roleEl = document.getElementById('role-filter');
        var actionEl = document.getElementById('action-filter');
        state.range = dateEl ? dateEl.value : state.range;
        state.user = userEl ? userEl.value : state.user;
        state.role = roleEl ? roleEl.value : state.role;
        state.action = actionEl ? actionEl.value : state.action;
        state.page = 1;
    }

    function bindUi() {
        var applyBtn = document.getElementById('apply-btn');
        if (applyBtn) {
            applyBtn.addEventListener('click', function () {
                syncStateFromControls();
                loadLogs();
            });
        }

        var numbers = document.getElementById('page-numbers');
        if (numbers) {
            numbers.addEventListener('click', function (e) {
                var btn = e.target.closest('.page-num');
                if (btn && !btn.classList.contains('active')) {
                    state.page = parseInt(btn.getAttribute('data-page'), 10);
                    loadLogs();
                }
            });
        }

        var prev = document.getElementById('prev-page');
        var next = document.getElementById('next-page');
        if (prev) prev.addEventListener('click', function () { if (state.page > 1) { state.page--; loadLogs(); } });
        if (next) next.addEventListener('click', function () { if (state.page < lastTotal) { state.page++; loadLogs(); } });
    }

    document.addEventListener('DOMContentLoaded', function () {
        bindUserOptions();
        readQueryParams();
        bindUi();
        loadLogs();
    });
})();