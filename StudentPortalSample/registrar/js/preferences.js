/* CEC Registrar Portal - Preferences & Appearance */

(function () {
    'use strict';

    var ACCENTS = {
        blue: '#1D4E9B',
        purple: '#7C3AED',
        green: '#177245',
        yellow: '#D97706',
        red: '#B3261E'
    };

    function showToast(message) {
        var toast = document.createElement('div');
        toast.className = 'toast show toast-success';
        toast.innerHTML = '<i class="fa-solid fa-circle-check"></i> ' + message;
        document.body.appendChild(toast);
        setTimeout(function () {
            toast.classList.remove('show');
            setTimeout(function () {
                if (toast.parentNode) { toast.parentNode.removeChild(toast); }
            }, 300);
        }, 2800);
    }

    function store(key, value) {
        try {
            localStorage.setItem(key, value);
        } catch (err) { /* storage unavailable */ }
    }

    function load(key) {
        try {
            return localStorage.getItem(key);
        } catch (err) {
            return null;
        }
    }

    ['language', 'date-format'].forEach(function (id) {
        var el = document.getElementById(id);
        if (!el) { return; }
        el.addEventListener('change', function () {
            store('cec-pref-' + id, el.value);
            showToast(id === 'language' ? 'Language preference saved.' : 'Date format preference saved.');
        });
        var stored = load('cec-pref-' + id);
        if (stored && Array.prototype.some.call(el.options, function (o) { return o.value === stored; })) {
            el.value = stored;
        }
    });

    var themeCards = Array.prototype.slice.call(document.querySelectorAll('.theme-card'));
    themeCards.forEach(function (card) {
        card.addEventListener('click', function () {
            themeCards.forEach(function (c) { c.classList.remove('active'); });
            card.classList.add('active');
            var theme = card.getAttribute('data-theme');
            document.body.classList.toggle('theme-dark', theme === 'dark');
            store('settings.theme', theme);
            showToast(theme === 'dark' ? 'Dark mode enabled.' : 'Light mode enabled.');
        });
    });

    var colorDots = Array.prototype.slice.call(document.querySelectorAll('.color-dot'));
    colorDots.forEach(function (dot) {
        dot.addEventListener('click', function () {
            colorDots.forEach(function (d) { d.classList.remove('selected'); });
            dot.classList.add('selected');
            var color = dot.getAttribute('data-color');
            document.documentElement.style.setProperty('--blue', ACCENTS[color]);
            document.documentElement.style.setProperty('--primary', ACCENTS[color]);
            store('cec-pref-color', color);
            showToast('Color scheme changed to ' + color.charAt(0).toUpperCase() + color.slice(1) + '.');
        });
    });

    var fontButtons = Array.prototype.slice.call(document.querySelectorAll('#font-size-group button'));
    fontButtons.forEach(function (btn) {
        btn.addEventListener('click', function () {
            fontButtons.forEach(function (b) { b.classList.remove('active'); });
            btn.classList.add('active');
            var size = btn.getAttribute('data-font');
            document.documentElement.style.setProperty('--font', size + 'px');
            store('settings.font', size);
            showToast('Font size changed.');
        });
    });

    function applySaved() {
        var savedTheme = load('settings.theme') || 'light';
        document.body.classList.toggle('theme-dark', savedTheme === 'dark');
        themeCards.forEach(function (c) {
            c.classList.toggle('active', c.getAttribute('data-theme') === savedTheme);
        });

        var savedColor = load('cec-pref-color');
        if (savedColor && ACCENTS[savedColor]) {
            document.documentElement.style.setProperty('--blue', ACCENTS[savedColor]);
            document.documentElement.style.setProperty('--primary', ACCENTS[savedColor]);
            colorDots.forEach(function (d) {
                d.classList.toggle('selected', d.getAttribute('data-color') === savedColor);
            });
        }

        var savedFont = load('settings.font') || '16';
        if (savedFont === '14' || savedFont === '16' || savedFont === '18') {
            document.documentElement.style.setProperty('--font', savedFont + 'px');
            fontButtons.forEach(function (b) {
                b.classList.toggle('active', b.getAttribute('data-font') === savedFont);
            });
        }
    }

    applySaved();
})();
