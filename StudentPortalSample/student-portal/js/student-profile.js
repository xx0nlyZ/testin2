(function () {
    'use strict';

    if (window.__CECStudentProfile) return;
    window.__CECStudentProfile = true;

    var tabs = document.querySelectorAll('.profile-tabs a');
    var panels = document.querySelectorAll('.profile-tab-content');
    var note = document.getElementById('profile-note');
    var defaultNote = note ? note.textContent.trim() : '';

    function activate(tab) {
        Array.prototype.forEach.call(tabs, function (item) {
            item.classList.remove('active');
        });

        Array.prototype.forEach.call(panels, function (panel) {
            panel.hidden = true;
        });

        tab.classList.add('active');

        var target = document.querySelector(tab.getAttribute('href'));
        if (target) {
            target.hidden = false;
        }

        if (note) {
            note.textContent = tab.getAttribute('data-note') || defaultNote;
        }
    }

    Array.prototype.forEach.call(tabs, function (tab) {
        tab.addEventListener('click', function (event) {
            event.preventDefault();
            activate(tab);
        });
    });
})();
