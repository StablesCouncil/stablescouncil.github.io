// BOTTOM-NAV.JS - Bottom navigation highlighting

(function () {
    function updateBottomNav() {
        const hash = window.location.hash || '#/wallet';
        const route = hash.replace('#/', '');

        // Update active state
        document.querySelectorAll('.bottom-nav-item').forEach(item => {
            if (item.dataset.route === route) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    // Update on hash change
    window.addEventListener('hashchange', updateBottomNav);

    // Initial update
    document.addEventListener('DOMContentLoaded', updateBottomNav);
})();



