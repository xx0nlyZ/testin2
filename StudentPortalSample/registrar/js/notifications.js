/* CEC Registrar Portal - Notification Settings */

(function () {
    'use strict';

    function showToast(message) {
        var toast = document.createElement('div');
        toast.className = 'toast show toast-success';
        toast.innerHTML = '<i class="fa-solid fa-circle-check"></i> ' + message;
        document.body.appendChild(toast);
        setTimeout(function () {
            toast.classList.remove('show');
            setTimeout(function () {
                if (toast.parentNode) { toast.parentNode.removeChild(toast); }
            }, 300);
        }, 2800);
    }

    var keys = {
        'noti-enrollment': 'cec-noti-enrollment',
        'noti-documents': 'cec-noti-documents',
        'noti-system': 'cec-noti-system'
    };

    var labels = {
        'noti-enrollment': 'New Enrollment Requests',
        'noti-documents': 'Document Approvals',
        'noti-system': 'System Announcements'
    };

    try {
        Object.keys(keys).forEach(function (id) {
            var el = document.getElementById(id);
            if (!el) { return; }
            var stored = localStorage.getItem(keys[id]);
            if (stored !== null) { el.checked = stored === 'true'; }
            el.addEventListener('change', function () {
                try {
                    localStorage.setItem(keys[id], el.checked);
                } catch (err) { /* storage unavailable */ }
                showToast(labels[id] + (el.checked ? ' enabled.' : ' disabled.'));
            });
        });
    } catch (err) { /* ignore storage errors */ }
})();
