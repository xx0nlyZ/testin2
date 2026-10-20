/* CEC Registrar Portal - Full Login History */

(function () {
    'use strict';

    var HISTORY = [
        { date: 'Sept. 06, 2026 11:11 AM', device: 'Windows - Chrome',    ip: '192.168.1.10', status: 'success', location: 'Cebu, Philippines'    },
        { date: 'Sept. 07, 2026 6:00 PM',  device: 'Windows - Chrome',    ip: '192.168.1.10', status: 'success', location: 'Cebu, Philippines'    },
        { date: 'Sept. 07, 2026 6:30 PM',  device: 'MacOS - Safari',      ip: '192.168.1.23', status: 'success', location: 'Cebu, Philippines'    },
        { date: 'Sept. 08, 2026 11:30 PM', device: 'Android - Chrome',    ip: '10.0.0.8',     status: 'failed',  location: 'Busay, Cebu, Phil'    },
        { date: 'Sept. 09, 2026 1:30 AM',  device: 'Android - Chrome',    ip: '10.0.0.8',     status: 'success', location: 'Busay, Cebu, Phil'    },
        { date: 'Sept. 10, 2026 2:30 AM',  device: 'Windows - Chrome',    ip: '192.168.1.10', status: 'success', location: 'Busay, Cebu, Phil'    },
        { date: 'Sept. 11, 2026 7:15 AM',  device: 'Windows - Chrome',    ip: '192.168.1.10', status: 'success', location: 'Cebu, Philippines'    },
        { date: 'Sept. 12, 2026 8:00 AM',  device: 'Android - Chrome',    ip: '10.0.0.15',    status: 'failed',  location: 'Talamban, Cebu, Phil' },
        { date: 'Sept. 12, 2026 8:05 AM',  device: 'Windows - Chrome',    ip: '192.168.1.10', status: 'success', location: 'Cebu, Philippines'    },
        { date: 'Sept. 14, 2026 9:40 AM',  device: 'Windows - Edge',      ip: '192.168.1.23', status: 'success', location: 'Cebu, Philippines'    },
        { date: 'Sept. 15, 2026 10:12 AM', device: 'MacOS - Safari',      ip: '192.168.1.44', status: 'failed',  location: 'Cebu, Philippines'    },
        { date: 'Sept. 16, 2026 12:33 PM', device: 'Windows - Chrome',    ip: '192.168.1.10', status: 'success', location: 'Cebu, Philippines'    }
    ];

    var PAGE_SIZE = 5;
    var state = { filter: '', status: '', device: '', page: 1 };

    function showToast(message, isError) {
        var toast = document.createElement('div');
        toast.className = 'toast show ' + (isError ? 'toast-error' : 'toast-success');
        toast.innerHTML = '<i class="fa-solid ' + (isError ? 'fa-circle-exclamation' : 'fa-circle-check') + '"></i> ' + message;
        document.body.appendChild(toast);
        setTimeout(function () {
            toast.classList.remove('show');
            setTimeout(function () {
                if (toast.parentNode) { toast.parentNode.removeChild(toast); }
            }, 300);
        }, 2800);
    }

    function escText(value) {
        var div = document.createElement('div');
        div.textContent = String(value == null ? '' : value);
        return div.innerHTML;
    }

    function filteredHistory() {
        var term = state.filter.toLowerCase();
        return HISTORY.filter(function (row) {
            var matchTerm = !term ||
                row.date.toLowerCase().indexOf(term) !== -1 ||
                row.device.toLowerCase().indexOf(term) !== -1 ||
                row.ip.toLowerCase().indexOf(term) !== -1 ||
                row.status.toLowerCase().indexOf(term) !== -1 ||
                row.location.toLowerCase().indexOf(term) !== -1;
            var matchStatus = !state.status || row.status === state.status;
            var matchDevice = !state.device || row.device === state.device;
            return matchTerm && matchStatus && matchDevice;
        });
    }

    function renderHistory() {
        var body = document.getElementById('full-history-body');
        var pagination = document.getElementById('hist-pagination');
        var info = document.getElementById('hist-pagination-info');
        if (!body) { return; }

        var rows = filteredHistory();
        var totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
        if (state.page > totalPages) { state.page = totalPages; }

        var start = (state.page - 1) * PAGE_SIZE;
        var pageRows = rows.slice(start, start + PAGE_SIZE);

        if (pageRows.length === 0) {
            body.innerHTML = '<tr><td colspan="6" class="empty-cell">No login history matches your filters.</td></tr>';
        } else {
            body.innerHTML = pageRows.map(function (row, i) {
                var statusCls = row.status === 'success' ? 'status-green' : 'status-red';
                var statusText = row.status === 'success' ? 'Success' : 'Failed';
                return '<tr>' +
                    '<td class="muted-cell">' + (start + i + 1) + '</td>' +
                    '<td class="muted-cell">' + escText(row.date) + '</td>' +
                    '<td>' + escText(row.device) + '</td>' +
                    '<td class="muted-cell">' + escText(row.ip) + '</td>' +
                    '<td><span class="status-badge ' + statusCls + '">' + statusText + '</span></td>' +
                    '<td class="muted-cell">' + escText(row.location) + '</td>' +
                    '</tr>';
            }).join('');
        }

        var end = rows.length === 0 ? 0 : Math.min(start + PAGE_SIZE, rows.length);
        if (info) {
            info.textContent = rows.length === 0
                ? 'No entries'
                : 'Showing ' + (start + 1) + ' to ' + end + ' of ' + rows.length + ' entries';
        }

        if (pagination) {
            if (totalPages <= 1) {
                pagination.innerHTML = '';
            } else {
                var html = '<button type="button" ' + (state.page === 1 ? 'disabled' : '') + ' data-hist-page="' + (state.page - 1) + '">&lt;</button>';
                for (var p = 1; p <= totalPages; p += 1) {
                    html += '<button type="button" class="' + (state.page === p ? 'active' : '') + '" data-hist-page="' + p + '">' + p + '</button>';
                }
                html += '<button type="button" ' + (state.page === totalPages ? 'disabled' : '') + ' data-hist-page="' + (state.page + 1) + '">&gt;</button>';
                pagination.innerHTML = html;

                Array.prototype.forEach.call(pagination.querySelectorAll('button[data-hist-page]'), function (btn) {
                    btn.addEventListener('click', function () {
                        state.page = parseInt(btn.getAttribute('data-hist-page'), 10);
                        renderHistory();
                    });
                });
            }
        }
    }

    var searchInput = document.getElementById('hist-search');
    if (searchInput) {
        searchInput.addEventListener('input', function () {
            state.filter = this.value;
            state.page = 1;
            renderHistory();
        });
    }

    var statusFilter = document.getElementById('hist-status-filter');
    if (statusFilter) {
        statusFilter.addEventListener('change', function () {
            state.status = this.value;
            state.page = 1;
            renderHistory();
        });
    }

    var deviceFilter = document.getElementById('hist-device-filter');
    if (deviceFilter) {
        deviceFilter.addEventListener('change', function () {
            state.device = this.value;
            state.page = 1;
            renderHistory();
        });
    }

    var exportBtn = document.getElementById('btn-export-csv');
    if (exportBtn) {
        exportBtn.addEventListener('click', function () {
            var rows = filteredHistory();
            if (rows.length === 0) {
                showToast('Nothing to export for the current filters.', true);
                return;
            }
            var csv = ['#,Date & Time,Device,IP Address,Status,Location'];
            rows.forEach(function (row, i) {
                csv.push((i + 1) + ',"' + row.date + '","' + row.device + '","' + row.ip + '","' + row.status.charAt(0).toUpperCase() + row.status.slice(1) + '","' + row.location + '"');
            });
            var blob = new Blob([csv.join('\n')], { type: 'text/csv;charset=utf-8;' });
            var link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'login-history.csv';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
            showToast('Login history exported as CSV.');
        });
    }

    renderHistory();
})();
