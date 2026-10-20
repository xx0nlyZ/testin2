/* CEC Registrar Portal - Change Password */

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

    var levels = [
        { label: 'Too weak', width: '0%', cls: 'weak' },
        { label: 'Weak', width: '25%', cls: 'weak' },
        { label: 'Fair', width: '50%', cls: 'fair' },
        { label: 'Good', width: '75%', cls: 'good' },
        { label: 'Strong', width: '100%', cls: 'strong' }
    ];

    function evaluate(value) {
        var score = 0;
        if (value.length >= 8) { score += 1; }
        if (/[a-z]/.test(value) && /[A-Z]/.test(value)) { score += 1; }
        if (/\d/.test(value)) { score += 1; }
        if (/[^A-Za-z0-9]/.test(value)) { score += 1; }
        return levels[score];
    }

    var newPassword = document.getElementById('new-password');
    var strengthBar = document.getElementById('strength-bar');
    var strengthLabel = document.getElementById('strength-label');

    if (newPassword && strengthBar && strengthLabel) {
        newPassword.addEventListener('input', function () {
            var value = newPassword.value;
            if (value.length === 0) {
                strengthBar.className = 'sg-bar';
                strengthBar.style.width = '0%';
                strengthLabel.textContent = '';
                strengthLabel.className = 'strength-label';
                return;
            }
            var result = evaluate(value);
            strengthBar.className = 'sg-bar ' + result.cls;
            strengthBar.style.width = result.width;
            strengthLabel.textContent = result.label;
            strengthLabel.className = 'strength-label ' + result.cls;
        });
    }

    var form = document.getElementById('password-form');
    if (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            var current = document.getElementById('current-password');
            var confirmPw = document.getElementById('confirm-password');

            if (!current.value) {
                current.classList.add('invalid');
                showToast('Please enter your current password.', true);
                window.setTimeout(function () { current.classList.remove('invalid'); }, 1800);
                return;
            }
            if (!newPassword.value || newPassword.value.length < 8) {
                showToast('New password must be at least 8 characters long.', true);
                return;
            }
            if (newPassword.value !== confirmPw.value) {
                confirmPw.classList.add('invalid');
                showToast('New passwords do not match.', true);
                window.setTimeout(function () { confirmPw.classList.remove('invalid'); }, 1800);
                return;
            }

            var btn = document.getElementById('update-btn');
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Updating...';
            }
            window.setTimeout(function () {
                form.reset();
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fa-solid fa-lock"></i> Update Password';
                }
                if (strengthBar) {
                    strengthBar.className = 'sg-bar';
                    strengthBar.style.width = '0%';
                }
                if (strengthLabel) {
                    strengthLabel.textContent = '';
                    strengthLabel.className = 'strength-label';
                }
                showToast('Password updated successfully.');
            }, 1000);
        });
    }
})();
