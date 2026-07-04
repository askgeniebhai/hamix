/**
 * HAMIX PLATFORM - APP CONTROLLER
 * Minimal JS for UI navigation and interactions
 */

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Icons
    if (window.lucide) {
        lucide.createIcons();
    }

    // --- NAVIGATION LOGIC ---
    const navItems = document.querySelectorAll('.sidebar-nav li');
    const pages = document.querySelectorAll('.page-content');
    const pageTitle = document.getElementById('currentPageTitle');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();

            const targetPage = item.getAttribute('data-page');
            if (!targetPage) return;

            // Update Sidebar Active State
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            // Update Page Visibility
            pages.forEach(page => {
                page.classList.remove('active');
                if (page.id === `page-${targetPage}`) {
                    page.classList.add('active');
                }
            });

            // Update Header Title
            const title = item.querySelector('span').textContent;
            pageTitle.textContent = title;

            // Handle Mobile - Close sidebar if needed (placeholder)
        });
    });

    // --- SEARCH BAR UI (Placeholder Interaction) ---
    const searchInput = document.querySelector('.search-container input');
    if (searchInput) {
        searchInput.addEventListener('focus', () => {
            searchInput.parentElement.style.boxShadow = '0 0 0 2px rgba(79, 70, 229, 0.2)';
        });
        searchInput.addEventListener('blur', () => {
            searchInput.parentElement.style.boxShadow = 'none';
        });
    }

    // --- REUSABLE UI COMPONENT ACTIONS (Placeholders) ---
    // Example: Click notification
    const notificationBtn = document.querySelector('.icon-btn');
    if (notificationBtn) {
        notificationBtn.addEventListener('click', () => {
            alert('Notifications functionality will be implemented in a future milestone.');
        });
    }

});
