/* CEC Registrar Portal - Preferences & Appearance
   --------------------------------------------------------------------------
   Single runtime for every registrar preference. Loaded in <head> on all
   registrar pages so the saved appearance is in effect before first paint.

   Storage keys (localStorage):
     cec-pref-language      en | fil | zh
     cec-pref-date-format   MM/DD/YYYY | DD/MM/YYYY | YYYY-MM-DD
     settings.theme         light | dark
     cec-pref-color         blue | purple | green | yellow | red
     settings.font          14 | 16 | 18

   Appearance is applied to <html>:
     .theme-dark class       dark theme
     --blue / --primary      accent colour
     --font                  root font size (all registrar font sizes are rem)
*/

(function (global) {
    'use strict';

    if (global.CECPrefs) { return; }

    var KEYS = {
        language: 'cec-pref-language',
        dateFormat: 'cec-pref-date-format',
        theme: 'settings.theme',
        color: 'cec-pref-color',
        font: 'settings.font'
    };

    var ACCENTS = {
        blue: '#1D4E9B',
        purple: '#7C3AED',
        green: '#177245',
        yellow: '#D97706',
        red: '#B3261E'
    };

    /* Text-safe variant of every accent. The solid accent is too dark to read
       on the dark canvas, so dark mode uses the lighter variant wherever the
       accent is used as a foreground colour. */
    var ACCENT_TEXT = {
        blue: '#8FB4EE',
        purple: '#C3A0F0',
        green: '#7ED9A2',
        yellow: '#E8B478',
        red: '#F0938C'
    };

    var FONTS = { '14': '14px', '16': '16px', '18': '18px' };

    var DEFAULTS = {
        language: 'en',
        dateFormat: 'MM/DD/YYYY',
        theme: 'light',
        color: 'blue',
        font: '16'
    };

    /* ------------------------------------------------------------------ */
    /* storage                                                             */
    /* ------------------------------------------------------------------ */
    function read(key) {
        try {
            var value = localStorage.getItem(key);
            return value === null ? null : value;
        } catch (err) {
            return null;
        }
    }

    function write(key, value) {
        try {
            localStorage.setItem(key, value);
            return true;
        } catch (err) {
            return false;
        }
    }

    function get(name) {
        var stored = read(KEYS[name]);
        if (stored === null) { return DEFAULTS[name]; }
        return stored;
    }

    function set(name, value) {
        write(KEYS[name], value);
        applyOne(name, value);
    }

    /* ------------------------------------------------------------------ */
    /* appearance                                                          */
    /* ------------------------------------------------------------------ */
    function applyTheme(theme) {
        document.documentElement.classList.toggle('theme-dark', theme === 'dark');
        applyColor(get('color'));
    }

    function applyColor(color) {
        var accent = ACCENTS[color] || ACCENTS.blue;
        var dark = document.documentElement.classList.contains('theme-dark');
        document.documentElement.style.setProperty('--blue', accent);
        document.documentElement.style.setProperty('--primary', accent);
        document.documentElement.style.setProperty('--accent-text',
            dark ? (ACCENT_TEXT[color] || ACCENT_TEXT.blue) : accent);
    }

    function applyFont(size) {
        document.documentElement.style.setProperty('--font', FONTS[size] || FONTS['16']);
    }

    function applyLanguage(lang) {
        if (global.CECI18n) {
            global.CECI18n.apply(lang);
        }
    }

    function applyDateFormat(format) {
        document.documentElement.setAttribute('data-date-format', format || DEFAULTS.dateFormat);
    }

    /* Pages that render dates listen for this so they can redraw the moment a
       preference changes, without waiting for a reload. */
    function notify(name, value) {
        try {
            document.dispatchEvent(new CustomEvent('cec:prefs-changed', {
                detail: { name: name, value: value }
            }));
        } catch (err) { /* older browser */ }
    }

    function applyOne(name, value) {
        if (name === 'theme') { applyTheme(value); }
        else if (name === 'color') { applyColor(value); }
        else if (name === 'font') { applyFont(value); }
        else if (name === 'language') { applyLanguage(value); }
        else if (name === 'dateFormat') { applyDateFormat(value); }
        notify(name, value);
    }

    function applyAll() {
        applyTheme(get('theme'));
        applyColor(get('color'));
        applyFont(get('font'));
        applyDateFormat(get('dateFormat'));
    }

    /* ------------------------------------------------------------------ */
    /* dates                                                               */
    /* ------------------------------------------------------------------ */
    function pad(value) {
        return value < 10 ? '0' + value : String(value);
    }

    function toDate(value) {
        if (value instanceof Date) { return value; }
        if (typeof value === 'number') { return new Date(value); }
        if (!value) { return null; }
        var parsed = new Date(value);
        return isNaN(parsed.getTime()) ? null : parsed;
    }

    /* Formats a date using the configured format:
       MM/DD/YYYY | DD/MM/YYYY | YYYY-MM-DD */
    function formatDate(value, format) {
        var date = toDate(value);
        if (!date) { return ''; }
        var pattern = format || get('dateFormat');
        var day = pad(date.getDate());
        var month = pad(date.getMonth() + 1);
        var year = date.getFullYear();
        if (pattern === 'DD/MM/YYYY') { return day + '/' + month + '/' + year; }
        if (pattern === 'YYYY-MM-DD') { return year + '-' + month + '-' + day; }
        return month + '/' + day + '/' + year;
    }

    function formatTime(value) {
        var date = toDate(value);
        if (!date) { return ''; }
        var hours = date.getHours();
        var meridiem = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        return hours + ':' + pad(date.getMinutes()) + ' ' + meridiem;
    }

    function formatDateTime(value) {
        var date = toDate(value);
        if (!date) { return ''; }
        return formatDate(date) + ' ' + formatTime(date);
    }

    /* ------------------------------------------------------------------ */
    /* toast                                                               */
    /* ------------------------------------------------------------------ */
    function toast(message, type) {
        var host = document.getElementById('toast-wrap');
        if (!host) {
            host = document.createElement('div');
            host.className = 'toast-wrap';
            host.id = 'toast-wrap';
            document.body.appendChild(host);
        }
        var el = document.createElement('div');
        el.className = 'toast ' + (type || 'success');
        el.innerHTML = '<i class="fa-solid fa-circle-check" aria-hidden="true"></i> ' + message;
        host.appendChild(el);
        setTimeout(function () {
            el.classList.remove('show');
            setTimeout(function () {
                if (el.parentNode) { el.parentNode.removeChild(el); }
            }, 300);
        }, 2800);
    }

    /* ------------------------------------------------------------------ */
    /* preferences page controls                                            */
    /* ------------------------------------------------------------------ */
    function syncSelect(id, value) {
        var el = document.getElementById(id);
        if (!el) { return; }
        var found = Array.prototype.some.call(el.options, function (option) {
            return option.value === value;
        });
        if (found) { el.value = value; }
    }

    function bindSelects() {
        [['language', KEYS.language, 'Language preference saved.'],
         ['date-format', KEYS.dateFormat, 'Date format preference saved.']].forEach(function (spec) {
            var el = document.getElementById(spec[0]);
            if (!el) { return; }
            el.addEventListener('change', function () {
                set(spec[0] === 'language' ? 'language' : 'dateFormat', el.value);
                toast(spec[2]);
            });
            syncSelect(spec[0], get(spec[0] === 'language' ? 'language' : 'dateFormat'));
        });
    }

    function bindThemeCards() {
        var cards = Array.prototype.slice.call(document.querySelectorAll('.theme-card'));
        cards.forEach(function (card) {
            card.addEventListener('click', function () {
                cards.forEach(function (c) { c.classList.remove('active'); });
                card.classList.add('active');
                var theme = card.getAttribute('data-theme');
                set('theme', theme);
                toast(theme === 'dark' ? 'Dark mode enabled.' : 'Light mode enabled.');
            });
        });
        cards.forEach(function (card) {
            card.classList.toggle('active', card.getAttribute('data-theme') === get('theme'));
        });
    }

    function bindColorDots() {
        var dots = Array.prototype.slice.call(document.querySelectorAll('.color-dot'));
        dots.forEach(function (dot) {
            dot.addEventListener('click', function () {
                dots.forEach(function (d) { d.classList.remove('selected'); });
                dot.classList.add('selected');
                var color = dot.getAttribute('data-color');
                set('color', color);
                toast('Color scheme changed to ' + color.charAt(0).toUpperCase() + color.slice(1) + '.');
            });
        });
        dots.forEach(function (dot) {
            dot.classList.toggle('selected', dot.getAttribute('data-color') === get('color'));
        });
    }

    function bindFontButtons() {
        var buttons = Array.prototype.slice.call(document.querySelectorAll('#font-size-group button'));
        buttons.forEach(function (btn) {
            btn.addEventListener('click', function () {
                buttons.forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                set('font', btn.getAttribute('data-font'));
                toast('Font size changed.');
            });
        });
        buttons.forEach(function (btn) {
            btn.classList.toggle('active', btn.getAttribute('data-font') === get('font'));
        });
    }

    /* ------------------------------------------------------------------ */
    /* init                                                                */
    /* ------------------------------------------------------------------ */
    /* Appearance first - this runs while the document is still in <head>
       so the portal never flashes the wrong theme. */
    applyAll();

    function init() {
        applyLanguage(get('language'));
        bindSelects();
        bindThemeCards();
        bindColorDots();
        bindFontButtons();
        document.dispatchEvent(new CustomEvent('cec:prefs-ready'));
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    global.CECPrefs = {
        keys: KEYS,
        defaults: DEFAULTS,
        accents: ACCENTS,
        accentText: ACCENT_TEXT,
        get: get,
        set: set,
        apply: applyAll,
        applyOne: applyOne,
        applyTheme: applyTheme,
        applyColor: applyColor,
        applyFont: applyFont,
        applyLanguage: applyLanguage,
        applyDateFormat: applyDateFormat,
        formatDate: formatDate,
        formatTime: formatTime,
        formatDateTime: formatDateTime,
        toast: toast
    };
})(window);
