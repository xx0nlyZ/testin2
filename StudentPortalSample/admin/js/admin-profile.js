/* ==========================================================================
   CEC ADMIN PORTAL - PROFILE VIEWS
   Copy-to-clipboard, avatar upload preview, and profile form handling.
   ========================================================================== */
(function () {
    'use strict';

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

    function copyText(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard.writeText(text);
        }

        return new Promise(function (resolve, reject) {
            var input = document.createElement('textarea');
            input.value = text;
            input.style.position = 'fixed';
            input.style.opacity = '0';
            document.body.appendChild(input);
            input.select();
            try {
                document.execCommand('copy');
                resolve();
            } catch (err) {
                reject(err);
            } finally {
                document.body.removeChild(input);
            }
        });
    }

    function handleCopyButtons() {
        var buttons = document.querySelectorAll('.copy-btn');
        Array.prototype.forEach.call(buttons, function (btn) {
            btn.addEventListener('click', function () {
                var value = btn.getAttribute('data-copy');
                if (!value) return;

                var original = btn.innerHTML;
                copyText(value)
                    .then(function () {
                        btn.classList.add('copied');
                        btn.innerHTML = '<i class="fa-solid fa-check" aria-hidden="true"></i>';
                        setTimeout(function () {
                            btn.classList.remove('copied');
                            btn.innerHTML = original;
                        }, 1600);
                    })
                    .catch(function () {
                        showToast('Unable to copy. Select and copy the value manually.', 'error');
                    });
            });
        });
    }

    /* ------------------------------------------------------------------
       Avatar upload preview (details + edit pages)
       ------------------------------------------------------------------ */
    function handleAvatarUpload() {
        var input = document.querySelector('#avatar-input');
        var avatar = document.querySelector('#hero-avatar');
        var initials = document.querySelector('#avatar-initials');
        var img = document.querySelector('#avatar-img');
        if (!input || !avatar) return;

        var triggers = document.querySelectorAll('.avatar-trigger');
        Array.prototype.forEach.call(triggers, function (trigger) {
            trigger.addEventListener('click', function () {
                input.click();
            });
        });

        input.addEventListener('change', function () {
            var file = input.files && input.files[0];
            if (!file) return;

            if (!file.type.match(/^image\//)) {
                showToast('Please choose an image file.', 'error');
                input.value = '';
                return;
            }

            var reader = new FileReader();
            reader.onload = function (e) {
                if (img) {
                    img.src = e.target.result;
                    img.hidden = false;
                }
                if (initials) {
                    initials.hidden = true;
                }
                avatar.style.backgroundImage = 'url("' + e.target.result + '")';
                avatar.style.backgroundSize = 'cover';
                avatar.style.backgroundPosition = 'center';
                showToast('New profile picture ready to preview.', 'success');
            };
            reader.readAsDataURL(file);
        });
    }

    /* ------------------------------------------------------------------
       Edit profile form: inline validation + simulated save
       ------------------------------------------------------------------ */
    function handleEditForm() {
        var form = document.querySelector('#edit-profile-form');
        if (!form) return;

        var submitBtn = document.querySelector('button[form="edit-profile-form"]');
        var errorMessages = form.querySelectorAll('.error-msg');

        form.addEventListener('submit', function (e) {
            e.preventDefault();

            Array.prototype.forEach.call(errorMessages, function (el) {
                el.hidden = true;
            });

            var firstInvalid = null;
            Array.prototype.forEach.call(form.elements, function (el) {
                if (el.disabled) return;
                if (!el.checkValidity()) {
                    el.classList.add('invalid');
                    var errorEl = form.querySelector('[data-error-for="' + el.name + '"]');
                    if (errorEl) errorEl.hidden = false;
                    if (!firstInvalid) firstInvalid = el;
                } else {
                    el.classList.remove('invalid');
                }
            });

            if (firstInvalid) {
                firstInvalid.focus();
                showToast('Please complete the highlighted fields.', 'error');
                return;
            }

            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Saving...';
            }

            setTimeout(function () {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="fa-solid fa-floppy-disk" aria-hidden="true"></i> Save Changes';
                }
                showToast('Profile updated successfully.', 'success');
            }, 900);
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        handleCopyButtons();
        handleAvatarUpload();
        handleEditForm();
    });
})();