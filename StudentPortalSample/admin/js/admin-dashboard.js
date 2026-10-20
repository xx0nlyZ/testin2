/* ==========================================================================
   CEC ADMIN PORTAL - DASHBOARD
   KPI cards, 7/30-day bar + line charts, timeframe filter, refresh state.
   Rendered client-side to simulate GET /api/v1/admin/dashboard/metrics.
   ========================================================================== */
(function () {
    'use strict';

    var KPIS = [
        { icon: 'fa-solid fa-user-graduate', label: 'Total Students', value: '3,120', sub: 'Enrolled this semester', trend: 'up', trendText: '+12%' },
        { icon: 'fa-solid fa-chalkboard-user', label: 'Total Teachers', value: '2,780', sub: 'Faculty onboarded', trend: 'up', trendText: '+5%' },
        { icon: 'fa-solid fa-user-group', label: 'Total Parents', value: '39,500', sub: 'Guardian accounts', trend: 'up', trendText: '+8%' },
        { icon: 'fa-solid fa-book-open', label: 'Total Classes', value: '580', sub: 'Active class sections', trend: 'up', trendText: '+3%' },
        { icon: 'fa-solid fa-users', label: 'Active Users Today', value: '1,120', sub: 'Logins in the last 24h', trend: 'down', trendText: '-2%' },
        { icon: 'fa-regular fa-clock', label: 'Pending Approvals', value: '28', sub: 'Enrollments · Accounts', trend: 'flat', trendText: 'Neutral' }
    ];

    var DATA7 = {
        labels: ['May 21', 'May 22', 'May 23', 'May 24', 'May 25', 'May 26', 'May 27'],
        students: [312, 298, 325, 331, 306, 289, 340],
        teachers: [265, 274, 258, 281, 269, 255, 278],
        parents: [520, 490, 535, 512, 498, 471, 546],
        admins: [42, 38, 45, 40, 44, 36, 47]
    };

    var DATA30 = {
        labels: ['Apr 29', 'May 01', 'May 03', 'May 05', 'May 07', 'May 09', 'May 11', 'May 13', 'May 15', 'May 17', 'May 19', 'May 21', 'May 23', 'May 25', 'May 27'],
        students: [285, 302, 318, 296, 310, 328, 305, 319, 341, 312, 330, 346, 321, 335, 340],
        teachers: [250, 262, 258, 271, 265, 277, 269, 282, 276, 288, 270, 283, 279, 292, 278],
        parents: [470, 498, 512, 485, 505, 531, 499, 524, 545, 517, 538, 556, 528, 542, 546],
        admins: [35, 38, 41, 37, 40, 43, 39, 42, 44, 41, 45, 46, 43, 47, 47]
    };

    var ACTIVITY7 = {
        labels: ['May 21', 'May 22', 'May 23', 'May 24', 'May 25', 'May 26', 'May 27'],
        logins: [180, 195, 172, 210, 198, 163, 224],
        actions: [950, 1040, 920, 1180, 1100, 890, 1230]
    };

    var ACTIVITY30 = {
        labels: ['Apr 29', 'May 01', 'May 03', 'May 05', 'May 07', 'May 09', 'May 11', 'May 13', 'May 15', 'May 17', 'May 19', 'May 21', 'May 23', 'May 25', 'May 27'],
        logins: [150, 168, 181, 172, 190, 205, 188, 196, 214, 199, 210, 226, 208, 219, 224],
        actions: [820, 905, 948, 912, 1010, 1085, 1002, 1048, 1140, 1072, 1120, 1195, 1108, 1175, 1230]
    };

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

    function trendHtml(trend, trendText) {
        if (trend === 'flat') {
            return '<span class="trend-badge flat">' + trendText + '</span>';
        }
        var icon = trend === 'up' ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down';
        return '<span class="trend-badge ' + trend + '"><i class="fa-solid ' + icon + '" aria-hidden="true"></i> ' + trendText + '</span>';
    }

    function renderKpis() {
        var grid = document.getElementById('kpi-grid');
        if (!grid) return;
        grid.innerHTML = KPIS.map(function (k) {
            return '<article class="stat-card">' +
                '<span class="stat-icon"><i class="' + k.icon + '" aria-hidden="true"></i></span>' +
                '<div class="stat-info">' +
                '<p>' + k.label + '</p>' +
                '<strong>' + k.value + '</strong>' +
                '<small>' + k.sub + '</small>' +
                '</div>' +
                trendHtml(k.trend, k.trendText) +
                '</article>';
        }).join('');
    }

    function renderBarChart(data) {
        var el = document.getElementById('user-chart');
        if (!el) return;
        var max = Math.max.apply(null, data.students
            .concat(data.teachers.concat(data.parents.concat(data.admins))));
        var HEIGHT = 172;
        var series = [
            { key: 'students', cls: 'students' },
            { key: 'teachers', cls: 'teachers' },
            { key: 'parents', cls: 'parents' },
            { key: 'admins', cls: 'admins' }
        ];

        var html = '<div class="bar-chart">';
        data.labels.forEach(function (label, i) {
            html += '<div class="bar-group">';
            html += '<div class="bar-set">';
            series.forEach(function (s) {
                var pixels = Math.round(data[s.key][i] / max * HEIGHT);
                html += '<div class="bar ' + s.cls + '" style="height:' + pixels + 'px"></div>';
            });
            html += '</div>';
            html += '<span class="bar-label">' + label + '</span>';
            html += '</div>';
        });
        html += '</div>';

        html += '<div class="legend">' +
            '<span class="legend-item"><span class="legend-dot" style="background:#1D4E9B"></span>Students</span>' +
            '<span class="legend-item"><span class="legend-dot" style="background:#2E9E63"></span>Teachers</span>' +
            '<span class="legend-item"><span class="legend-dot" style="background:#E8A33D"></span>Parents</span>' +
            '<span class="legend-item"><span class="legend-dot" style="background:#7B61C4"></span>Admins</span>' +
            '</div>';

        el.innerHTML = html;
    }

    function renderLineChart(data) {
        var el = document.getElementById('activity-chart');
        if (!el) return;
        var W = 560, H = 200;
        var pl = 44, pr = 10, pt = 18, pb = 28;
        var innerW = W - pl - pr;
        var innerH = H - pt - pb;
        var n = data.labels.length;
        var max = Math.max.apply(null, data.logins.concat(data.actions));

        function x(i) {
            return pl + (n <= 1 ? innerW / 2 : (innerW * i) / (n - 1));
        }
        function y(v) {
            return pt + innerH - (v / max) * innerH;
        }

        function points(values) {
            return values.map(function (v, i) {
                return (i === 0 ? '' : ' ') + x(i).toFixed(1) + ',' + y(v).toFixed(1);
            }).join(' L');
        }

        function dots(values) {
            var out = '';
            values.forEach(function (v, i) {
                out += '<circle class="dot" cx="' + x(i).toFixed(1) + '" cy="' + y(v).toFixed(1) + '" r="3" fill="' + (i >= Math.floor(n / 2) ? '#1D4E9B' : '#2E9E63') + '"></circle>';
            });
            return out;
        }

        var grid = '';
        for (var g = 0; g <= 4; g++) {
            var gy = pt + (innerH / 4) * g;
            grid += '<line class="grid-line" x1="' + pl + '" y1="' + gy.toFixed(1) + '" x2="' + (W - pr) + '" y2="' + gy.toFixed(1) + '"></line>';
        }

        var html = '<svg class="line-chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="System activity overview">';
        html += grid;

        html += '<path class="area" d="M ' + points(data.actions) + ' L ' + (W - pr).toFixed(1) + ',' + (pt + innerH).toFixed(1) + ' L ' + pl.toFixed(1) + ',' + (pt + innerH).toFixed(1) + ' Z"></path>';
        html += '<polyline class="line-actions" points="' + points(data.actions) + '"></polyline>';
        html += '<polyline class="line-logins" points="' + points(data.logins) + '"></polyline>';

        data.labels.forEach(function (label, i) {
            if (n > 8 && i % 2 === 1) return;
            html += '<text class="axis-label" x="' + x(i).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle">' + label + '</text>';
        });

        var yVals = [0, max / 2, max];
        yVals.forEach(function (v) {
            html += '<text class="axis-label" x="' + (pl - 6) + '" y="' + (y(v) + 3).toFixed(1) + '" text-anchor="end">' + (Math.round(v)) + '</text>';
        });

        html += dots(data.logins);
        html += dots(data.actions);

        html += '</svg>';

        html += '<div class="legend">' +
            '<span class="legend-item"><span class="legend-dot round" style="background:#1D4E9B"></span>Logins</span>' +
            '<span class="legend-item"><span class="legend-dot round" style="background:#2E9E63"></span>Actions</span>' +
            '</div>';

        el.innerHTML = html;
    }

    function renderCharts(timeframe) {
        var barData = timeframe === '30' ? DATA30 : DATA7;
        var lineData = timeframe === '30' ? ACTIVITY30 : ACTIVITY7;
        renderBarChart(barData);
        renderLineChart(lineData);
    }

    function showChartSkeletons() {
        var userSkel = document.getElementById('user-chart-skeleton');
        var activitySkel = document.getElementById('activity-chart-skeleton');
        var userChart = document.getElementById('user-chart');
        var activityChart = document.getElementById('activity-chart');
        if (userSkel) userSkel.hidden = false;
        if (activitySkel) activitySkel.hidden = false;
        if (userChart) userChart.innerHTML = '';
        if (activityChart) activityChart.innerHTML = '';
    }

    function hideChartSkeletons() {
        var skels = document.querySelectorAll('.chart-skeleton');
        Array.prototype.forEach.call(skels, function (s) { s.hidden = true; });
    }

    function kpiSkeletonHtml() {
        return '<article class="kpi-skeleton">' +
            '<div class="skeleton s-icon"></div>' +
            '<div class="skeleton s-line short"></div>' +
            '<div class="skeleton s-line value"></div>' +
            '<div class="skeleton s-line" style="width:35%"></div>' +
            '</article>';
    }

    function updateSyncedTime() {
        var el = document.getElementById('last-updated');
        if (!el) return;
        var now = new Date();
        var h = now.getHours();
        var ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        var m = String(now.getMinutes()).padStart(2, '0');
        el.textContent = h + ':' + m + ' ' + ampm;
    }

    function loadDashboard() {
        var kpiGrid = document.getElementById('kpi-grid');
        if (kpiGrid) {
            kpiGrid.innerHTML = Array(6).join(kpiSkeletonHtml());
        }
        showChartSkeletons();

        setTimeout(function () {
            renderKpis();
            renderCharts(document.getElementById('timeframe-select').value);
            hideChartSkeletons();
            updateSyncedTime();
        }, 750);
    }

    function init() {
        var timeframe = document.getElementById('timeframe-select');
        if (timeframe) {
            timeframe.addEventListener('change', function () {
                showChartSkeletons();
                var value = timeframe.value;
                setTimeout(function () {
                    renderCharts(value);
                    hideChartSkeletons();
                }, 450);
            });
        }

        var refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', function () {
                var icon = refreshBtn.querySelector('i');
                refreshBtn.classList.add('btn-spin');
                refreshBtn.setAttribute('aria-busy', 'true');
                loadDashboard();
                setTimeout(function () {
                    refreshBtn.classList.remove('btn-spin');
                    refreshBtn.setAttribute('aria-busy', 'false');
                    showToast('Telemetry refreshed.', 'success');
                }, 800);
            });
        }

        loadDashboard();
    }

    document.addEventListener('DOMContentLoaded', init);
})();