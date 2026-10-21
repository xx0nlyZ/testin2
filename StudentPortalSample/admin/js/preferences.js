/* CEC ADMIN PORTAL - Preferences & Appearance
   --------------------------------------------------------------------------
   Single runtime for every admin preference. Loaded in <head> on all admin
   pages so the saved appearance is in effect before first paint.

   Storage keys (localStorage - shared with the other CEC portals so one
   account keeps one look across the whole school system):
     cec-pref-language      en | fil | zh
     cec-pref-date-format   MM/DD/YYYY | DD/MM/YYYY | YYYY-MM-DD
     settings.theme         light | dark
     cec-pref-color         blue | purple | green | yellow | red
     settings.font          14 | 16 | 18

   Appearance is applied to <html>:
     .theme-dark class       dark theme
     --blue / --primary      accent colour
     --accent-text           accent colour safe to read as text
     --font                  root font size (all admin font sizes are rem)
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

    /* The preferences page labels the three sizes "Small / Medium / Large". */
    var FONT_LABELS = {
        small: '14', medium: '16', large: '18',
        Small: '14', Medium: '16', Large: '18',
        14: '14', 16: '16', 18: '18'
    };

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
        el.setAttribute('role', 'status');
        el.innerHTML = '<i class="fa-solid fa-circle-check" aria-hidden="true"></i> ';
        el.insertAdjacentText('beforeend', message);
        host.appendChild(el);
        setTimeout(function () {
            el.classList.remove('show');
            setTimeout(function () {
                if (el.parentNode) { el.parentNode.removeChild(el); }
            }, 300);
        }, 2800);
    }

    /* ------------------------------------------------------------------ */
    /* change listeners                                                    */
    /* ------------------------------------------------------------------ */
    function onChange(handler) {
        document.addEventListener('cec:prefs-changed', function (event) {
            handler(event.detail ? event.detail.name : '', event.detail ? event.detail.value : '');
        });
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
        [['language', 'language', 'Language preference saved.'],
         ['date-format', 'dateFormat', 'Date format preference saved.']].forEach(function (spec) {
            var el = document.getElementById(spec[0]);
            if (!el) { return; }
            el.addEventListener('change', function () {
                set(spec[1], el.value);
                toast(spec[2]);
            });
            syncSelect(spec[0], get(spec[1]));
        });
    }

    function bindThemeCards() {
        var cards = Array.prototype.slice.call(document.querySelectorAll('.theme-card[data-theme]'));
        cards.forEach(function (card) {
            card.addEventListener('click', function () {
                var theme = card.getAttribute('data-theme');
                cards.forEach(function (c) {
                    var on = c === card;
                    c.classList.toggle('selected', on);
                    c.classList.toggle('active', on);
                });
                set('theme', theme);
                toast(theme === 'dark' ? 'Dark mode enabled.' : 'Light mode enabled.');
            });
        });
        cards.forEach(function (card) {
            var active = card.getAttribute('data-theme') === get('theme');
            card.classList.toggle('selected', active);
            card.classList.toggle('active', active);
        });
    }

    function bindColorDots() {
        var dots = Array.prototype.slice.call(
            document.querySelectorAll('.swatch[data-color], .color-dot[data-color]'));
        dots.forEach(function (dot) {
            dot.addEventListener('click', function () {
                var color = (dot.getAttribute('data-color') || '').toLowerCase();
                if (!ACCENTS[color]) { return; }
                dots.forEach(function (d) {
                    var on = d === dot;
                    d.classList.toggle('selected', on);
                    d.classList.toggle('active', on);
                });
                set('color', color);
                toast('Color scheme changed to ' + color.charAt(0).toUpperCase() + color.slice(1) + '.');
            });
        });
        dots.forEach(function (dot) {
            var active = (dot.getAttribute('data-color') || '').toLowerCase() === get('color');
            dot.classList.toggle('selected', active);
            dot.classList.toggle('active', active);
        });
    }

    function bindFontButtons() {
        var buttons = Array.prototype.slice.call(
            document.querySelectorAll('.seg-btn[data-size], .seg-btn[data-font]'));
        buttons.forEach(function (btn) {
            btn.addEventListener('click', function () {
                var raw = btn.getAttribute('data-size') || btn.getAttribute('data-font');
                var size = FONT_LABELS[raw];
                if (!size) { return; }
                buttons.forEach(function (b) {
                    var on = b === btn;
                    b.classList.toggle('selected', on);
                    b.classList.toggle('active', on);
                });
                set('font', size);
                toast('Font size changed.');
            });
        });
        buttons.forEach(function (btn) {
            var raw = btn.getAttribute('data-size') || btn.getAttribute('data-font');
            var active = FONT_LABELS[raw] === get('font');
            btn.classList.toggle('selected', active);
            btn.classList.toggle('active', active);
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
        onChange: onChange,
        toast: toast
    };
})(window);
