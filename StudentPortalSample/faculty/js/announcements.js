(function () {
    'use strict';

    var ROLE = 'faculty';

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function priorityClass(priority) {
        return 'priority-' + String(priority || 'Normal').toLowerCase();
    }

    function formatDate(iso) {
        var d = new Date(iso);
        if (isNaN(d.getTime())) { return ''; }
        return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }

    function allItems() {
        return window.AnnouncementStore ? window.AnnouncementStore.all() : [];
    }

    function facultyItems() {
        return window.AnnouncementStore ? window.AnnouncementStore.forRole(ROLE) : [];
    }

    function isOwn(item) {
        return window.AnnouncementStore ? window.AnnouncementStore.isOwner(item, ROLE) : false;
    }

    var state = { tab: 'official', query: '' };

    function dataset() {
        if (state.tab === 'mine') {
            return allItems().filter(isOwn);
        }
        return facultyItems().filter(function (item) { return !isOwn(item); });
    }

    function rowHtml(item) {
        var actions = isOwn(item)
            ? '<div class="row-actions">' +
                '<a class="action-btn" href="edit-announcement.html?id=' + encodeURIComponent(item.id) + '" title="Edit announcement"><i class="fa-regular fa-pen-to-square" aria-hidden="true"></i></a>' +
                '<button type="button" class="action-btn danger btn-delete-ann" data-id="' + escapeHtml(item.id) + '" title="Delete announcement"><i class="fa-solid fa-trash" aria-hidden="true"></i></button>' +
              '</div>'
            : '<span class="muted-cell">&mdash;</span>';

        return '<tr>' +
            '<td class="announcement-title">' + escapeHtml(item.title) + '</td>' +
            '<td class="muted-cell">' + escapeHtml(item.author || '\u2014') + '</td>' +
            '<td class="muted-cell">' + formatDate(item.date) + '</td>' +
            '<td><span class="priority-badge ' + priorityClass(item.priority) + '">' + escapeHtml(item.priority) + '</span></td>' +
            '<td>' + actions + '</td>' +
            '</tr>';
    }

    function render() {
        var tbody = document.getElementById('announcements-body');
        if (!tbody) { return; }

        var q = state.query.trim().toLowerCase();
        var items = dataset().filter(function (item) {
            if (!q) { return true; }
            var hay = (item.title + ' ' + item.message + ' ' + (item.author || '')).toLowerCase();
            return hay.indexOf(q) !== -1;
        });

        var empty = state.tab === 'mine'
            ? 'You have not created any announcements yet.'
            : 'No announcements found.';

        tbody.innerHTML = items.length
            ? items.map(rowHtml).join('')
            : '<tr><td class="muted-cell" colspan="5">' + empty + '</td></tr>';

        updateCount(items.length);
    }

    function updateCount(visible) {
        var info = document.querySelector('.pagination-info');
        if (!info) { return; }
        var total = dataset().length;
        info.textContent = total === 0 ? 'No announcements' : 'Showing ' + visible + ' of ' + total;
    }

    function bindTabs() {
        var tabs = document.querySelectorAll('.tab-btn');
        Array.prototype.forEach.call(tabs, function (tab) {
            tab.addEventListener('click', function () {
                Array.prototype.forEach.call(tabs, function (t) {
                    t.classList.remove('active');
                    t.setAttribute('aria-selected', 'false');
                });
                tab.classList.add('active');
                tab.setAttribute('aria-selected', 'true');
                state.tab = tab.getAttribute('data-tab');
                render();
            });
        });
    }

    function bindSearch() {
        var searchInput = document.getElementById('keyword-search');
        if (!searchInput) { return; }
        searchInput.addEventListener('input', function () {
            state.query = this.value;
            render();
        });
    }

    function bindActions() {
        var tbody = document.getElementById('announcements-body');
        if (!tbody) { return; }

        tbody.addEventListener('click', function (e) {
            var btn = e.target.closest ? e.target.closest('.btn-delete-ann') : null;
            if (!btn) { return; }

            var id = btn.getAttribute('data-id');
            if (!window.AnnouncementStore) { return; }

            var item = window.AnnouncementStore.find(id);
            if (!window.AnnouncementStore.isOwner(item, ROLE)) { return; }
            if (!window.confirm('Delete "' + (item ? item.title : 'this announcement') + '"? This cannot be undone.')) { return; }

            window.AnnouncementStore.remove(id);
            render();
        });
    }

    render();
    bindTabs();
    bindSearch();
    bindActions();
})();
