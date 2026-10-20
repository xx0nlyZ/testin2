(function () {
    'use strict';

    if (window.__CECDocumentRequest) return;
    window.__CECDocumentRequest = true;

    var STORAGE_KEY = 'cec-student-document-requests';
    var STAGES = ['Request Submitted', 'In Review', 'Ready for Pick Up', 'Completed'];
    var STATUS_INDEX = {
        'Pending': 0,
        'In Review': 1,
        'Ready for Pick Up': 2,
        'Completed': 3
    };
    var STATUS_CLASS = {
        'Pending': 'status-amber',
        'In Review': 'status-blue',
        'Ready for Pick Up': 'status-green',
        'Completed': 'status-green',
        'Cancelled': 'status-muted'
    };

    var form = document.getElementById('request-form');
    if (!form) return;

    var tbody = document.getElementById('requests-tbody');
    var statusFilter = document.getElementById('dr-status');
    var searchInput = document.getElementById('dr-search');
    var countPill = document.getElementById('requests-count');
    var paginationInfo = document.getElementById('requests-pagination-info');
    var requestModal = document.getElementById('request-modal');
    var detailModal = document.getElementById('detail-modal');
    var cancelModal = document.getElementById('cancel-modal');
    var newRequestBtn = document.getElementById('new-request-btn');
    var refreshBtn = document.getElementById('dr-refresh');
    var cancelConfirmBtn = document.getElementById('cancel-confirm-btn');

    var docTabs = document.querySelectorAll('[data-doc-tab]');
    var panelRequest = document.getElementById('panel-request');
    var panelUpload = document.getElementById('panel-upload');
    var uploadForm = document.getElementById('upload-form');
    var uploadType = document.getElementById('upload-type');
    var docFile = document.getElementById('doc-file');
    var dropzone = document.getElementById('doc-dropzone');

    var pendingCancelId = null;
    var pendingFile = null;

    var requests = load();

    function pad2(n) { return (n < 10 ? '0' : '') + n; }

    function toISO(date) {
        return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate());
    }

    function daysAgo(n) {
        var d = new Date();
        d.setDate(d.getDate() - n);
        return toISO(d);
    }

    function formatDate(iso) {
        if (!iso) return '';
        var parts = iso.split('-');
        if (parts.length !== 3) return iso;
        var d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return months[d.getMonth()] + ' ' + pad2(d.getDate()) + ', ' + d.getFullYear();
    }

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function seed() {
        return [
            {
                id: 'REQ-2026-0003',
                type: 'Transcript of Records / Form 137',
                copies: 1,
                purpose: 'Employment',
                delivery: 'Pick up at Registrar',
                notes: '',
                status: 'Pending',
                date: daysAgo(2),
                history: [
                    { label: 'Request Submitted', date: daysAgo(2) }
                ]
            },
            {
                id: 'REQ-2026-0002',
                type: 'Certificate of Good Moral',
                copies: 2,
                purpose: 'Scholarship',
                delivery: 'Pick up at Registrar',
                notes: 'Please prepare before Friday.',
                status: 'Ready for Pick Up',
                date: daysAgo(6),
                history: [
                    { label: 'Request Submitted', date: daysAgo(6) },
                    { label: 'In Review', date: daysAgo(5) },
                    { label: 'Ready for Pick Up', date: daysAgo(1) }
                ]
            },
            {
                id: 'REQ-2026-0001',
                type: 'Certificate of Enrollment (COE)',
                copies: 1,
                purpose: 'Board Examination',
                delivery: 'Courier Delivery',
                notes: '',
                status: 'Completed',
                date: daysAgo(14),
                history: [
                    { label: 'Request Submitted', date: daysAgo(14) },
                    { label: 'In Review', date: daysAgo(13) },
                    { label: 'Ready for Pick Up', date: daysAgo(10) },
                    { label: 'Completed', date: daysAgo(9) }
                ]
            }
        ];
    }

    function load() {
        try {
            var raw = window.localStorage.getItem(STORAGE_KEY);
            if (raw) {
                var parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length) return parsed;
            }
        } catch (err) { /* ignore corrupt storage */ }
        var initial = seed();
        save(initial);
        return initial;
    }

    function save(list) {
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list || requests));
        } catch (err) { /* storage unavailable */ }
    }

    function nextReference() {
        var year = new Date().getFullYear();
        var max = 0;
        requests.forEach(function (item) {
            var match = /^REQ-(\d{4})-(\d+)$/.exec(item.id);
            if (match && Number(match[1]) === year) {
                max = Math.max(max, Number(match[2]));
            }
        });
        return 'REQ-' + year + '-' + String(max + 1).padStart(4, '0');
    }

    function statusClass(status) {
        return STATUS_CLASS[status] || 'status-blue';
    }

    function visibleRequests() {
        var status = statusFilter ? statusFilter.value : 'all';
        var term = searchInput ? searchInput.value.trim().toLowerCase() : '';
        return requests.filter(function (item) {
            if (status !== 'all' && item.status !== status) return false;
            if (term) {
                var haystack = (item.type + ' ' + item.id + ' ' + item.purpose).toLowerCase();
                if (haystack.indexOf(term) === -1) return false;
            }
            return true;
        });
    }

    function render() {
        var rows = visibleRequests();

        if (!rows.length) {
            tbody.innerHTML = '<tr class="empty-row"><td colspan="6">No document requests found.</td></tr>';
        } else {
            tbody.innerHTML = rows.map(function (item) {
                var cancellable = item.status !== 'Completed' && item.status !== 'Cancelled';
                return '' +
                    '<tr>' +
                    '<td>' + escapeHtml(item.type) + '</td>' +
                    '<td class="code-cell">' + escapeHtml(item.id) + '</td>' +
                    '<td class="muted-cell">' + escapeHtml(formatDate(item.date)) + '</td>' +
                    '<td class="muted-cell">' + escapeHtml(item.purpose) + '</td>' +
                    '<td><span class="status-badge ' + statusClass(item.status) + '">' + escapeHtml(item.status) + '</span></td>' +
                    '<td class="row-actions">' +
                    '<button class="btn btn-outline" type="button" data-action="view" data-id="' + escapeHtml(item.id) + '">View</button>' +
                    (cancellable
                        ? ' <button class="btn btn-outline" type="button" data-action="cancel" data-id="' + escapeHtml(item.id) + '">Cancel</button>'
                        : '') +
                    '</td>' +
                    '</tr>';
            }).join('');
        }

        updateSummary();
        if (countPill) countPill.textContent = String(rows.length);
        if (paginationInfo) {
            paginationInfo.textContent = 'Showing ' + rows.length + ' of ' + requests.length + ' requests';
        }
    }

    function updateSummary() {
        var open = 0;
        requests.forEach(function (item) {
            if (item.status === 'Pending' || item.status === 'In Review' || item.status === 'Ready for Pick Up') open++;
        });
        setText('summary-open', open);
    }

    function setText(id, value) {
        var el = document.getElementById(id);
        if (el) el.textContent = String(value);
    }

    function clearErrors() {
        form.querySelectorAll('.form-control.is-invalid').forEach(function (el) {
            el.classList.remove('is-invalid');
        });
        form.querySelectorAll('.field-error').forEach(function (el) {
            el.textContent = '';
        });
    }

    function setError(id, message) {
        var control = document.getElementById(id);
        var messageEl = form.querySelector('[data-error-for="' + id + '"]');
        if (control) control.classList.add('is-invalid');
        if (messageEl) messageEl.textContent = message;
    }

    function addHistory(status, list) {
        var index = STATUS_INDEX[status];
        var entry = { label: STAGES[index], date: toISO(new Date()) };
        list.push(entry);
    }

    function handleSubmit(event) {
        event.preventDefault();
        clearErrors();

        var type = document.getElementById('dr-type');
        var copies = document.getElementById('dr-copies');
        var purpose = document.getElementById('dr-purpose');
        var delivery = document.getElementById('dr-delivery');
        var notes = document.getElementById('dr-notes');

        var valid = true;

        if (!type.value) { setError('dr-type', 'Please select a document type.'); valid = false; }
        if (!purpose.value) { setError('dr-purpose', 'Please select a purpose.'); valid = false; }
        if (!delivery.value) { setError('dr-delivery', 'Please select a delivery method.'); valid = false; }

        var copyCount = parseInt(copies.value, 10);
        if (!copyCount || copyCount < 1 || copyCount > 5) {
            setError('dr-copies', 'Enter a number of copies between 1 and 5.');
            valid = false;
        }

        if (!valid) {
            window.showToast('Please complete the required fields.', 'error');
            return;
        }

        var now = toISO(new Date());
        var record = {
            id: nextReference(),
            type: type.value,
            copies: copyCount,
            purpose: purpose.value,
            delivery: delivery.value,
            notes: notes.value.trim(),
            status: 'Pending',
            date: now,
            history: [{ label: STAGES[0], date: now }]
        };

        requests.unshift(record);
        save();
        form.reset();
        clearErrors();
        render();
        closeModal(requestModal);
        window.showToast('Document request ' + record.id + ' submitted to the Registrar.', 'success');
    }

    function findRequest(id) {
        for (var i = 0; i < requests.length; i++) {
            if (requests[i].id === id) return requests[i];
        }
        return null;
    }

    function openModal(modal) {
        if (!modal) return;
        modal.hidden = false;
        document.body.style.overflow = 'hidden';
    }

    function closeModal(modal) {
        if (!modal) return;
        modal.hidden = true;
        if (detailModal.hidden && cancelModal.hidden && (!requestModal || requestModal.hidden)) {
            document.body.style.overflow = '';
        }
    }

    function renderTimeline(item) {
        var done = {};
        (item.history || []).forEach(function (entry) { done[entry.label] = entry.date; });

        var html = STAGES.map(function (stage) {
            var isDone = Object.prototype.hasOwnProperty.call(done, stage);
            var date = isDone ? formatDate(done[stage]) : 'Pending';
            return '<li class="' + (isDone ? 'is-done' : '') + '">' +
                '<strong>' + escapeHtml(stage) + '</strong>' +
                '<span>' + escapeHtml(date) + '</span>' +
                '</li>';
        }).join('');

        if (item.status === 'Cancelled') {
            html += '<li class="is-done">' +
                '<strong>Cancelled</strong>' +
                '<span>' + escapeHtml(formatDate((item.history || []).map(function (e) { return e.label === 'Cancelled' ? e.date : null; }).filter(Boolean)[0] || item.date)) + '</span>' +
                '</li>';
        }

        return html;
    }

    function openDetail(id) {
        var item = findRequest(id);
        if (!item) return;

        setText('detail-type', item.type);
        setText('detail-ref', item.id);
        setText('detail-purpose', item.purpose);
        setText('detail-copies', item.copies);
        setText('detail-delivery', item.delivery);
        setText('detail-notes', item.notes || 'None');

        var statusEl = document.getElementById('detail-status');
        if (statusEl) {
            statusEl.textContent = item.status;
            statusEl.className = 'status-badge ' + statusClass(item.status);
        }

        var timeline = document.getElementById('detail-timeline');
        if (timeline) timeline.innerHTML = renderTimeline(item);

        openModal(detailModal);
    }

    function openCancel(id) {
        var item = findRequest(id);
        if (!item) return;
        pendingCancelId = id;
        setText('cancel-type', item.type);
        setText('cancel-ref', item.id);
        openModal(cancelModal);
    }

    function confirmCancel() {
        var item = findRequest(pendingCancelId);
        if (!item) return;
        if (item.status !== 'Cancelled') {
            item.status = 'Cancelled';
            item.history = item.history || [];
            item.history.push({ label: 'Cancelled', date: toISO(new Date()) });
            save();
        }
        closeModal(cancelModal);
        pendingCancelId = null;
        render();
        window.showToast('Document request ' + item.id + ' cancelled.', 'info');
    }

    function showTab(name) {
        var isUpload = name === 'upload';
        docTabs.forEach(function (tab) {
            var active = tab.getAttribute('data-doc-tab') === name;
            tab.classList.toggle('active', active);
            tab.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        if (panelRequest) panelRequest.hidden = isUpload;
        if (panelUpload) panelUpload.hidden = !isUpload;
    }

    function clearUploadErrors() {
        if (!uploadForm) return;
        uploadForm.querySelectorAll('.form-control.is-invalid').forEach(function (el) {
            el.classList.remove('is-invalid');
        });
        uploadForm.querySelectorAll('.field-error').forEach(function (el) {
            el.textContent = '';
        });
    }

    function setUploadError(id, message) {
        var control = document.getElementById(id);
        var messageEl = uploadForm ? uploadForm.querySelector('[data-error-for="' + id + '"]') : null;
        if (control) control.classList.add('is-invalid');
        if (messageEl) messageEl.textContent = message;
    }

    function formatSize(bytes) {
        return (bytes / 1024).toFixed(1) + ' KB';
    }

    function resetDropzone() {
        pendingFile = null;
        if (docFile) docFile.value = '';
        if (!dropzone) return;
        dropzone.classList.remove('has-file', 'dragover');
        var strong = dropzone.querySelector('strong');
        var small = dropzone.querySelector('small');
        if (strong) strong.textContent = 'Click to upload or drag & drop';
        if (small) small.textContent = 'PDF or image, max 5MB';
    }

    function setDropzoneFile(file) {
        pendingFile = file;
        if (!dropzone) return;
        dropzone.classList.add('has-file');
        var strong = dropzone.querySelector('strong');
        var small = dropzone.querySelector('small');
        if (strong) strong.textContent = 'File selected';
        if (small) small.textContent = file.name + ' (' + formatSize(file.size) + ')';
    }

    function handleFile(file) {
        if (!file) return;
        var isPdf = file.type === 'application/pdf';
        var isImage = /^image\//.test(file.type);
        if (!isPdf && !isImage) {
            window.showToast('Please select a PDF or image file.', 'error');
            resetDropzone();
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            window.showToast('File exceeds the 5MB limit.', 'error');
            resetDropzone();
            return;
        }
        setDropzoneFile(file);
        var messageEl = uploadForm ? uploadForm.querySelector('[data-error-for="doc-file"]') : null;
        if (messageEl) messageEl.textContent = '';
    }

    function handleUploadSubmit(event) {
        event.preventDefault();
        clearUploadErrors();

        var valid = true;
        if (!uploadType || !uploadType.value) {
            setUploadError('upload-type', 'Please select a document type.');
            valid = false;
        }
        if (!pendingFile) {
            setUploadError('doc-file', 'Please choose a file to upload.');
            valid = false;
        }

        if (!valid) {
            window.showToast('Please complete the required fields.', 'error');
            return;
        }

        var docType = uploadType.value;
        uploadForm.reset();
        resetDropzone();
        clearUploadErrors();
        closeModal(requestModal);
        window.showToast('Your ' + docType + ' was uploaded for registrar review.', 'success');
    }

    form.addEventListener('submit', handleSubmit);

    form.querySelectorAll('.form-control').forEach(function (control) {
        control.addEventListener('input', function () {
            control.classList.remove('is-invalid');
            var messageEl = form.querySelector('[data-error-for="' + control.id + '"]');
            if (messageEl) messageEl.textContent = '';
        });
    });

    function openRequestModal() {
        clearErrors();
        clearUploadErrors();
        resetDropzone();
        showTab('request');
        openModal(requestModal);
        var type = document.getElementById('dr-type');
        if (type) setTimeout(function () { type.focus(); }, 150);
    }

    var resetBtn = document.getElementById('dr-reset');
    if (resetBtn) {
        resetBtn.addEventListener('click', function () {
            setTimeout(clearErrors, 0);
        });
    }

    var uploadResetBtn = document.getElementById('upload-reset');
    if (uploadResetBtn) {
        uploadResetBtn.addEventListener('click', function () {
            setTimeout(function () {
                clearUploadErrors();
                resetDropzone();
            }, 0);
        });
    }

    docTabs.forEach(function (tab) {
        tab.addEventListener('click', function () {
            showTab(tab.getAttribute('data-doc-tab'));
        });
    });

    if (uploadForm) {
        uploadForm.addEventListener('submit', handleUploadSubmit);
        uploadForm.querySelectorAll('.form-control').forEach(function (control) {
            control.addEventListener('input', function () {
                control.classList.remove('is-invalid');
                var messageEl = uploadForm.querySelector('[data-error-for="' + control.id + '"]');
                if (messageEl) messageEl.textContent = '';
            });
        });
    }

    if (dropzone && docFile) {
        dropzone.addEventListener('click', function () { docFile.click(); });
        dropzone.addEventListener('keydown', function (event) {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                docFile.click();
            }
        });
        docFile.addEventListener('change', function () { handleFile(docFile.files[0]); });

        ['dragover', 'dragenter'].forEach(function (ev) {
            dropzone.addEventListener(ev, function (event) {
                event.preventDefault();
                dropzone.classList.add('dragover');
            });
        });
        ['dragleave', 'dragend'].forEach(function (ev) {
            dropzone.addEventListener(ev, function () { dropzone.classList.remove('dragover'); });
        });
        dropzone.addEventListener('drop', function (event) {
            event.preventDefault();
            dropzone.classList.remove('dragover');
            if (event.dataTransfer && event.dataTransfer.files.length) {
                handleFile(event.dataTransfer.files[0]);
            }
        });
    }

    if (newRequestBtn) newRequestBtn.addEventListener('click', openRequestModal);

    document.querySelectorAll('[data-request-open]').forEach(function (el) {
        el.addEventListener('click', function (event) {
            event.preventDefault();
            openRequestModal();
        });
    });

    if (statusFilter) statusFilter.addEventListener('change', render);
    if (searchInput) searchInput.addEventListener('input', render);

    if (refreshBtn) {
        refreshBtn.addEventListener('click', function () {
            render();
            window.showToast('Request list refreshed.', 'info');
        });
    }

    tbody.addEventListener('click', function (event) {
        var btn = event.target.closest('[data-action]');
        if (!btn) return;
        var id = btn.getAttribute('data-id');
        if (btn.getAttribute('data-action') === 'view') openDetail(id);
        if (btn.getAttribute('data-action') === 'cancel') openCancel(id);
    });

    if (cancelConfirmBtn) cancelConfirmBtn.addEventListener('click', confirmCancel);

    document.querySelectorAll('[data-close-modal]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            closeModal(btn.closest('.modal-overlay'));
        });
    });

    [requestModal, detailModal, cancelModal].forEach(function (modal) {
        if (!modal) return;
        modal.addEventListener('click', function (event) {
            if (event.target === modal) closeModal(modal);
        });
    });

    document.addEventListener('keydown', function (event) {
        if (event.key !== 'Escape') return;
        if (requestModal && !requestModal.hidden) closeModal(requestModal);
        if (detailModal && !detailModal.hidden) closeModal(detailModal);
        if (cancelModal && !cancelModal.hidden) closeModal(cancelModal);
    });

    statusFilter && render();
    render();

    if (window.location.hash === '#request') {
        openRequestModal();
    }
})();
