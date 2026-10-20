(function () {
    'use strict';

    function mulberry32(a) {
        return function () {
            a |= 0; a = a + 0x6D2B79F5 | 0;
            var t = Math.imul(a ^ a >>> 15, 1 | a);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }

    var rand = mulberry32(20260520);

    var FIRST = ['Maria', 'Juan', 'Ana', 'Paolo', 'Sofia', 'Miguel', 'Liza', 'Carlo', 'Rita', 'Dennis', 'Karen', 'Mark', 'Nina', 'Ramon', 'Grace', 'Leo', 'Anamarie', 'Joshua', 'Camille', 'Bryan', 'Andrea', 'Vince', 'Patricia', 'Emmanuel', 'Christine', 'Rodolfo', 'Shiela', 'Arvin', 'Jessa', 'Francis', 'Paul', 'Angela', 'Kevin', 'Melissa', 'Darren', 'Giselle', 'Jonathan', 'Teresa', 'Ivan', 'Kathleen', 'Ralph', 'Dianne', 'Marco', 'Alyssa', 'Nathaniel'];
    var LAST = ['Santos', 'Cruz', 'Garcia', 'Reyes', 'Ramos', 'Mendoza', 'Torres', 'Aquino', 'Navarro', 'Velasco', 'Domingo', 'Castillo', 'Bautista', 'Flores', 'Villanueva', 'Salazar', 'Dela Cruz', 'Padilla', 'Ocampo', 'Roxas', 'Bernardo', 'Marquez', 'Sotto', 'Lim', 'Chua', 'Go', 'Tan', 'Sy', 'Uy', 'Yu', 'Fernandez', 'Villamor', 'Balagtas', 'Tolentino', 'Rosales', 'Bravo', 'Escobar', 'De Guzman', 'Manalo', 'Capistrano'];
    var ROLE_WEIGHTS = ['Student', 'Student', 'Student', 'Student', 'Student', 'Faculty', 'Faculty', 'Registrar', 'Registrar'];

    var ROLE_BADGE = {
        Admin: 'badge-navy',
        Faculty: 'badge-blue',
        Student: 'badge-green',
        Registrar: 'badge-amber'
    };

    var STATUS_PILL = {
        Active: 'status-green',
        Inactive: 'status-red',
        Suspended: 'status-amber'
    };

    var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    var SUSPENDED = {};
    [3, 47, 92].forEach(function (i) { SUSPENDED[i] = true; });
    var INACTIVE = {};
    [7, 19, 28, 41, 56, 70, 88].forEach(function (i) { INACTIVE[i] = true; });

    var USERS = [];
    (function buildUsers() {
        var usedUsernames = {};
        for (var i = 1; i <= 105; i++) {
            var role = ROLE_WEIGHTS[Math.floor(rand() * ROLE_WEIGHTS.length)];
            var first = FIRST[Math.floor(rand() * FIRST.length)];
            var last = LAST[Math.floor(rand() * LAST.length)];
            var fullName = first + ' ' + last;

            var base = last.toLowerCase().replace(/\s/g, '');
            var username = first.charAt(0).toLowerCase() + '.' + base;
            var slug = username;
            var seq = 0;
            while (usedUsernames[slug]) {
                seq++;
                slug = username + seq;
            }
            usedUsernames[slug] = true;

            var status;
            if (SUSPENDED[i]) status = 'Suspended';
            else if (INACTIVE[i]) status = 'Inactive';
            else status = 'Active';

            var lastActive = new Date(2024, 4, 20, 12, 0, 0);
            lastActive.setHours(lastActive.getHours() - Math.floor(rand() * 36) - 1);
            lastActive.setMinutes(Math.floor(rand() * 60), 0, 0);

            USERS.push({
                id: 'CEC-240' + String(10000 + i),
                fullName: fullName,
                username: slug,
                role: role,
                status: status,
                lastActive: lastActive
            });
        }
    })();

    var state = {
        page: 1,
        size: 35,
        query: '',
        role: '',
        status: ''
    };

    var selected = {};
    var lastTotal = 1;
    var searchTimer = null;

    function pad(n) {
        return String(n).padStart(2, '0');
    }

    function fmtTs(date) {
        var day = MONTHS[date.getMonth()] + ' ' + pad(date.getDate()) + ', ' + date.getFullYear();
        var h = date.getHours();
        var ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        return day + '  ' + pad(h) + ':' + pad(date.getMinutes()) + ' ' + ampm;
    }

    function initials(name) {
        return name.split(/\s+/).filter(function (p) { return p; })
            .slice(0, 2).map(function (p) { return p[0].toUpperCase(); })
            .join('');
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

    function matches(user) {
        var q = state.query.toLowerCase().trim();
        if (q) {
            var haystack = [
                user.id, user.fullName, user.username,
                user.role, user.status
            ].join(' ').toLowerCase();
            if (haystack.indexOf(q) === -1) return false;
        }
        if (state.role && user.role !== state.role) return false;
        if (state.status && user.status !== state.status) return false;
        return true;
    }

    function filteredUsers() {
        return USERS.filter(matches);
    }

    function countPillsHtml() {
        var total = USERS.length;
        var active = 0, inactive = 0, suspended = 0;
        USERS.forEach(function (u) {
            if (u.status === 'Active') active++;
            else if (u.status === 'Inactive') inactive++;
            else suspended++;
        });
        return '<span class="count-pill pill-blue"><strong>' + total + '</strong> Status</span>' +
            '<span class="count-pill pill-green"><strong>' + active + '</strong> Active</span>' +
            '<span class="count-pill pill-red"><strong>' + inactive + '</strong> Inactive</span>' +
            '<span class="count-pill pill-yellow"><strong>' + suspended + '</strong> Suspended</span>';
    }

    function rowHtml(user) {
        var pill = STATUS_PILL[user.status];
        var badge = ROLE_BADGE[user.role];
        var checked = selected[user.id] ? ' checked' : '';
        return '<tr>' +
            '<td><input type="checkbox" class="row-check" data-id="' + user.id + '"' + checked + ' aria-label="Select ' + user.fullName + '"></td>' +
            '<td class="cell-id">' + user.id + '</td>' +
            '<td><div class="user-cell">' +
            '<span class="mini-avatar">' + initials(user.fullName) + '</span>' +
            '<span class="user-meta"><strong>' + user.fullName + '</strong></span>' +
            '</div></td>' +
            '<td class="username-cell">' + user.username + '</td>' +
            '<td><span class="role-badge ' + badge + '">' + user.role + '</span></td>' +
            '<td><span class="status-badge ' + pill + '"><i class="fa-solid fa-circle" aria-hidden="true"></i> ' + user.status + '</span></td>' +
            '<td class="username-cell">' + fmtTs(user.lastActive) + '</td>' +
            '<td><button type="button" class="btn btn-outline btn-sm" data-edit="' + user.id + '"><i class="fa-solid fa-pen" aria-hidden="true"></i> Edit</button></td>' +
            '</tr>';
    }

    function skeletonRowsHtml() {
        var html = '';
        for (var i = 0; i < 5; i++) {
            html += '<tr><td colspan="8"><div class="skeleton row-skel"></div></td></tr>';
        }
        return html;
    }

    function emptyRowHtml() {
        return '<tr class="empty-row"><td colspan="8">No users match your filters.</td></tr>';
    }

    function renderRows() {
        var tbody = document.getElementById('user-tbody');
        var totalCountEl = document.getElementById('user-count');
        if (!tbody) return;

        var list = filteredUsers();
        lastTotal = Math.max(1, Math.ceil(list.length / state.size));
        if (state.page > lastTotal) state.page = lastTotal;
        if (state.page < 1) state.page = 1;

        var start = (state.page - 1) * state.size;
        var pageItems = list.slice(start, start + state.size);

        tbody.innerHTML = pageItems.length
            ? pageItems.map(rowHtml).join('')
            : emptyRowHtml();

        if (totalCountEl) {
            totalCountEl.textContent = list.length + ' ' + (list.length === 1 ? 'user' : 'users');
        }

        renderPagination();
        syncSelectAll();
    }

    function renderPagination() {
        var container = document.getElementById('page-numbers');
        if (!container) return;

        var html = '';
        for (var i = 1; i <= lastTotal; i++) {
            html += '<button type="button" class="page-num' + (i === state.page ? ' active' : '') + '" data-page="' + i + '">' + i + '</button>';
        }
        container.innerHTML = html;

        var prev = document.getElementById('prev-page');
        var next = document.getElementById('next-page');
        if (prev) prev.disabled = state.page <= 1;
        if (next) next.disabled = state.page >= lastTotal;
    }

    function visibleBoxes(tbody) {
        return Array.prototype.slice.call(tbody ? tbody.querySelectorAll('.row-check') : []);
    }

    function syncSelectAll() {
        var tbody = document.getElementById('user-tbody');
        var master = document.getElementById('select-all');
        if (!tbody || !master) return;
        var boxes = visibleBoxes(tbody);
        if (!boxes.length) {
            master.checked = false;
            master.indeterminate = false;
            return;
        }
        var checkedCount = boxes.filter(function (b) { return b.checked; }).length;
        master.checked = checkedCount === boxes.length;
        master.indeterminate = checkedCount > 0 && checkedCount < boxes.length;
    }

    function loadUsers() {
        var tbody = document.getElementById('user-tbody');
        if (!tbody) return;
        tbody.innerHTML = skeletonRowsHtml();

        setTimeout(function () {
            renderRows();
        }, 450);
    }

    function bindSearch() {
        var el = document.getElementById('user-search');
        if (!el) return;
        el.addEventListener('input', function () {
            state.query = el.value;
            state.page = 1;
            clearTimeout(searchTimer);
            searchTimer = setTimeout(loadUsers, 300);
        });
    }

    function bindFilters() {
        var roleEl = document.getElementById('role-filter');
        var statusEl = document.getElementById('status-filter');
        if (roleEl) {
            roleEl.addEventListener('change', function () {
                state.role = roleEl.value;
                state.page = 1;
                loadUsers();
            });
        }
        if (statusEl) {
            statusEl.addEventListener('change', function () {
                state.status = statusEl.value;
                state.page = 1;
                loadUsers();
            });
        }
    }

    function bindPagination() {
        var numbers = document.getElementById('page-numbers');
        if (numbers) {
            numbers.addEventListener('click', function (e) {
                var btn = e.target.closest('.page-num');
                if (btn && !btn.classList.contains('active')) {
                    state.page = parseInt(btn.getAttribute('data-page'), 10);
                    loadUsers();
                }
            });
        }

        var prev = document.getElementById('prev-page');
        var next = document.getElementById('next-page');
        if (prev) prev.addEventListener('click', function () { if (state.page > 1) { state.page--; loadUsers(); } });
        if (next) next.addEventListener('click', function () { if (state.page < lastTotal) { state.page++; loadUsers(); } });

        var jump = document.getElementById('jump-input');
        if (jump) {
            jump.addEventListener('change', function () {
                var value = parseInt(jump.value, 10);
                if (!value || value < 1) { jump.value = state.page; return; }
                state.page = Math.min(value, lastTotal);
                jump.value = state.page;
                loadUsers();
            });
        }

        var sizeSelect = document.getElementById('page-size');
        if (sizeSelect) {
            sizeSelect.addEventListener('change', function () {
                state.size = parseInt(sizeSelect.value, 10);
                state.page = 1;
                loadUsers();
            });
        }
    }

    function bindSelection() {
        var tbody = document.getElementById('user-tbody');
        var master = document.getElementById('select-all');
        if (!tbody || !master) return;

        master.addEventListener('change', function () {
            visibleBoxes(tbody).forEach(function (box) {
                box.checked = master.checked;
                if (master.checked) selected[box.getAttribute('data-id')] = true;
                else delete selected[box.getAttribute('data-id')];
            });
        });

        tbody.addEventListener('change', function (e) {
            var box = e.target.closest('.row-check');
            if (!box) return;
            var id = box.getAttribute('data-id');
            if (box.checked) selected[id] = true;
            else delete selected[id];
            syncSelectAll();
        });

        tbody.addEventListener('click', function (e) {
            var btn = e.target.closest('[data-edit]');
            if (!btn) return;
            window.location.href = 'edit-user-profile.html?userId=' + btn.getAttribute('data-edit');
        });
    }

    function closeExportMenu() {
        var menu = document.getElementById('export-menu');
        var btn = document.getElementById('export-btn');
        if (menu) menu.hidden = true;
        if (btn) btn.setAttribute('aria-expanded', 'false');
    }

    function bindExport() {
        var btn = document.getElementById('export-btn');
        var menu = document.getElementById('export-menu');
        if (!btn || !menu) return;

        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            var open = menu.hidden;
            menu.hidden = !open;
            btn.setAttribute('aria-expanded', String(open));
        });

        menu.addEventListener('click', function (e) {
            var item = e.target.closest('[data-format]');
            if (!item) return;
            var format = item.getAttribute('data-format').toUpperCase();
            closeExportMenu();
            var count = filteredUsers().length;
            showToast('Preparing ' + format + ' export for ' + count + ' users...', '');
            setTimeout(function () {
                showToast(format + ' export is ready to download.', 'success');
            }, 900);
        });

        document.addEventListener('click', function () { closeExportMenu(); });
    }

    var createSeq = USERS.length;

    function generateUserId() {
        createSeq++;
        return 'CEC-240' + String(10000 + createSeq);
    }

    function uniqueUsername(fullName) {
        var parts = fullName.split(/\s+/).filter(function (p) { return p; });
        if (!parts.length) return 'user';
        var base;
        if (parts.length === 1) {
            base = parts[0].toLowerCase().replace(/\s/g, '');
        } else {
            base = parts[0].charAt(0).toLowerCase() + '.' + parts[parts.length - 1].toLowerCase().replace(/\s/g, '');
        }
        var slug = base;
        var seq = 0;
        while (USERS.some(function (u) { return u.username === slug; })) {
            seq++;
            slug = base + seq;
        }
        return slug;
    }

    function openModal(id) {
        var el = document.getElementById(id);
        if (el) el.classList.add('active');
    }

    function closeModal(id) {
        var el = document.getElementById(id);
        if (el) el.classList.remove('active');
    }

    function refreshSummary() {
        var pills = document.getElementById('count-pills');
        if (pills) pills.innerHTML = countPillsHtml();
    }

    function bindCreateAccount() {
        var openBtn = document.getElementById('create-account-btn');
        var saveBtn = document.getElementById('btn-save-account');
        var overlay = document.getElementById('modal-create-account');

        if (openBtn) {
            openBtn.addEventListener('click', function () {
                document.getElementById('new-full-name').value = '';
                document.getElementById('new-user-id').value = generateUserId();
                document.getElementById('new-email').value = '';
                document.getElementById('new-role').value = '';
                document.getElementById('new-status').value = 'Active';
                document.getElementById('new-password').value = 'ChangeMe123!';
                openModal('modal-create-account');
            });
        }

        if (saveBtn) {
            saveBtn.addEventListener('click', function () {
                var fullName = document.getElementById('new-full-name').value.trim();
                var userId = document.getElementById('new-user-id').value.trim();
                var email = document.getElementById('new-email').value.trim();
                var role = document.getElementById('new-role').value;
                var status = document.getElementById('new-status').value;
                var password = document.getElementById('new-password').value.trim();

                if (!fullName || !userId || !email || !role || !status || !password) {
                    showToast('Please fill in all required fields.', 'error');
                    return;
                }
                if (!/^\S+@\S+\.\S+$/.test(email)) {
                    showToast('Enter a valid email address.', 'error');
                    return;
                }
                if (password.length < 6) {
                    showToast('The temporary password must be at least 6 characters.', 'error');
                    return;
                }
                if (USERS.some(function (u) { return u.id.toLowerCase() === userId.toLowerCase(); })) {
                    showToast('That User ID is already in use.', 'error');
                    return;
                }

                var session = window.CECAuth ? window.CECAuth.getSession() : null;
                var actorRole = session ? session.role : null;

                var result = window.CECAuth
                    ? window.CECAuth.createAccount({
                        name: fullName,
                        id: userId,
                        email: email,
                        role: role.toLowerCase(),
                        password: password,
                        status: status
                    }, actorRole)
                    : { ok: false, message: 'Demo auth library is not loaded.' };

                if (!result.ok) {
                    showToast(result.message, 'error');
                    return;
                }

                USERS.unshift({
                    id: userId,
                    fullName: fullName,
                    username: result.username,
                    role: role,
                    status: status,
                    lastActive: new Date()
                });

                closeModal('modal-create-account');
                refreshSummary();
                state.page = 1;
                renderRows();
                showToast(role + ' account created for ' + fullName + '. Login: ' + result.username + ' / ' + result.password, 'success');
            });
        }

        Array.prototype.forEach.call(document.querySelectorAll('[data-close="modal-create-account"]'), function (btn) {
            btn.addEventListener('click', function () { closeModal('modal-create-account'); });
        });

        if (overlay) {
            overlay.addEventListener('click', function (e) {
                if (e.target === overlay) overlay.classList.remove('active');
            });
        }
    }

    function mergeAuthAccounts() {
        if (!window.CECAuth) return;
        var known = {};
        USERS.forEach(function (u) { known[u.id.toLowerCase()] = true; });
        window.CECAuth.listAccounts().forEach(function (acc) {
            if (known[acc.id.toLowerCase()]) return;
            USERS.unshift({
                id: acc.id,
                fullName: acc.name,
                username: acc.username,
                role: acc.role.charAt(0).toUpperCase() + acc.role.slice(1),
                status: acc.status,
                lastActive: new Date()
            });
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        mergeAuthAccounts();
        var pills = document.getElementById('count-pills');
        if (pills) pills.innerHTML = countPillsHtml();
        bindSearch();
        bindFilters();
        bindPagination();
        bindSelection();
        bindExport();
        bindCreateAccount();
        loadUsers();
    });
})();