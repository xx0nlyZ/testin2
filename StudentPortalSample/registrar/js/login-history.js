/* CEC Registrar Portal - Login History (Recent Activity) */

(function () {
    'use strict';

    var HISTORY = [
        { date: '2026-09-06T11:11:00', device: 'Windows - Chrome',    ip: '192.168.1.10', status: 'success', location: 'Cebu, Philippines'    },
        { date: '2026-09-07T18:00:00',  device: 'Windows - Chrome',    ip: '192.168.1.10', status: 'success', location: 'Cebu, Philippines'    },
        { date: '2026-09-07T18:30:00',  device: 'MacOS - Safari',      ip: '192.168.1.23', status: 'success', location: 'Cebu, Philippines'    },
        { date: '2026-09-08T23:30:00', device: 'Android - Chrome',    ip: '10.0.0.8',     status: 'failed',  location: 'Busay, Cebu, Phil'    },
        { date: '2026-09-09T01:30:00',  device: 'Android - Chrome',    ip: '10.0.0.8',     status: 'success', location: 'Busay, Cebu, Phil'    },
        { date: '2026-09-10T02:30:00',  device: 'Windows - Chrome',    ip: '192.168.1.10', status: 'success', location: 'Busay, Cebu, Phil'    },
        { date: '2026-09-11T07:15:00',  device: 'Windows - Chrome',    ip: '192.168.1.10', status: 'success', location: 'Cebu, Philippines'    },
        { date: '2026-09-12T08:00:00',  device: 'Android - Chrome',    ip: '10.0.0.15',    status: 'failed',  location: 'Talamban, Cebu, Phil' },
        { date: '2026-09-12T08:05:00',  device: 'Windows - Chrome',    ip: '192.168.1.10', status: 'success', location: 'Cebu, Philippines'    },
        { date: '2026-09-14T09:40:00',  device: 'Windows - Edge',      ip: '192.168.1.23', status: 'success', location: 'Cebu, Philippines'    },
        { date: '2026-09-15T10:12:00', device: 'MacOS - Safari',      ip: '192.168.1.44', status: 'failed',  location: 'Cebu, Philippines'    },
        { date: '2026-09-16T12:33:00', device: 'Windows - Chrome',    ip: '192.168.1.10', status: 'success', location: 'Cebu, Philippines'    }
    ];

    var body = document.getElementById('recent-history-body');
    if (!body) { return; }

    var rows = HISTORY.slice(-5).reverse();

    function showDate(value) {
        if (window.CECPrefs) { return window.CECPrefs.formatDateTime(value); }
        return String(value);
    }

    function render() {
        body.innerHTML = rows.map(function (row) {
            var statusCls = row.status === 'success' ? 'status-green' : 'status-red';
            var statusText = row.status === 'success' ? 'Success' : 'Failed';
            return '<tr>' +
                '<td class="muted-cell">' + showDate(row.date) + '</td>' +
                '<td>' + row.device + '</td>' +
                '<td class="muted-cell">' + row.ip + '</td>' +
                '<td><span class="status-badge ' + statusCls + '">' + statusText + '</span></td>' +
                '</tr>';
        }).join('');
    }

    render();

    /* redraw with the new date format as soon as the preference changes */
    document.addEventListener('cec:prefs-changed', render);
})();
