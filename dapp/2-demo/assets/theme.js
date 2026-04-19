// THEME.JS - Theme switcher
(function () {
    // Get saved theme or default to dark
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);

    // Update icon (inverted: show what you'll GET)
    const updateIcon = () => {
        const theme = document.documentElement.getAttribute('data-theme');
        const icon = document.getElementById('themeIcon');
        if (icon) {
            icon.textContent = theme === 'dark' ? '☀️' : '🌙';
        }
    };

    // Initialize icon
    updateIcon();

    // Toggle handler
    window.toggleTheme = () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateIcon();
    };

    // Wire up button when DOM ready
    document.addEventListener('DOMContentLoaded', () => {
        const btn = document.getElementById('themeToggle');
        if (btn) {
            btn.onclick = window.toggleTheme;
        }
        updateIcon();
    });
})();



