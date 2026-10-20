(function () {
    'use strict';

    var ROLE = 'admin';

    var STATUS_PILL = {
        Live: 'status-green',
        Scheduled: 'status-blue',
        Expired: 'status-red'
    };

    var state = {
        tab: 'all',
        query: ''
    };

    function store() {
        return window.AnnouncementStore;
    }

    function statusLabel(sharedStatus) {
        var map = store() ? store().SHARED_TO_ADMIN_STATUS : null;
        return (map && map[sharedStatus]) || sharedStatus || 'Live';
    }

    function formatOn(iso) {
        var d = new Date(iso);
        if (isNaN(d.getTime())) { return ''; }
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    function adminItems() {
        if (!store()) { return []; }
        return store().all().filter(function (item) {
            return item.origin === store().ORIGINS.ADMIN;
        }).map(function (item) {
            return {
                id: item.id,
                subject: item.title,
                summary: item.message,
                status: statusLabel(item.status),
                createdBy: item.author || 'Administrator',
                createdOn: formatOn(item.date)
            };
        });
    }

    function initials(name) {
        return name.split(/\s+/).filter(function (p) { return p; })
            .slice(0, 2).map(function (p) { return p[0].toUpperCase(); })
            .join('');
    }

    function statusPill(status) {
        return '<span class="status-badge ' + STATUS_PILL[status] + '"><i class="fa-solid fa-circle" aria-hidden="true"></i> ' + status + '</span>';
    }

    function itemHtml(a) {
        var iconCls = a.status === 'Live' ? 'live' : a.status === 'Scheduled' ? 'scheduled' : 'expired';
        return '<div class="ann-item" data-id="' + a.id + '">' +
            '<div class="ann-subject">' +
            '<span class="ann-icon ' + iconCls + '"><i class="fa-solid fa-bullhorn" aria-hidden="true"></i></span>' +
            '<div class="ann-copy"><strong>' + a.subject + '</strong><p>' + a.summary + '</p></div>' +
            '</div>' +
            '<div>' + statusPill(a.status) + '</div>' +
            '<div class="ann-meta"><span class="mini-avatar">' + initials(a.createdBy) + '</span><span>' + a.createdBy + '</span></div>' +
            '<div class="ann-date">' + a.createdOn + '</div>' +
            '<div class="ann-actions">' +
            '<div class="split">' +
            '<button type="button" class="btn btn-outline btn-sm split-main" data-edit="' + a.id + '"><i class="fa-solid fa-pen" aria-hidden="true"></i> Edit</button>' +
            '<button type="button" class="btn btn-outline btn-sm split-caret" data-menu="' + a.id + '" aria-haspopup="menu" aria-expanded="false"><i class="fa-solid fa-caret-down"></i></button>' +
            '<div class="dropdown-menu" data-menu-panel="' + a.id + '" role="menu" hidden>' +
            '<button type="button" class="dropdown-item" data-edit="' + a.id + '"><i class="fa-solid fa-pen" aria-hidden="true"></i> Edit Announcement</button>' +
            '<button type="button" class="dropdown-item danger" data-delete="' + a.id + '"><i class="fa-solid fa-trash" aria-hidden="true"></i> Delete</button>' +
            '</div>' +
            '</div>' +
            '</div>' +
            '</div>';
    }

    function skeletonItems() {
        var html = '';
        for (var i = 0; i < 5; i++) {
            html += '<div class="ann-item"><div class="ann-subject"><span class="ann-icon"><i class="fa-solid fa-bullhorn"></i></span><div class="ann-copy"><div class="skeleton row-skel" style="width:45%"></div><div class="skeleton row-skel" style="width:75%"></div></div></div></div>';
        }
        return html;
    }

    function emptyState() {
        return '<div class="ann-item empty-row"><div style="text-align:center">No announcements match your filters.</div></div>';
    }

    function render() {
        var list = document.getElementById('ann-list');
        if (!list) { return; }
        list.innerHTML = skeletonItems();

        setTimeout(function () {
            var visible = adminItems().filter(function (a) {
                if (state.tab !== 'all' && a.status.toLowerCase() !== state.tab) { return false; }
                var q = state.query.toLowerCase().trim();
                if (q) {
                    var hay = (a.subject + ' ' + a.summary + ' ' + a.createdBy + ' ' + a.status).toLowerCase();
                    if (hay.indexOf(q) === -1) { return false; }
                }
                return true;
            });
            list.innerHTML = visible.length ? visible.map(itemHtml).join('') : emptyState();
        }, 400);
    }

    function findById(id) {
        var items = adminItems();
        for (var i = 0; i < items.length; i++) {
            if (items[i].id === id) { return items[i]; }
        }
        return null;
    }

    function closeMenus() {
        var panels = document.querySelectorAll('[data-menu-panel]');
        Array.prototype.forEach.call(panels, function (p) { p.hidden = true; });
        var carets = document.querySelectorAll('[data-menu]');
        Array.prototype.forEach.call(carets, function (c) { c.setAttribute('aria-expanded', 'false'); });
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

    function bindUi() {
        var tabs = document.querySelectorAll('.tab-pill');
        tabs.forEach(function (tab) {
            tab.addEventListener('click', function () {
                tabs.forEach(function (t) { t.classList.remove('active'); });
                tab.classList.add('active');
                state.tab = tab.getAttribute('data-tab');
                render();
            });
        });

        var search = document.getElementById('ann-search');
        if (search) {
            search.addEventListener('input', function () {
                state.query = search.value;
                render();
            });
        }

        var list = document.getElementById('ann-list');
        if (!list) { return; }

        list.addEventListener('click', function (e) {
            var editBtn = e.target.closest('[data-edit]');
            if (editBtn) {
                window.location.href = 'announcement-form.html?edit=' + editBtn.getAttribute('data-edit');
                return;
            }

            var caret = e.target.closest('[data-menu]');
            if (caret) {
                e.stopPropagation();
                var panel = document.querySelector('[data-menu-panel="' + caret.getAttribute('data-menu') + '"]');
                if (panel) { panel.hidden = !panel.hidden; }
                caret.setAttribute('aria-expanded', panel ? String(!panel.hidden) : 'false');
                return;
            }

            var del = e.target.closest('[data-delete]');
            if (del) {
                var id = del.getAttribute('data-delete');
                closeMenus();

                var record = store() ? store().find(id) : null;
                if (!store() || !store().isOwner(record, ROLE)) {
                    showToast('You can only delete an announcement you created.', 'error');
                    return;
                }

                showToast('Deleting "' + id + '" ...', '');
                setTimeout(function () {
                    store().remove(id);
                    var item = document.querySelector('.ann-item[data-id="' + id + '"]');
                    if (item) { item.remove(); }
                    showToast('Announcement deleted.', 'success');
                    render();
                }, 500);
            }
        });

        document.addEventListener('click', function (e) {
            if (!e.target.closest('.split')) { closeMenus(); }
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        bindUi();
        render();
    });
})();
