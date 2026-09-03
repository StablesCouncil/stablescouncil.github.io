// HAMBURGER.JS - Mobile menu toggle

(function () {
    const $ = (id) => document.getElementById(id);

    let menuOpen = false;

    window.toggleMenu = () => {
        menuOpen = !menuOpen;
        const sidebar = document.querySelector('.sidebar');
        const hamburger = $('hamburger');

        if (menuOpen) {
            sidebar.classList.add('mobile-open');
            hamburger.classList.add('active');
            document.body.style.overflow = 'hidden'; // Prevent scroll
        } else {
            sidebar.classList.remove('mobile-open');
            hamburger.classList.remove('active');
            document.body.style.overflow = '';
        }
    };

    window.closeMenu = () => {
        if (menuOpen) {
            toggleMenu();
        }
    };

    // Initialize
    document.addEventListener('DOMContentLoaded', () => {
        const hamburger = $('hamburger');
        if (hamburger) {
            hamburger.onclick = toggleMenu;
        }

        // Close menu on navigation
        const navLinks = document.querySelectorAll('.sidebar .nav a');
        navLinks.forEach(link => {
            link.addEventListener('click', closeMenu);
        });

        // Close on backdrop click (mobile only)
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            document.addEventListener('click', (e) => {
                if (menuOpen &&
                    !sidebar.contains(e.target) &&
                    !$('hamburger').contains(e.target)) {
                    closeMenu();
                }
            });
        }
    });
})();



