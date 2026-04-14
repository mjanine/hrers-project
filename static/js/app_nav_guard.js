document.addEventListener("DOMContentLoaded", function () {
    const menuLinks = document.querySelectorAll("a.menu-item[href]");

    menuLinks.forEach(function (link) {
        const href = (link.getAttribute("href") || "").trim();
        if (!href || href === "#") {
            return;
        }

        const isLogout = link.classList.contains("logout") || /login\.html$/i.test(href);
        if (isLogout) {
            link.setAttribute("href", "/auth/logout");
            link.addEventListener("click", function () {
                localStorage.removeItem("hrers_access_token");
                localStorage.removeItem("hrers_role");
            });
            return;
        }

        if (/^https?:\/\//i.test(href) || href.startsWith("/static/") || href.startsWith("mailto:")) {
            return;
        }

        const match = href.match(/([a-zA-Z0-9_]+\.html)$/);
        if (!match) {
            return;
        }

        const fileName = match[1];
        const sectionPrefix = fileName.split("_")[0].toLowerCase();
        const sectionMap = {
            admin: "admin",
            sd: "sd",
            hr: "hr",
            head: "head",
            emp: "employee",
        };

        const section = sectionMap[sectionPrefix];
        if (section) {
            link.setAttribute("href", "/templates/" + section + "/" + fileName);
        }
    });
});