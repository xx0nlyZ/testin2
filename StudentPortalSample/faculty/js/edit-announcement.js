(function () {
    'use strict';

    var ROLE = 'faculty';

    function showToast(message, isError) {
        var wrap = document.getElementById('toast-wrap');
        if (!wrap) { return; }
        var toast = document.createElement('div');
        toast.className = 'toast' + (isError ? ' error' : '');
        toast.textContent = message;
        wrap.appendChild(toast);
        setTimeout(function () {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s';
            setTimeout(function () {
                if (toast.parentNode) { toast.parentNode.removeChild(toast); }
            }, 300);
        }, 2500);
    }

    function getId() {
        var match = window.location.search.match(/[?&]id=([^&]+)/);
        return match ? decodeURIComponent(match[1]) : '';
    }

    var store = window.AnnouncementStore;
    var record = store ? store.find(getId()) : null;

    if (!record || !store.isOwner(record, ROLE)) {
        showToast('You can only edit an announcement you created.', true);
        setTimeout(function () { window.location.href = 'announcements.html'; }, 1200);
        return;
    }

    var form = document.getElementById('announcement-form');
    var titleInput = document.getElementById('announcement-title');
    var messageInput = document.getElementById('announcement-message');
    var audienceSelect = document.getElementById('announcement-audience');
    var prioritySelect = document.getElementById('announcement-priority');
    var postBtn = document.getElementById('post-btn');
    var helperText = document.querySelector('.helper-text');

    titleInput.value = record.title || '';
    messageInput.value = record.message || '';
    audienceSelect.value = record.audience || '';
    prioritySelect.value = record.priority || 'Normal';

    function clearErrors() {
        titleInput.style.borderColor = '';
        messageInput.style.borderColor = '';
        audienceSelect.style.borderColor = '';
        if (helperText) {
            helperText.textContent = '(Select at least 1 option)';
            helperText.style.color = '';
        }
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
            if (helperText) {
                helperText.textContent = '(Please select a target audience)';
                helperText.style.color = '#B3261E';
            }
            valid = false;
        }

        if (!valid) {
            showToast('Please fill out the required fields.', true);
            return;
        }

        if (!store.isOwner(store.find(record.id), ROLE)) {
            showToast('You can only edit an announcement you created.', true);
            return;
        }

        postBtn.disabled = true;
        postBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Saving...';

        setTimeout(function () {
            store.upsert({
                id: record.id,
                title: titleInput.value.trim(),
                message: messageInput.value.trim(),
                audience: audienceSelect.value,
                priority: prioritySelect.value || 'Normal',
                category: record.category || 'General',
                date: record.date,
                status: record.status || 'Active',
                author: record.author || 'Mr. Charles Bacus',
                origin: 'faculty',
                editedAt: new Date().toISOString()
            });

            showToast('Announcement updated successfully.');
            postBtn.disabled = false;
            postBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Changes';

            setTimeout(function () { window.location.href = 'announcements.html'; }, 900);
        }, 800);
    });
})();
