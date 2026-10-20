(function () {
    var ROLE = 'registrar';
    var activeTab = 'official';

    function tabFilter(items) {
        if (activeTab === 'mine') {
            return items.filter(function (item) { return AnnouncementStore.isOwner(item, ROLE); });
        }
        return items.filter(function (item) { return item.origin !== 'faculty'; });
    }

    var CATEGORY_COLORS = {
        'Enrollment': 'blue',
        'Academic': 'green',
        'IT Support': 'purple',
        'Feature Update': 'teal',
        'Schedule': 'yellow',
        'Finance': 'red',
        'Event': 'pink',
        'General': 'blue'
    };

    function categoryColor(category) {
        return CATEGORY_COLORS[category] || 'blue';
    }

    function priorityClass(priority) {
        return 'priority-' + String(priority || 'Normal').toLowerCase();
    }

    function audienceIcon(audience) {
        if (audience === 'Faculty') { return 'fa-chalkboard-user'; }
        if (audience === 'Students') { return 'fa-user-graduate'; }
        return 'fa-users';
    }

    function formatDate(iso) {
        var d = new Date(iso);
        if (isNaN(d.getTime())) { return { date: '', time: '' }; }
        return {
            date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
        };
    }

    function truncate(text, max) {
        var t = String(text || '').trim();
        return t.length > max ? t.slice(0, max - 1).trim() + '\u2026' : t;
    }

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

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

    function renderIndex() {
        var list = document.getElementById('announce-list');
        if (!list) { return; }

        var items = tabFilter(AnnouncementStore.all()).slice(0, 5);
        list.innerHTML = '';

        if (!items.length) {
            list.innerHTML = '<li class="announce-item announce-empty">' +
                (activeTab === 'mine' ? 'You have not created any announcements yet.' : 'No announcements yet.') +
                '</li>';
            return;
        }

        items.forEach(function (item) {
            var when = formatDate(item.date);
            var owner = AnnouncementStore.isOwner(item, 'registrar');
            var li = document.createElement('li');
            li.className = 'announce-item';
            li.innerHTML =
                '<div class="announce-head">' +
                    '<h4>' + escapeHtml(item.title) + '</h4>' +
                    '<span class="cat-pill ' + categoryColor(item.category) + '">' + escapeHtml(item.category) + '</span>' +
                    '<span class="priority-badge ' + priorityClass(item.priority) + '">' + escapeHtml(item.priority) + '</span>' +
                    '<span class="audience-pill"><i class="fa-solid ' + audienceIcon(item.audience) + '" aria-hidden="true"></i>' + escapeHtml(item.audience) + '</span>' +
                    '<span class="announce-meta">' +
                        '<span class="announce-date">' + when.date + '</span>' +
                        (owner
                            ? '<a class="icon-btn" href="edit.html?id=' + encodeURIComponent(item.id) + '" title="Edit announcement"><i class="fa-regular fa-pen-to-square" aria-hidden="true"></i></a>' +
                              '<button type="button" class="icon-btn danger btn-delete-announce" data-id="' + escapeHtml(item.id) + '" title="Delete announcement"><i class="fa-solid fa-trash" aria-hidden="true"></i></button>'
                            : '') +
                    '</span>' +
                '</div>' +
                '<p class="announce-desc">' + escapeHtml(truncate(item.message, 180)) + '</p>';
            list.appendChild(li);
        });
    }

    function renderAll(filterState) {
        var tbody = document.getElementById('announce-tbody');
        if (!tbody) { return; }

        var state = filterState || {};
        var items = tabFilter(AnnouncementStore.all()).filter(function (item) {
            var term = (state.search || '').toLowerCase();
            var matchesSearch = !term ||
                item.title.toLowerCase().indexOf(term) !== -1 ||
                item.message.toLowerCase().indexOf(term) !== -1;
            var matchesCategory = !state.category || state.category === 'All Categories' || item.category === state.category;
            var matchesStatus = !state.status || state.status === 'All Status' || item.status === state.status;
            return matchesSearch && matchesCategory && matchesStatus;
        });

        tbody.innerHTML = '';

        if (!items.length) {
            tbody.innerHTML = '<tr><td colspan="8" class="muted-cell">No announcements found.</td></tr>';
        } else {
            items.forEach(function (item, index) {
                var when = formatDate(item.date);
                var owner = AnnouncementStore.isOwner(item, 'registrar');
                var row = document.createElement('tr');
                row.innerHTML =
                    '<td class="muted-cell">' + (index + 1) + '</td>' +
                    '<td>' +
                        '<div class="announce-cell">' +
                            '<span class="announce-avatar ' + categoryColor(item.category) + '"><i class="fa-solid fa-bullhorn" aria-hidden="true"></i></span>' +
                            '<div class="announce-cell-text">' +
                                '<strong>' + escapeHtml(item.title) + '</strong>' +
                                '<small>' + escapeHtml(truncate(item.message, 90)) + '</small>' +
                            '</div>' +
                        '</div>' +
                    '</td>' +
                    '<td><span class="audience-pill"><i class="fa-solid ' + audienceIcon(item.audience) + '" aria-hidden="true"></i>' + escapeHtml(item.audience) + '</span></td>' +
                    '<td><span class="cat-pill ' + categoryColor(item.category) + '">' + escapeHtml(item.category) + '</span></td>' +
                    '<td><span class="date-posted">' + when.date + '<small>' + when.time + '</small></span></td>' +
                    '<td><span class="priority-badge ' + priorityClass(item.priority) + '">' + escapeHtml(item.priority) + '</span></td>' +
                    '<td><span class="status-active">' + escapeHtml(item.status) + '</span></td>' +
                    '<td>' +
                        '<div class="actions-cell">' +
                            (owner
                                ? '<a class="icon-btn" href="edit.html?id=' + encodeURIComponent(item.id) + '" title="Edit announcement"><i class="fa-regular fa-pen-to-square" aria-hidden="true"></i></a>' +
                                  '<button type="button" class="icon-btn danger btn-delete-announce" data-id="' + escapeHtml(item.id) + '" title="Delete announcement"><i class="fa-solid fa-trash" aria-hidden="true"></i></button>'
                                : '<span class="muted-cell">Read-only</span>') +
                        '</div>' +
                    '</td>';
                tbody.appendChild(row);
            });
        }

        var info = document.querySelector('.pagination-info');
        if (info) {
            info.textContent = items.length + (items.length === 1 ? ' announcement' : ' announcements');
        }
    }

    function currentFilterState() {
        var state = { search: '', category: '', status: '' };
        var search = document.querySelector('.announce-filters input[type="search"]');
        var category = document.querySelector('.announce-filters select[aria-label="Filter by category"]');
        var status = document.querySelector('.announce-filters select[aria-label="Filter by status"]');
        if (search) { state.search = search.value.trim(); }
        if (category) { state.category = category.value; }
        if (status) { state.status = status.value; }
        return state;
    }

    function refresh() {
        renderIndex();
        renderAll(currentFilterState());
    }

    function initDeleteActions() {
        document.addEventListener('click', function (e) {
            var btn = e.target.closest ? e.target.closest('.btn-delete-announce') : null;
            if (!btn) { return; }

            var item = AnnouncementStore.find(btn.getAttribute('data-id'));
            if (!AnnouncementStore.isOwner(item, 'registrar')) {
                showToast('You can only delete an announcement you created.', true);
                return;
            }
            var label = item ? '"' + item.title + '"' : 'this announcement';
            if (!window.confirm('Delete ' + label + '? This cannot be undone.')) { return; }

            AnnouncementStore.remove(btn.getAttribute('data-id'));
            showToast('Announcement deleted.');
            refresh();
        });
    }

    function initAllFilters() {
        var tbody = document.getElementById('announce-tbody');
        if (!tbody) { return; }

        var filters = document.querySelectorAll('.announce-filters select.filter-select');
        var search = document.querySelector('.announce-filters input[type="search"]');
        var state = { search: '', category: '', status: '' };

        function apply() {
            renderAll(state);
        }

        if (search) {
            search.addEventListener('input', function () {
                state.search = search.value.trim();
                apply();
            });
        }

        filters.forEach(function (select) {
            select.addEventListener('change', function () {
                var label = select.getAttribute('aria-label') || '';
                if (label.indexOf('category') !== -1) {
                    state.category = select.value;
                } else if (label.indexOf('status') !== -1) {
                    state.status = select.value;
                }
                apply();
            });
        });
    }

    function initTabs() {
        var tabs = document.querySelectorAll('.tab-btn');
        if (!tabs.length) { return; }

        Array.prototype.forEach.call(tabs, function (tab) {
            tab.addEventListener('click', function () {
                Array.prototype.forEach.call(tabs, function (t) {
                    t.classList.remove('active');
                    t.setAttribute('aria-selected', 'false');
                });
                tab.classList.add('active');
                tab.setAttribute('aria-selected', 'true');
                activeTab = tab.getAttribute('data-tab');
                refresh();
            });
        });
    }

    refresh();
    initAllFilters();
    initTabs();
    initDeleteActions();
})();
