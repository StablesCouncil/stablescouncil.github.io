// THEME.JS - Six distinct colour themes (Settings → Appearance)
(function () {
    var STORAGE_KEY = 'stables_colour_theme';
    var LEGACY_KEY = 'theme';
    var MIGRATE = {
        midnight: 'stables-dark',
        'soft-light': 'paper',
        daylight: 'paper',
        light: 'paper'
    };
    var THEMES = {
        'stables-dark': { label: 'Stables dark' },
        slate: { label: 'Slate' },
        solar: { label: 'Solar' },
        rose: { label: 'Rose' },
        violet: { label: 'Violet' },
        paper: { label: 'Paper' }
    };
    var DEFAULT_THEME = 'stables-dark';

    function normalizeTheme(id) {
        if (id && MIGRATE[id]) id = MIGRATE[id];
        if (id && THEMES[id]) return id;
        return DEFAULT_THEME;
    }

    function readStoredTheme() {
        try {
            var saved = localStorage.getItem(STORAGE_KEY);
            if (saved) return normalizeTheme(saved);
            var legacy = localStorage.getItem(LEGACY_KEY);
            if (legacy === 'light') return 'paper';
            if (legacy === 'dark') return 'stables-dark';
        } catch (_) { /* ignore */ }
        return DEFAULT_THEME;
    }

    function currentTheme() {
        return normalizeTheme(document.documentElement.getAttribute('data-theme'));
    }

    function applyTheme(id, options) {
        var theme = normalizeTheme(id);
        var opts = options || {};
        document.documentElement.setAttribute('data-theme', theme);
        document.body.classList.remove('light');
        try {
            localStorage.setItem(STORAGE_KEY, theme);
            localStorage.removeItem(LEGACY_KEY);
        } catch (_) { /* ignore */ }
        syncPicker(theme);
        if (opts.toast && typeof window.showToast === 'function') {
            window.showToast('Theme: ' + (THEMES[theme] ? THEMES[theme].label : theme));
        }
        return theme;
    }

    function syncPicker(activeId) {
        var picker = document.getElementById('themePicker');
        if (!picker) return;
        var active = normalizeTheme(activeId || currentTheme());
        picker.querySelectorAll('.theme-pick[data-theme-id]').forEach(function (btn) {
            var on = btn.getAttribute('data-theme-id') === active;
            btn.classList.toggle('is-active', on);
            btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
    }

    function initPicker() {
        var picker = document.getElementById('themePicker');
        if (!picker) return;
        picker.addEventListener('click', function (ev) {
            var btn = ev.target && ev.target.closest ? ev.target.closest('.theme-pick[data-theme-id]') : null;
            if (!btn || !picker.contains(btn)) return;
            var next = btn.getAttribute('data-theme-id');
            if (!next || next === currentTheme()) return;
            applyTheme(next, { toast: true });
        });
        syncPicker(currentTheme());
    }

    window.stablesApplyTheme = applyTheme;
    window.stablesGetTheme = currentTheme;

    applyTheme(readStoredTheme());

    document.addEventListener('DOMContentLoaded', initPicker);
})();