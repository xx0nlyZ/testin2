(function () {
    'use strict';

    var READ_KEY = 'cec-announcements-read';

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function priorityTagClass(priority) {
        if (priority === 'High') { return 'tag-red'; }
        if (priority === 'Low') { return 'tag-green'; }
        return 'tag-blue';
    }

    function timeAgo(iso) {
        var then = new Date(iso).getTime();
        if (isNaN(then)) { return ''; }
        var diff = Date.now() - then;
        if (diff < 60000) { return 'just now'; }
        var mins = Math.round(diff / 60000);
        if (mins < 60) { return mins + (mins === 1 ? ' min' : ' mins') + ' ago'; }
        var hrs = Math.round(mins / 60);
        if (hrs < 24) { return hrs + (hrs === 1 ? ' hour' : ' hours') + ' ago'; }
        var days = Math.round(hrs / 24);
        if (days < 30) { return days + (days === 1 ? ' day' : ' days') + ' ago'; }
        return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    function readSet() {
        try {
            var parsed = JSON.parse(localStorage.getItem(READ_KEY) || '[]');
            return Array.isArray(parsed) ? parsed : [];
        } catch (err) {
            return [];
        }
    }

    function saveReadSet(list) {
        try {
            localStorage.setItem(READ_KEY, JSON.stringify(list));
        } catch (err) {
            /* ignore */
        }
    }

    function isRead(id) {
        return readSet().indexOf(id) !== -1;
    }

    function markAllRead(ids) {
        var set = readSet();
        ids.forEach(function (id) {
            if (set.indexOf(id) === -1) { set.push(id); }
        });
        saveReadSet(set);
    }

    function getItems() {
        if (window.AnnouncementStore) {
            return window.AnnouncementStore.forRole('student');
        }
        return [];
    }

    function cardHtml(item) {
        return '<article class="card' + (isRead(item.id) ? ' is-read' : '') + '" data-id="' + escapeHtml(item.id) + '">' +
            '<div class="card-head">' +
                '<h2>' + escapeHtml(item.title) + '</h2>' +
                '<span class="tag ' + priorityTagClass(item.priority) + '">' + escapeHtml(item.priority) + '</span>' +
            '</div>' +
            '<div class="card-body">' +
                '<p class="page-desc">' + escapeHtml(item.message) + '</p>' +
            '</div>' +
            '<div class="card-foot">' +
                '<p>Posted ' + timeAgo(item.date) + ' by ' + escapeHtml(item.author || 'the school') + '</p>' +
            '</div>' +
            '</article>';
    }

    var state = { category: 'All Categories', priority: 'All Priorities' };

    function filtered(items) {
        return items.filter(function (item) {
            var matchCategory = state.category === 'All Categories' || item.category === state.category;
            var matchPriority = state.priority === 'All Priorities' || item.priority === state.priority;
            return matchCategory && matchPriority;
        });
    }

    function renderCards() {
        var stack = document.getElementById('announcements-stack');
        if (!stack) { return; }

        var items = filtered(getItems());
        stack.innerHTML = items.length
            ? items.map(cardHtml).join('')
            : '<p class="note-bar"><i class="fa-solid fa-circle-info" aria-hidden="true"></i> No announcements match the selected filters.</p>';
    }

    function renderSummary() {
        var items = getItems();
        var unread = items.filter(function (item) { return !isRead(item.id); }).length;
        var high = items.filter(function (item) { return item.priority === 'High'; }).length;

        var totalEl = document.getElementById('summary-total');
        var unreadEl = document.getElementById('summary-unread');
        var highEl = document.getElementById('summary-high');
        var lastEl = document.getElementById('summary-last');

        if (totalEl) { totalEl.textContent = items.length; }
        if (unreadEl) { unreadEl.textContent = unread; }
        if (highEl) { highEl.textContent = high; }
        if (lastEl) { lastEl.textContent = items.length ? timeAgo(items[0].date).replace(' ago', '') : '—'; }
    }

    function buildCategoryOptions() {
        var select = document.getElementById('announcement-category');
        if (!select) { return; }

        var seen = {};
        getItems().forEach(function (item) {
            if (item.category && !seen[item.category]) { seen[item.category] = true; }
        });

        var html = '<option selected>All Categories</option>';
        Object.keys(seen).sort().forEach(function (cat) {
            html += '<option>' + escapeHtml(cat) + '</option>';
        });
        select.innerHTML = html;
    }

    function bindFilters() {
        var category = document.getElementById('announcement-category');
        var priority = document.getElementById('announcement-priority');

        if (category) {
            category.addEventListener('change', function () {
                state.category = category.value;
                renderCards();
            });
        }
        if (priority) {
            priority.addEventListener('change', function () {
                state.priority = priority.value;
                renderCards();
            });
        }
    }

    function bindMarkAllRead() {
        var btn = document.getElementById('mark-all-read');
        if (!btn) { return; }

        btn.addEventListener('click', function () {
            markAllRead(getItems().map(function (item) { return item.id; }));
            renderCards();
            renderSummary();
            if (window.showToast) { window.showToast('All announcements marked as read'); }
        });
    }

    function bindCardRead() {
        var stack = document.getElementById('announcements-stack');
        if (!stack) { return; }

        stack.addEventListener('click', function (e) {
            var card = e.target.closest ? e.target.closest('.card') : null;
            if (!card) { return; }
            var id = card.getAttribute('data-id');
            if (!id || isRead(id)) { return; }
            markAllRead([id]);
            card.classList.add('is-read');
            renderSummary();
        });
    }

    renderCards();
    renderSummary();
    buildCategoryOptions();
    bindFilters();
    bindMarkAllRead();
    bindCardRead();
})();
