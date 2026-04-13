document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById("sidebar");
    const logoToggle = document.getElementById("logoToggle");
    const closeBtn = document.getElementById("closeBtn");
    const menuItems = document.querySelectorAll(".menu-item");

    // 1. Sidebar Close Logic
    if (closeBtn) {
        closeBtn.addEventListener("click", () => {
            sidebar.classList.add("collapsed");
        });
    }

    // 2. Logo Toggle Logic (Handles both Open and Close)
    if (logoToggle) {
        logoToggle.addEventListener("click", () => {
            sidebar.classList.toggle("collapsed");
        });
    }

    // 3. Tooltip Initialization & Active State
    menuItems.forEach(item => {
        const span = item.querySelector("span");
        
        // Auto-fill the data-text attribute for CSS tooltips
        if (span) {
            item.setAttribute("data-text", span.innerText.trim());
        }

        // Handle Active State switching
        item.addEventListener("click", () => {
            const currentActive = document.querySelector(".menu-item.active");
            if (currentActive) {
                currentActive.classList.remove("active");
            }
            item.classList.add("active");
        });
    });
});