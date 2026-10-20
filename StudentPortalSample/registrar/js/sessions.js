/* CEC Registrar Portal - Session Management */

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

    var timeoutSelect = document.getElementById('timeout-select');
    var sessionStatus = document.getElementById('session-status');

    if (timeoutSelect) {
        timeoutSelect.addEventListener('change', function () {
            try {
                localStorage.setItem('cec-session-timeout', timeoutSelect.value);
            } catch (err) { /* storage unavailable */ }
            if (sessionStatus) {
                sessionStatus.textContent = timeoutSelect.value === 'never' ? 'Active (No timeout)' : 'Active';
            }
            showToast('Session timeout set to ' + timeoutSelect.options[timeoutSelect.selectedIndex].text + '.');
        });

        try {
            var stored = localStorage.getItem('cec-session-timeout');
            if (stored && Array.prototype.some.call(timeoutSelect.options, function (o) { return o.value === stored; })) {
                timeoutSelect.value = stored;
            }
        } catch (err) { /* storage unavailable */ }

        if (sessionStatus) {
            sessionStatus.textContent = timeoutSelect.value === 'never' ? 'Active (No timeout)' : 'Active';
        }
    }

    var lastActive = document.getElementById('last-active-time');
    if (lastActive) {
        lastActive.textContent = 'Just now';
        window.setInterval(function () {
            var d = new Date();
            var h = d.getHours() % 12 || 12;
            var m = d.getMinutes();
            var ampm = d.getHours() >= 12 ? 'PM' : 'AM';
            lastActive.textContent = 'Just now (' + h + ':' + (m < 10 ? '0' : '') + m + ' ' + ampm + ')';
        }, 2000);
    }
})();
