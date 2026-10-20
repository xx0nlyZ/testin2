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

    function getId() {
        var match = window.location.search.match(/[?&]id=([^&]+)/);
        return match ? decodeURIComponent(match[1]) : '';
    }

    var record = AnnouncementStore.find(getId());
    if (!record) {
        showToast('Announcement not found.', true);
        setTimeout(function () { window.location.href = 'index.html'; }, 900);
        return;
    }

    if (!AnnouncementStore.isOwner(record, 'registrar')) {
        showToast('You can only edit an announcement you created.', true);
        setTimeout(function () { window.location.href = 'index.html'; }, 1200);
        return;
    }

    var form = document.getElementById('announcement-form');
    var titleInput = document.getElementById('announcement-title');
    var messageInput = document.getElementById('announcement-message');
    var audienceSelect = document.getElementById('announcement-audience');
    var prioritySelect = document.getElementById('announcement-priority');
    var postBtn = document.getElementById('post-btn');

    titleInput.value = record.title;
    messageInput.value = record.message;
    audienceSelect.value = record.audience;
    prioritySelect.value = record.priority || 'Normal';

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
        postBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Saving...';

        setTimeout(function () {
            if (!AnnouncementStore.isOwner(AnnouncementStore.find(record.id), 'registrar')) {
                showToast('You can only edit an announcement you created.', true);
                return;
            }

            AnnouncementStore.upsert({
                id: record.id,
                title: titleInput.value.trim(),
                message: messageInput.value.trim(),
                audience: audienceSelect.value,
                priority: prioritySelect.value || 'Normal',
                category: record.category,
                date: record.date,
                status: record.status,
                author: record.author || "Registrar's Office",
                origin: record.origin || 'registrar',
                editedAt: new Date().toISOString()
            });

            showToast('Announcement updated successfully.');
            postBtn.disabled = false;
            postBtn.innerHTML = '<i class="fa-solid fa-floppy-disk" aria-hidden="true"></i> Save Changes';

            setTimeout(function () { window.location.href = 'index.html'; }, 900);
        }, 800);
    });
})();
