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

    var DEFAULT_PROFILE = {
        userId: 'ADM-2023010',
        fullName: 'Cero-Alimora',
        role: 'Faculty',
        status: 'Inactive',
        email: 'CeroAlimora@gmail.com',
        contactNumber: '+63 917 123 4567'
    };

    var currentProfile = null;

    function params() {
        return new URLSearchParams(window.location.search);
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

    function profileFor(userId) {
        if (!userId || userId.indexOf('CEC-') !== 0) return DEFAULT_PROFILE;

        var raw = parseInt(userId.substring(7), 10);
        var id = Number.isInteger(raw) && raw >= 10001 && raw <= 10105 ? raw - 10000 : 1;

        for (var b = 0; b < (id - 1) * 5; b++) rand();

        var role = ROLE_WEIGHTS[Math.floor(rand() * ROLE_WEIGHTS.length)];
        var first = FIRST[Math.floor(rand() * FIRST.length)];
        var last = LAST[Math.floor(rand() * LAST.length)];
        rand();
        rand();

        var suspended = { 3: true, 47: true, 92: true };
        var inactive = { 7: true, 19: true, 28: true, 41: true, 56: true, 70: true, 88: true };
        var status = suspended[id] ? 'Suspended' : (inactive[id] ? 'Inactive' : 'Active');

        var slash = first.charAt(0).toLowerCase() + '.' + last.toLowerCase().replace(/\s/g, '');
        var digits = [9, 1, 7,
            Math.floor(rand() * 10), Math.floor(rand() * 10), Math.floor(rand() * 10),
            Math.floor(rand() * 10), Math.floor(rand() * 10), Math.floor(rand() * 10), Math.floor(rand() * 10)];

        return {
            userId: 'CEC-240' + String(10000 + id),
            fullName: first + ' ' + last,
            role: role,
            status: status,
            email: slash + '@gmail.com',
            contactNumber: '+63 ' + digits[0] + digits[1] + digits[2] + ' ' +
                digits[3] + digits[4] + digits[5] + ' ' +
                digits[6] + digits[7] + digits[8] + digits[9]
        };
    }

    function setStatusTint() {
        var status = document.getElementById('status');
        if (!status) return;
        status.className = 'form-select status-select status-' + status.value.toLowerCase();
    }

    function applyProfile(profile) {
        currentProfile = profile;
        setValue('user-id', profile.userId);
        setValue('full-name', profile.fullName);
        setSelectValue('role', profile.role);
        setSelectValue('status', profile.status);
        setValue('email', profile.email);
        setValue('contact-number', profile.contactNumber);
        setStatusTint();
    }

    function setValue(id, value) {
        var el = document.getElementById(id);
        if (el) el.value = value || '';
    }

    function setSelectValue(id, value) {
        var el = document.getElementById(id);
        if (!el) return;
        for (var i = 0; i < el.options.length; i++) {
            if (el.options[i].value === value) {
                el.selectedIndex = i;
                return;
            }
        }
    }

    function resetAvatar() {
        var img = document.getElementById('avatar-img');
        var icon = document.getElementById('avatar-icon');
        var remove = document.getElementById('remove-btn');
        if (img) {
            img.removeAttribute('src');
            img.hidden = true;
        }
        if (icon) icon.hidden = false;
        if (remove) remove.hidden = true;
        var file = document.getElementById('avatar-file');
        if (file) file.value = '';
    }

    function bindAvatar() {
        var upload = document.getElementById('upload-btn');
        var file = document.getElementById('avatar-file');
        var remove = document.getElementById('remove-btn');
        var img = document.getElementById('avatar-img');
        var icon = document.getElementById('avatar-icon');

        if (upload && file) {
            upload.addEventListener('click', function () { file.click(); });
        }

        if (file) {
            file.addEventListener('change', function () {
                var chosen = file.files && file.files[0];
                if (!chosen) return;
                if (chosen.size > 5 * 1024 * 1024) {
                    showToast('Image is too large. Maximum size is 5 MB.', 'error');
                    file.value = '';
                    return;
                }
                var reader = new FileReader();
                reader.onload = function (e) {
                    if (img) {
                        img.src = e.target.result;
                        img.hidden = false;
                    }
                    if (icon) icon.hidden = true;
                    if (remove) remove.hidden = false;
                    showToast('New profile picture selected.', '');
                };
                reader.readAsDataURL(chosen);
            });
        }

        if (remove) {
            remove.addEventListener('click', function () {
                resetAvatar();
                showToast('Profile picture removed.', '');
            });
        }
    }

    function bindUi() {
        var status = document.getElementById('status');
        if (status) {
            status.addEventListener('change', setStatusTint);
        }

        var discard = document.getElementById('discard-btn');
        if (discard) {
            discard.addEventListener('click', function () {
                applyProfile(currentProfile);
                resetAvatar();
                showToast('Changes discarded.', '');
            });
        }

        var save = document.getElementById('save-btn');
        var form = document.getElementById('edit-user-form');
        if (form) {
            form.addEventListener('submit', function (e) { e.preventDefault(); });
        }
        if (save) {
            save.addEventListener('click', function () {
                var name = document.getElementById('full-name');
                var email = document.getElementById('email');
                var contact = document.getElementById('contact-number');

                if (!name || !name.value.trim()) {
                    showToast('Full name is required.', 'error');
                    if (name) name.focus();
                    return;
                }
                if (!email || !/^\S+@\S+\.\S+$/.test(email.value.trim())) {
                    showToast('Enter a valid email address.', 'error');
                    if (email) email.focus();
                    return;
                }
                if (!contact || !contact.value.trim()) {
                    showToast('Contact number is required.', 'error');
                    if (contact) contact.focus();
                    return;
                }

                save.classList.add('btn-spin');
                showToast('Saving your changes ...', '');
                setTimeout(function () {
                    save.classList.remove('btn-spin');
                    showToast('Profile updated successfully.', 'success');
                    setTimeout(function () {
                        window.location.href = 'user-management.html';
                    }, 700);
                }, 900);
            });
        }
    }

    document.addEventListener('DOMContentLoaded', function () {
        applyProfile(profileFor(params().get('userId')));
        bindAvatar();
        bindUi();
    });
})();