/* CEC Admin Portal - Full Login History */

(function () {
    'use strict';

    var exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', function () {
            var toast = document.createElement('div');
            toast.className = 'toast show toast-success';
            toast.innerHTML = '<i class="fa-solid fa-circle-check"></i> Login history exported.';
            document.body.appendChild(toast);
            setTimeout(function () {
                toast.classList.remove('show');
                setTimeout(function () {
                    if (toast.parentNode) toast.parentNode.removeChild(toast);
                }, 300);
            }, 2800);
        });
    }

    var dateFilter = document.getElementById('date-filter');
    if (dateFilter) {
        dateFilter.addEventListener('change', function () {
            var toast = document.createElement('div');
            toast.className = 'toast show';
            toast.innerHTML = '<i class="fa-solid fa-filter"></i> Filtered by: ' + this.value;
            document.body.appendChild(toast);
            setTimeout(function () {
                toast.classList.remove('show');
                setTimeout(function () {
                    if (toast.parentNode) toast.parentNode.removeChild(toast);
                }, 300);
            }, 2200);
        });
    }
})();