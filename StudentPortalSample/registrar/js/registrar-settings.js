/* CEC Registrar Portal - Account Settings */

(function () {
    'use strict';

    function showToast(message, isError) {
        var toast = document.createElement('div');
        toast.className = 'toast show ' + (isError ? 'toast-error' : 'toast-success');
        toast.innerHTML = '<i class="fa-solid ' + (isError ? 'fa-circle-exclamation' : 'fa-circle-check') + '"></i> ' + message;
        document.body.appendChild(toast);
        setTimeout(function () {
            toast.classList.remove('show');
            setTimeout(function () {
                if (toast.parentNode) { toast.parentNode.removeChild(toast); }
            }, 300);
        }, 2800);
    }

    var verifyBtn = document.getElementById('btn-verify-email');
    if (verifyBtn) {
        verifyBtn.addEventListener('click', function () {
            var emailInput = document.getElementById('email-address');
            var email = emailInput.value.trim();
            if (!email || email.indexOf('@') === -1) {
                emailInput.classList.add('invalid');
                showToast('Please enter a valid email address first.', true);
                window.setTimeout(function () { emailInput.classList.remove('invalid'); }, 1800);
                return;
            }
            var badge = document.getElementById('verify-badge');
            if (badge) { badge.classList.add('show'); }
            verifyBtn.textContent = 'Verified';
            verifyBtn.disabled = true;
            verifyBtn.style.opacity = '0.7';
            verifyBtn.style.cursor = 'default';
            showToast('Email address verified successfully.');
        });
    }

    var photoBtn = document.getElementById('btn-change-photo');
    var photoInput = document.getElementById('photo-input');
    var profilePhoto = document.getElementById('profile-photo');

    if (photoBtn && photoInput) {
        photoBtn.addEventListener('click', function () {
            photoInput.click();
        });
        photoInput.addEventListener('change', function () {
            var file = this.files && this.files[0];
            if (!file) { return; }
            if (file.type.indexOf('image/') !== 0) {
                showToast('Please choose an image file.', true);
                return;
            }
            var reader = new FileReader();
            reader.onload = function (ev) {
                if (profilePhoto) {
                    profilePhoto.style.backgroundImage = 'url(' + ev.target.result + ')';
                    profilePhoto.style.backgroundSize = 'cover';
                    profilePhoto.style.backgroundPosition = 'center';
                    var icon = profilePhoto.querySelector('i');
                    if (icon) { icon.style.display = 'none'; }
                }
                showToast('Profile photo updated.');
            };
            reader.readAsDataURL(file);
            this.value = '';
        });
    }

    var accountForm = document.getElementById('account-form');
    if (accountForm) {
        accountForm.addEventListener('submit', function (e) {
            e.preventDefault();
            var saveBtn = document.getElementById('save-btn');
            if (saveBtn) {
                saveBtn.disabled = true;
                saveBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Saving...';
                window.setTimeout(function () {
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Changes';
                    showToast('Account changes saved successfully.');
                }, 1000);
            } else {
                showToast('Account changes saved successfully.');
            }
        });
    }
})();
