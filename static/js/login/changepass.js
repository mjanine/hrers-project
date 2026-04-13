document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("changePasswordForm");
    const currentPassword = document.getElementById("currentPassword");
    const newPassword = document.getElementById("newPassword");
    const confirmPassword = document.getElementById("confirmPassword");
    const passwordError = document.getElementById("passwordError");

    if (!form || !newPassword || !confirmPassword || !passwordError) {
        return;
    }

    function showError(message) {
        passwordError.textContent = message;
        passwordError.style.display = "block";
    }

    function clearError() {
        passwordError.textContent = "";
        passwordError.style.display = "none";
    }

    form.addEventListener("submit", function (event) {
        event.preventDefault();

        if (!currentPassword.value.trim()) {
            showError("Current password is required.");
            return;
        }

        if (newPassword.value.length < 8) {
            showError("New password must be at least 8 characters long.");
            return;
        }

        if (newPassword.value !== confirmPassword.value) {
            showError("New password and confirmation do not match.");
            return;
        }

        clearError();
        form.reset();
        alert("Password updated successfully.");
    });

    [currentPassword, newPassword, confirmPassword].forEach(function (field) {
        field.addEventListener("input", clearError);
    });
});