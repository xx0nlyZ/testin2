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

    var rand = mulberry32(20260521);

    var REPORT = {
        id: 'RPT-2024-0513',
        type: 'Enrollment Report',
        dateRange: 'May 13, 2024 - May 20, 2024',
        generatedOn: 'May 20, 2024 - May 21, 2024',
        generatedBy: 'Admin User'
    };

    var SUMMARY = [
        { icon: 'fa-solid fa-book-open', label: 'Total Enrollments', value: '412', sub: 'In reporting period', trend: 'up', trendText: '+8%' },
        { icon: 'fa-solid fa-user-plus', label: 'New Students', value: '156', sub: 'New in period', trend: 'up', trendText: '+12%' },
        { icon: 'fa-solid fa-user-arrow-left', label: 'Returning Students', value: '248', sub: 'Re-enrolled', trend: 'up', trendText: '+6%' },
        { icon: 'fa-solid fa-ban', label: 'Cancelled Enrollments', value: '8', sub: 'Within period', trend: 'down', trendText: '-33%' }
    ];

    var PROGRAMS = ['BS Computer Science', 'BS Information Technology', 'BS Education', 'BS Business Administration', 'BS Accountancy', 'BS Nursing', 'AB Communication', 'BS Psychology'];
    var YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
    var FIRST = ['Maria', 'Juan', 'Ana', 'Paolo', 'Sofia', 'Miguel', 'Liza', 'Carlo', 'Rita', 'Dennis', 'Karen', 'Mark', 'Nina', 'Ramon', 'Grace', 'Leo', 'Joshua', 'Camille', 'Bryan', 'Andrea', 'Vince', 'Patricia', 'Christine', 'Shiela', 'Arvin', 'Jessa', 'Francis', 'Paul', 'Angela', 'Kevin'];
    var LAST = ['Santos', 'Cruz', 'Garcia', 'Reyes', 'Ramos', 'Mendoza', 'Torres', 'Aquino', 'Navarro', 'Velasco', 'Domingo', 'Castillo', 'Bautista', 'Flores', 'Villanueva', 'Salazar', 'Padilla', 'Ocampo', 'Roxas', 'Bernardo', 'Marquez', 'Lim', 'Tan', 'Go', 'Fernandez', 'Tolentino', 'Rosales', 'De Guzman', 'Manalo', 'Capistrano'];

    var STATUS_PILL = {
        Enrolled: 'status-green',
        Pending: 'status-amber',
        Cancelled: 'status-red'
    };

    var STATUS_ICON = {
        Enrolled: 'fa-circle-check',
        Pending: 'fa-hourglass-half',
        Cancelled: 'fa-circle-xmark'
    };

    var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    var CANCELLED_IDS = {};
    [9, 41, 87, 133, 178, 224, 301, 387].forEach(function (i) { CANCELLED_IDS[i] = true; });
    var PENDING_IDS = {};
    [5, 17, 33, 52, 63, 78, 96, 112, 129, 144, 158, 177, 195, 210, 233, 249, 268, 284, 299, 317, 335, 350, 368, 396].forEach(function (i) { PENDING_IDS[i] = true; });

    var RECORDS = [];
    (function buildRecords() {
        var base = new Date(2024, 4, 13, 0, 0, 0);
        for (var i = 1; i <= 412; i++) {
            var date = new Date(base);
            date.setDate(base.getDate() + Math.floor(rand() * 8));
            date.setHours(8 + Math.floor(rand() * 9), Math.floor(rand() * 60), 0, 0);

            var status;
            if (CANCELLED_IDS[i]) status = 'Cancelled';
            else if (PENDING_IDS[i]) status = 'Pending';
            else status = 'Enrolled';

            RECORDS.push({
                id: 'ENR-' + String(24000 + i),
                studentName: FIRST[Math.floor(rand() * FIRST.length)] + ' ' + LAST[Math.floor(rand() * LAST.length)],
                program: PROGRAMS[Math.floor(rand() * PROGRAMS.length)],
                yearLevel: YEARS[Math.floor(rand() * YEARS.length)],
                enrollmentDate: date,
                status: status
            });
        }
    })();

    var state = {
        page: 1,
        size: 5
    };

    var lastTotal = 1;

    function pad(n) {
        return String(n).padStart(2, '0');
    }

    function fmtDate(date) {
        return MONTHS[date.getMonth()] + ' ' + pad(date.getDate()) + ', ' + date.getFullYear();
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

    function metaSkeletonHtml() {
        var html = '';
        for (var i = 0; i < 4; i++) {
            html += '<div class="meta-item"><div class="skeleton meta-skel"></div><div class="skeleton meta-skel" style="width:70%"></div></div>';
        }
        return html;
    }

    function renderMeta() {
        var grid = document.getElementById('meta-grid');
        if (!grid) return;
        grid.innerHTML = metaSkeletonHtml();

        setTimeout(function () {
            grid.innerHTML =
                '<div class="meta-item"><span>Report Type</span><strong>' + REPORT.type + '</strong></div>' +
                '<div class="meta-item"><span>Date Range</span><strong>' + REPORT.dateRange + '</strong></div>' +
                '<div class="meta-item"><span>Generated On</span><strong>' + REPORT.generatedOn + '</strong></div>' +
                '<div class="meta-item"><span>Generated By</span><strong>' + REPORT.generatedBy + '</strong></div>';
        }, 500);
    }

    function summaryCardHtml(item) {
        var icon = item.trend === 'up' ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down';
        return '<article class="stat-card">' +
            '<span class="stat-icon"><i class="' + item.icon + '" aria-hidden="true"></i></span>' +
            '<div class="stat-info">' +
            '<p>' + item.label + '</p>' +
            '<strong>' + item.value + '</strong>' +
            '<small>' + item.sub + '</small>' +
            '</div>' +
            '<span class="trend-badge ' + item.trend + '"><i class="fa-solid ' + icon + '" aria-hidden="true"></i> ' + item.trendText + '</span>' +
            '</article>';
    }

    function kpiSkeletonHtml() {
        return '<article class="kpi-skeleton">' +
            '<div class="skeleton s-icon"></div>' +
            '<div class="skeleton s-line short"></div>' +
            '<div class="skeleton s-line value"></div>' +
            '<div class="skeleton s-line" style="width:35%"></div>' +
            '</article>';
    }

    function renderSummary() {
        var grid = document.getElementById('summary-grid');
        if (!grid) return;
        grid.innerHTML = Array(4).join(kpiSkeletonHtml());
        grid.innerHTML = kpiSkeletonHtml() + kpiSkeletonHtml() + kpiSkeletonHtml() + kpiSkeletonHtml();

        setTimeout(function () {
            grid.innerHTML = SUMMARY.map(summaryCardHtml).join('');
        }, 500);
    }

    function rowHtml(record) {
        var pill = STATUS_PILL[record.status];
        var icon = STATUS_ICON[record.status];
        return '<tr>' +
            '<td class="cell-id">' + record.id + '</td>' +
            '<td><div class="user-cell">' +
            '<span class="mini-avatar">' + initials(record.studentName) + '</span>' +
            '<span class="user-meta"><strong>' + record.studentName + '</strong></span>' +
            '</div></td>' +
            '<td>' + record.program + '</td>' +
            '<td>' + record.yearLevel + '</td>' +
            '<td class="username-cell">' + fmtDate(record.enrollmentDate) + '</td>' +
            '<td><span class="status-badge ' + pill + '"><i class="fa-solid ' + icon + '" aria-hidden="true"></i> ' + record.status + '</span></td>' +
            '</tr>';
    }

    function skeletonRowsHtml() {
        var html = '';
        for (var i = 0; i < 5; i++) {
            html += '<tr><td colspan="6"><div class="skeleton row-skel"></div></td></tr>';
        }
        return html;
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
        var tbody = document.getElementById('report-tbody');
        var indicator = document.getElementById('record-indicator');
        if (!tbody) return;

        lastTotal = Math.max(1, Math.ceil(RECORDS.length / state.size));
        if (state.page > lastTotal) state.page = lastTotal;
        if (state.page < 1) state.page = 1;

        var start = (state.page - 1) * state.size;
        var pageItems = RECORDS.slice(start, start + state.size);

        tbody.innerHTML = pageItems.length
            ? pageItems.map(rowHtml).join('')
            : '<tr class="empty-row"><td colspan="6">No enrollment records available.</td></tr>';

        if (indicator) {
            var from = RECORDS.length ? start + 1 : 0;
            indicator.textContent = 'Showing ' + from + ' - ' + (start + pageItems.length) + ' of ' + RECORDS.length;
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

    function loadReport() {
        var tbody = document.getElementById('report-tbody');
        if (tbody) tbody.innerHTML = skeletonRowsHtml();

        setTimeout(function () {
            renderRows();
        }, 500);
    }

    function bindPagination() {
        var numbers = document.getElementById('page-numbers');
        if (numbers) {
            numbers.addEventListener('click', function (e) {
                var btn = e.target.closest('.page-num');
                if (btn && !btn.classList.contains('active')) {
                    state.page = parseInt(btn.getAttribute('data-page'), 10);
                    loadReport();
                }
            });
        }

        var prev = document.getElementById('prev-page');
        var next = document.getElementById('next-page');
        if (prev) prev.addEventListener('click', function () { if (state.page > 1) { state.page--; loadReport(); } });
        if (next) next.addEventListener('click', function () { if (state.page < lastTotal) { state.page++; loadReport(); } });
    }

    function downloadSimulation(label, id) {
        var buttons = document.querySelectorAll('#' + id);
        if (buttons.length) buttons[0].classList.add('btn-spin');
        showToast('Preparing ' + label + ' for report ' + REPORT.id + '...', '');
        setTimeout(function () {
            if (buttons.length) buttons[0].classList.remove('btn-spin');
            showToast(label + ' download ready.', 'success');
        }, 1000);
    }

    function bindActions() {
        var pdfBtn = document.getElementById('pdf-btn');
        var excelBtn = document.getElementById('excel-btn');
        var printBtn = document.getElementById('print-btn');
        if (pdfBtn) pdfBtn.addEventListener('click', function () { downloadSimulation('PDF', 'pdf-btn'); });
        if (excelBtn) excelBtn.addEventListener('click', function () { downloadSimulation('Excel', 'excel-btn'); });
        if (printBtn) printBtn.addEventListener('click', function () { window.print(); });
    }

    document.addEventListener('DOMContentLoaded', function () {
        renderMeta();
        renderSummary();
        bindPagination();
        bindActions();
        loadReport();
    });
})();