document.addEventListener("DOMContentLoaded", function () {
    const loginForm = document.getElementById("loginForm");
    const loginMessage = document.getElementById("loginMessage");
    const roleRedirectMap = {
        admin: "/templates/admin/dashboard.html",
        school_director: "/templates/sd/sd_dash.html",
        hr_evaluator: "/templates/hr/hr_dash.html",
        hr_head: "/templates/hr/hr_dash.html",
        department_head: "/templates/head/head_dash.html",
        employee: "/templates/employee/emp_dash.html",
    };

    if (!loginForm || !loginMessage) {
        return;
    }

    function showMessage(text, color) {
        loginMessage.textContent = text;
        loginMessage.style.display = "block";
        loginMessage.style.color = color;
    }

    loginForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const formData = new FormData(loginForm);
        const body = new URLSearchParams();
        body.set("username", formData.get("username"));
        body.set("password", formData.get("password"));

        try {
            const response = await fetch("/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: body.toString(),
            });

            const payload = await response.json();

            if (!response.ok) {
                showMessage(payload.detail || "Login failed.", "crimson");
                return;
            }

            localStorage.setItem("hrers_access_token", payload.access_token);
            localStorage.setItem("hrers_role", payload.role);
            showMessage("Login successful.", "green");

            const redirectTarget = roleRedirectMap[payload.role] || "/health";

            setTimeout(function () {
                window.location.href = redirectTarget;
            }, 500);
        } catch (error) {
            showMessage("Unable to reach the server.", "crimson");
        }
    });
});
