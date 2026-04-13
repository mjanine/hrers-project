const sidebar = document.getElementById("sidebar");
const logoToggle = document.getElementById("logoToggle");
const closeBtn = document.getElementById("closeBtn");
const menuItems = document.querySelectorAll(".menu-item");

// Close button (only when expanded)
closeBtn.addEventListener("click", () => {
    sidebar.classList.add("collapsed");
});

// Open via logo hover click
logoToggle.addEventListener("click", () => {
    if (sidebar.classList.contains("collapsed")) {
        sidebar.classList.remove("collapsed");
    }
});

// Tooltip text
menuItems.forEach(item => {
    const text = item.querySelector("span").innerText;
    item.setAttribute("data-text", text);

    item.addEventListener("click", () => {
        document.querySelector(".menu-item.active")?.classList.remove("active");
        item.classList.add("active");
    });
});