/* =================================
   Admin Sidebar Toggle
   ================================= */

document.addEventListener('DOMContentLoaded', function () {
    const sidebar = document.getElementById('sidebar');
    const closeBtn = document.getElementById('closeBtn');
    const logoToggle = document.getElementById('logoToggle');

    // Ensure collapsed hover tooltips have content on all pages.
    document.querySelectorAll('#sidebar .menu-item').forEach(item => {
        const label = item.querySelector('span')?.textContent?.trim();
        if (label && !item.getAttribute('data-text')) {
            item.setAttribute('data-text', label);
        }
    });

    closeBtn?.addEventListener('click', function () {
        sidebar.classList.add('collapsed');
    });

    logoToggle?.addEventListener('click', function () {
        sidebar.classList.toggle('collapsed');
    });
});
