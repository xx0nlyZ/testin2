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

    var rand = mulberry32(20260522);

    var KPIS = [
        { icon: 'fa-solid fa-file-lines', label: 'Total Logs', value: '4,832', sub: 'All entries this period', trend: 'up', trendText: '+12%' },
        { icon: 'fa-solid fa-circle-check', label: 'Successful Actions', value: '4,521', sub: 'Completed operations', trend: 'up', trendText: '+8%' },
        { icon: 'fa-solid fa-triangle-exclamation', label: 'Failed Attempts', value: '311', sub: 'Rejected or errored', trend: 'down', trendText: '-5%' },
        { icon: 'fa-solid fa-users', label: 'Active Users', value: '168', sub: 'Distinct actors', trend: 'up', trendText: '+15%' }
    ];

    var CATEGORIES = [
        { name: 'User Management', pct: 25, color: '#1D4E9B' },
        { name: 'Authentication', pct: 22, color: '#2E9E63' },
        { name: 'System Settings', pct: 18, color: '#E8A33D' },
        { name: 'Data Changes', pct: 12, color: '#7B61C4' },
        { name: 'File Operations', pct: 11, color: '#E05C5C' },
        { name: 'Others', pct: 12, color: '#B9C6D8' }
    ];

    var ACTIVITY_TYPES = [
        { name: 'Login', count: 1950, color: '#1D4E9B' },
        { name: 'View', count: 1120, color: '#2E9E63' },
        { name: 'Create', count: 860, color: '#E8A33D' },
        { name: 'Update', count: 630, color: '#7B61C4' },
        { name: 'Delete', count: 272, color: '#E05C5C' }
    ];

    var ROLES = ['Administrator', 'Faculty', 'Student', 'Parent'];
    var ROLE_WEIGHTS = ['Administrator', 'Faculty', 'Student', 'Student', 'Parent', 'Faculty'];
    var NAME_POOLS = {
        Administrator: ['Elena Cruz'],
        Faculty: ['Maria Santos', 'Ramon Villanueva', 'Leo Cabrera', 'Anna Rodriguez'],
        Student: ['Juan Dela Cruz', 'Ana Torres', 'Paolo Reyes', 'Sofia Garcia', 'Miguel Fernandez', 'Liza Pangilinan', 'Carlo Mendoza', 'Rita Aquino'],
        Parent: ['Emmanuel Torres', 'Grace Torres', 'Rodrigo Santos', 'Lorna Santos']
    };
    var ACTIONS = ['Login', 'View', 'Create', 'Update', 'Delete'];
    var RESOURCES = ['User Account', 'Audit Log', 'Announcement', 'Enrollment Record', 'Report', 'System Settings', 'Course Section', 'Backup File'];
    var STATUS_WEIGHTS = ['Success', 'Success', 'Success', 'Success', 'Failed'];

    var ROLE_BADGE = {
        Administrator: 'badge-navy',
        Faculty: 'badge-blue',
        Student: 'badge-green',
        Parent: 'badge-amber'
    };

    var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    var RECENT = [];
    (function buildRecent() {
        var base = new Date(2024, 4, 20, 22, 0, 0);
        for (var i = 0; i < 10; i++) {
            var role = ROLE_WEIGHTS[Math.floor(rand() * ROLE_WEIGHTS.length)];
            var names = NAME_POOLS[role];
            var date = new Date(base);
            date.setMinutes(date.getMinutes() - Math.floor(rand() * 90) - (i * 40));

            RECENT.push({
                date: date,
                user: names[Math.floor(rand() * names.length)],
                role: role,
                action: ACTIONS[Math.floor(rand() * ACTIONS.length)],
                resource: RESOURCES[Math.floor(rand() * RESOURCES.length)],
                ip: '192.168.' + Math.floor(rand() * 255) + '.' + (1 + Math.floor(rand() * 254)),
                status: STATUS_WEIGHTS[Math.floor(rand() * STATUS_WEIGHTS.length)]
            });
        }
    })();

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

    function showToast(message, type) {
        var toast = document.querySelector('#cec-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'cec-toast';
            toast.className = 'toast';
            toast.setAttribute('role', 'status');
            document.body.appendChild(toast);
        }
        toast.className = 'toast show ' + (type ? 'toast-' + type : '');
        toast.innerHTML = '<i class="fa-solid ' + (type === 'error' ? 'fa-circle-exclamation' : type === 'success' ? 'fa-circle-check' : 'fa-circle-info') + '" aria-hidden="true"></i>' + message;
        clearTimeout(toast._timer);
        toast._timer = setTimeout(function () {
            toast.className = 'toast';
        }, 2600);
    }

    function kpiSkeletonHtml() {
        return '<article class="kpi-skeleton">' +
            '<div class="skeleton s-icon"></div>' +
            '<div class="skeleton s-line short"></div>' +
            '<div class="skeleton s-line value"></div>' +
            '<div class="skeleton s-line" style="width:35%"></div>' +
            '</article>';
    }

    function renderKpis() {
        var grid = document.getElementById('kpi-grid');
        if (!grid) return;
        grid.innerHTML = kpiSkeletonHtml() + kpiSkeletonHtml() + kpiSkeletonHtml() + kpiSkeletonHtml();

        setTimeout(function () {
            grid.innerHTML = KPIS.map(function (k) {
                var icon = k.trend === 'up' ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down';
                return '<article class="stat-card">' +
                    '<span class="stat-icon"><i class="' + k.icon + '" aria-hidden="true"></i></span>' +
                    '<div class="stat-info">' +
                    '<p>' + k.label + '</p>' +
                    '<strong>' + k.value + '</strong>' +
                    '<small>' + k.sub + '</small>' +
                    '</div>' +
                    '<span class="trend-badge ' + k.trend + '"><i class="fa-solid ' + icon + '" aria-hidden="true"></i> ' + k.trendText + '</span>' +
                    '</article>';
            }).join('');
        }, 500);
    }

    function renderDonut() {
        var wrap = document.getElementById('donut-wrap');
        if (!wrap) return;

        var conic = CATEGORIES.map(function (c, i) {
            var start = CATEGORIES.slice(0, i).reduce(function (s, x) { return s + x.pct; }, 0);
            return c.color + ' ' + start + '% ' + (start + c.pct) + '%';
        }).join(', ');

        var legend = '<ul class="donut-legend">' + CATEGORIES.map(function (c) {
            return '<li>' +
                '<span class="legend-swatch" style="background:' + c.color + '"></span>' +
                '<span class="legend-name">' + c.name + '</span>' +
                '<span class="legend-pct">' + c.pct + '%</span>' +
                '</li>';
        }).join('') + '</ul>';

        wrap.innerHTML =
            '<div class="donut-chart" style="background: conic-gradient(' + conic + ');">' +
            '<div class="donut-hole"><strong>4,832</strong><span>Total Logs</span></div>' +
            '</div>' +
            legend;
    }

    function renderActivityChart() {
        var el = document.getElementById('activity-chart');
        if (!el) return;
        el.innerHTML = '<div class="chart-skeleton" aria-hidden="true">' +
            '<span class="skeleton s-col"></span><span class="skeleton s-col" style="flex:0.7"></span>' +
            '<span class="skeleton s-col" style="flex:0.5"></span><span class="skeleton s-col" style="flex:0.4"></span>' +
            '<span class="skeleton s-col" style="flex:0.2"></span>' +
            '</div>';

        setTimeout(function () {
            var max = Math.max.apply(null, ACTIVITY_TYPES.map(function (t) { return t.count; }));
            var HEIGHT = 168;
            var html = '<div class="bar-chart activity-chart">';
            ACTIVITY_TYPES.forEach(function (t) {
                var px = Math.round(t.count / max * HEIGHT);
                html += '<div class="bar-group">' +
                    '<div class="bar-set"><div class="bar" style="height:' + px + 'px;background:' + t.color + '"></div></div>' +
                    '<span class="bar-label">' + t.name + ' <strong>' + t.count + '</strong></span>' +
                    '</div>';
            });
            html += '</div>';
            html += '<div class="legend">' + ACTIVITY_TYPES.map(function (t) {
                return '<span class="legend-item"><span class="legend-dot" style="background:' + t.color + '"></span>' + t.name + '</span>';
            }).join('') + '</div>';
            el.innerHTML = html;
        }, 550);
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

    function renderRecent() {
        var tbody = document.getElementById('recent-tbody');
        if (!tbody) return;
        var skeleton = '';
        for (var i = 0; i < 6; i++) {
            skeleton += '<tr><td colspan="7"><div class="skeleton row-skel"></div></td></tr>';
        }
        tbody.innerHTML = skeleton;

        setTimeout(function () {
            tbody.innerHTML = RECENT.map(rowHtml).join('');
        }, 550);
    }

    function bindSearch() {
        var btn = document.getElementById('search-btn');
        if (!btn) return;
        btn.addEventListener('click', function () {
            var date = document.getElementById('date-filter');
            var user = document.getElementById('user-filter');
            var role = document.getElementById('role-filter');
            var action = document.getElementById('action-filter');
            var params = new URLSearchParams();
            if (date && date.value) params.set('date', date.value);
            if (user && user.value) params.set('user', user.value);
            if (role && role.value) params.set('role', role.value);
            if (action && action.value) params.set('action', action.value);
            showToast('Opening audit log table with your filters...', '');
            setTimeout(function () {
                window.location.href = 'activity-logs.html?' + params.toString();
            }, 350);
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        renderKpis();
        renderDonut();
        renderActivityChart();
        renderRecent();
        bindSearch();
    });
})();