/* CEC Registrar Portal - Login History (Recent Activity) */

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

    var body = document.getElementById('recent-history-body');
    if (!body) { return; }

    var rows = HISTORY.slice(-5).reverse();

    body.innerHTML = rows.map(function (row) {
        var statusCls = row.status === 'success' ? 'status-green' : 'status-red';
        var statusText = row.status === 'success' ? 'Success' : 'Failed';
        return '<tr>' +
            '<td class="muted-cell">' + row.date + '</td>' +
            '<td>' + row.device + '</td>' +
            '<td class="muted-cell">' + row.ip + '</td>' +
            '<td><span class="status-badge ' + statusCls + '">' + statusText + '</span></td>' +
            '</tr>';
    }).join('');
})();
