/* CEC Admin Portal - Account Settings */

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
                if (toast.parentNode) toast.parentNode.removeChild(toast);
            }, 300);
        }, 2800);
    }

    var verifyBtn = document.getElementById('verify-btn');
    if (verifyBtn) {
        verifyBtn.addEventListener('click', function () {
            var email = document.getElementById('email').value.trim();
            if (!email || email.indexOf('@') === -1) {
                showToast('Please enter a valid email address.', true);
                return;
            }
            verifyBtn.textContent = 'Verified';
            verifyBtn.disabled = true;
            showToast('Email address verified successfully.');
        });
    }

    var photoBtn = document.getElementById('photo-btn');
    var photoInput = document.getElementById('photo-input');
    var photoEditor = document.getElementById('photo-editor');
    var photoImg = document.getElementById('photo-img');

    if (photoBtn && photoInput) {
        photoBtn.addEventListener('click', function () {
            photoInput.click();
        });
        photoInput.addEventListener('change', function () {
            if (this.files && this.files[0]) {
                var reader = new FileReader();
                reader.onload = function (e) {
                    if (photoImg) {
                        photoImg.src = e.target.result;
                        photoImg.hidden = false;
                    }
                    if (photoEditor) photoEditor.classList.add('photo-set');
                };
                reader.readAsDataURL(this.files[0]);
                showToast('Profile photo updated.');
                this.value = '';
            }
        });
    }

    var accountForm = document.getElementById('account-form');
    if (accountForm) {
        accountForm.addEventListener('submit', function (e) {
            e.preventDefault();
            var saveBtn = document.getElementById('save-btn');
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Saving...';
            setTimeout(function () {
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Changes';
                showToast('Changes saved successfully.');
            }, 1000);
        });
    }
})();