document.addEventListener('DOMContentLoaded', () => {
    // --- SIDEBAR ELEMENTS ---
    const sidebar = document.getElementById('sidebar');
    const closeBtn = document.getElementById('closeBtn');
    const logoToggle = document.getElementById('logoToggle');
    const menuItems = document.querySelectorAll(".menu-item");

    // --- SIDEBAR TOOLTIPS (For Collapsed Mode) ---
    menuItems.forEach(item => {
        const span = item.querySelector("span");
        if (span) {
            item.setAttribute("data-text", span.innerText);
        }
    });

    // --- SIDEBAR TOGGLE LOGIC ---
    if (sidebar) {
        if (closeBtn) {
            closeBtn.onclick = () => sidebar.classList.toggle('close');
        }
        if (logoToggle) {
            logoToggle.onclick = () => sidebar.classList.toggle('close');
        }
    }

    // --- TAB SWITCHING LOGIC ---
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content-item');

    tabs.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-tab');
            const targetContent = document.getElementById(targetId);

            if (targetContent) {
                // Remove active classes from all tabs and contents
                tabs.forEach(t => t.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));

                // Add active class to clicked tab and corresponding content
                btn.classList.add('active');
                targetContent.classList.add('active');
            }
        });
    });
});