(function () {
    'use strict';

    var ROLE = 'admin';

    var editId = null;

    function store() {
        return window.AnnouncementStore;
    }

    function params() {
        return new URLSearchParams(window.location.search);
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

    var TOP_LEVEL_AUDIENCES = ['All Users', 'Students', 'Faculty', 'Registrar'];

    function audienceSelect() {
        return document.getElementById('audience-select');
    }

    function updateAudienceHint() {
        var hint = document.getElementById('audience-hint');
        if (!hint) { return; }
        hint.textContent = 'Select the audience that will receive this announcement.';
    }

    function setAudience(selected) {
        var select = audienceSelect();
        if (!select) { return; }

        selected = selected || [];
        var value = selected.length === 1 && TOP_LEVEL_AUDIENCES.indexOf(selected[0]) !== -1
            ? selected[0]
            : '';
        if (value) {
            select.value = value;
        } else {
            select.selectedIndex = 0;
        }
        updateAudienceHint();
    }

    function selectedAudience() {
        var select = audienceSelect();
        if (!select || !select.value) { return []; }
        return [select.value];
    }

    function switchMode(mode) {
        var controls = document.getElementById('schedule-controls');
        if (!controls) { return; }
        controls.classList.toggle('is-now', mode === 'now');
    }

    function pad(n) {
        return (n < 10 ? '0' : '') + n;
    }

    function to12h(hours, minutes) {
        var ampm = hours >= 12 ? 'PM' : 'AM';
        var h = hours % 12;
        if (h === 0) { h = 12; }
        return pad(h) + ':' + pad(minutes) + ' ' + ampm;
    }

    function scheduleMode() {
        var checked = document.querySelector('input[name="schedule"]:checked');
        return checked ? checked.value : 'now';
    }

    function buildDate() {
        if (scheduleMode() !== 'date') { return new Date().toISOString(); }
        var dateVal = document.getElementById('release-date');
        if (!dateVal || !dateVal.value) { return new Date().toISOString(); }
        var timeVal = document.getElementById('release-time');
        var time = timeVal && timeVal.value ? timeVal.value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i) : null;
        var d = new Date(dateVal.value + 'T00:00:00');
        if (isNaN(d.getTime())) { return new Date().toISOString(); }
        if (time) {
            var hours = parseInt(time[1], 10) % 12;
            if (time[3].toUpperCase() === 'PM') { hours += 12; }
            d.setHours(hours, parseInt(time[2], 10), 0, 0);
        }
        return d.toISOString();
    }

    function loadEditMode() {
        var title = document.getElementById('page-title');
        var desc = document.getElementById('page-desc');
        var cardTitle = document.getElementById('card-title');
        var submitBtn = document.getElementById('submit-btn');
        var subject = document.getElementById('subject');
        var rteArea = document.getElementById('rte-area');

        var record = store() ? store().find(editId) : null;
        if (!record || record.origin !== store().ORIGINS.ADMIN) {
            showToast('You can only edit an announcement you created.', 'error');
            setTimeout(function () { window.location.href = 'announcements.html'; }, 1200);
            return;
        }

        if (title) { title.textContent = 'Edit Announcement'; }
        if (desc) { desc.textContent = 'Update the details of announcement ' + editId + '.'; }
        if (cardTitle) { cardTitle.textContent = 'Edit Announcement Details'; }
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fa-solid fa-circle-check" aria-hidden="true"></i> Update Announcement';
        }

        if (subject) { subject.value = record.title || ''; }
        if (rteArea) { rteArea.textContent = record.message || ''; }

        setAudience([store().CANONICAL_TO_ADMIN_AUDIENCE[record.audience] || 'All Users']);

        if (record.status === 'Scheduled') {
            var d = new Date(record.date);
            if (!isNaN(d.getTime())) {
                var dateInput = document.getElementById('release-date');
                if (dateInput) { dateInput.value = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
                var dateRadio = document.querySelector('input[name="schedule"][value="date"]');
                if (dateRadio) { dateRadio.checked = true; }
                switchMode('date');

                var label = to12h(d.getHours(), d.getMinutes());
                var time = document.getElementById('release-time');
                if (time) {
                    for (var i = 0; i < time.options.length; i++) {
                        if (time.options[i].value === label) { time.selectedIndex = i; break; }
                    }
                }
            }
        }
    }

    function execRte(cmd) {
        var area = document.getElementById('rte-area');
        if (!area) { return; }
        area.focus();
        if (cmd === 'insertImage') {
            var url = window.prompt('Paste an image URL:');
            if (url) { document.execCommand('insertImage', false, url); }
            return;
        }
        if (cmd === 'undo') { document.execCommand('undo'); return; }
        if (cmd === 'redo') { document.execCommand('redo'); return; }
        document.execCommand(cmd, false, null);
    }

    function bindRte() {
        document.querySelectorAll('[data-cmd]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                execRte(btn.getAttribute('data-cmd'));
            });
        });

        var color = document.getElementById('text-color');
        if (color) {
            color.addEventListener('input', function () {
                document.execCommand('foreColor', false, color.value);
            });
        }

        var area = document.getElementById('rte-area');
        if (area) {
            area.addEventListener('keyup', function () {
                var cmds = ['bold', 'italic', 'underline', 'strikeThrough', 'justifyLeft', 'justifyCenter', 'justifyRight', 'insertUnorderedList', 'insertOrderedList'];
                cmds.forEach(function (cmd) {
                    var btn = document.querySelector('[data-cmd="' + cmd + '"]');
                    if (!btn) { return; }
                    var active = false;
                    try { active = document.queryCommandState(cmd); } catch (e) { active = false; }
                    btn.classList.toggle('active', active);
                });
            });
        }
    }

    function saveAnnouncement(audience) {
        var subject = document.getElementById('subject');
        var area = document.getElementById('rte-area');
        var message = area ? (area.innerText || area.textContent || '').trim() : '';
        if (!message) { message = subject.value.trim(); }

        var existing = editId ? store().find(editId) : null;
        if (editId && (!existing || !store().isOwner(existing, ROLE))) {
            showToast('You can only edit an announcement you created.', 'error');
            return false;
        }

        store().upsert({
            id: editId || 'ANN-' + Date.now(),
            title: subject.value.trim(),
            message: message,
            audience: store().canonicalAudience(audience),
            priority: existing ? (existing.priority || 'Normal') : 'Normal',
            category: existing ? (existing.category || 'General') : 'General',
            date: buildDate(),
            status: scheduleMode() === 'date' ? 'Scheduled' : 'Active',
            author: existing ? (existing.author || 'Elena Cruz') : 'Elena Cruz',
            origin: store().ORIGINS.ADMIN,
            editedAt: new Date().toISOString()
        });
        return true;
    }

    function bindUi() {
        document.querySelectorAll('input[name="schedule"]').forEach(function (radio) {
            radio.addEventListener('change', function () {
                switchMode(radio.value);
            });
        });

        var select = audienceSelect();
        if (select) {
            select.addEventListener('change', function () {
                select.style.borderColor = '';
                updateAudienceHint();
            });
        }

        var cancel = document.getElementById('cancel-btn');
        if (cancel) {
            cancel.addEventListener('click', function () {
                window.location.href = 'announcements.html';
            });
        }

        var submit = document.getElementById('submit-btn');
        if (submit) {
            submit.addEventListener('click', function () {
                if (!store()) {
                    showToast('Announcement store unavailable.', 'error');
                    return;
                }

                var subject = document.getElementById('subject');
                if (!subject.value.trim()) {
                    showToast('A subject is required.', 'error');
                    subject.focus();
                    return;
                }

                var audience = selectedAudience();
                if (!audience.length) {
                    var select = audienceSelect();
                    var hint = document.getElementById('audience-hint');
                    if (select) { select.style.borderColor = '#C0392B'; }
                    if (hint) {
                        hint.style.color = '#C0392B';
                        hint.textContent = 'Select a target audience.';
                    }
                    showToast('Select a target audience.', 'error');
                    return;
                }

                submit.classList.add('btn-spin');
                var saved = saveAnnouncement(audience);
                if (!saved) {
                    submit.classList.remove('btn-spin');
                    return;
                }

                showToast((editId ? 'Updating announcement' : 'Posting announcement') + ' ...', '');
                setTimeout(function () {
                    submit.classList.remove('btn-spin');
                    showToast(editId ? 'Announcement updated successfully.' : 'Announcement posted successfully.', 'success');
                    setTimeout(function () {
                        window.location.href = 'announcements.html';
                    }, 700);
                }, 900);
            });
        }
    }

    document.addEventListener('DOMContentLoaded', function () {
        editId = params().get('edit');
        bindRte();
        bindUi();
        if (editId) { loadEditMode(); } else { setAudience([]); }
    });
})();
