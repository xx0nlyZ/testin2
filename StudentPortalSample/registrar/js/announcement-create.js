(function () {
    function showToast(message, isError) {
        var toast = document.createElement('div');
        toast.className = 'toast show' + (isError ? ' toast-error' : '');
        toast.innerHTML = '<i class="fa-solid ' + (isError ? 'fa-circle-exclamation' : 'fa-circle-check') + '"></i> ' + message;
        document.body.appendChild(toast);
        setTimeout(function () {
            toast.classList.remove('show');
            setTimeout(function () {
                if (toast.parentNode) { toast.parentNode.removeChild(toast); }
            }, 300);
        }, 2500);
    }

    var form = document.getElementById('announcement-form');
    var titleInput = document.getElementById('announcement-title');
    var messageInput = document.getElementById('announcement-message');
    var audienceSelect = document.getElementById('announcement-audience');
    var prioritySelect = document.getElementById('announcement-priority');
    var postBtn = document.getElementById('post-btn');

    function clearErrors() {
        titleInput.style.borderColor = '';
        messageInput.style.borderColor = '';
        audienceSelect.style.borderColor = '';
    }

    [titleInput, messageInput, audienceSelect].forEach(function (el) {
        el.addEventListener('input', clearErrors);
        el.addEventListener('change', clearErrors);
    });

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        clearErrors();

        var valid = true;
        if (titleInput.value.trim() === '') {
            titleInput.style.borderColor = '#B3261E';
            valid = false;
        }
        if (messageInput.value.trim() === '') {
            messageInput.style.borderColor = '#B3261E';
            valid = false;
        }
        if (!audienceSelect.value) {
            audienceSelect.style.borderColor = '#B3261E';
            valid = false;
        }

        if (!valid) {
            showToast('Please fill out the required fields.', true);
            return;
        }

        postBtn.disabled = true;
        postBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Posting...';

        setTimeout(function () {
            var record = {
                id: 'ann-' + Date.now(),
                title: titleInput.value.trim(),
                message: messageInput.value.trim(),
                audience: audienceSelect.value,
                priority: prioritySelect.value || 'Normal',
                category: 'General',
                date: new Date().toISOString(),
                status: 'Active',
                author: "Registrar's Office",
                origin: 'registrar'
            };

            AnnouncementStore.upsert(record);

            showToast('Announcement posted successfully.');
            postBtn.disabled = false;
            postBtn.innerHTML = '<i class="fa-solid fa-bullhorn" aria-hidden="true"></i> Post Announcement';

            setTimeout(function () { window.location.href = 'index.html'; }, 900);
        }, 1000);
    });
})();
