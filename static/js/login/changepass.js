const form = document.getElementById("passwordForm");
const oldPassword = document.getElementById("oldPassword");
const newPassword = document.getElementById("newPassword");

const lengthReq = document.getElementById("length");
const upperReq = document.getElementById("upper");
const specialReq = document.getElementById("special");
const matchReq = document.getElementById("match");

newPassword.addEventListener("input", validatePassword);

function validatePassword() {
    const value = newPassword.value;

    // 8+ characters
    if (value.length >= 8) {
        lengthReq.classList.replace("invalid", "valid");
    } else {
        lengthReq.classList.replace("valid", "invalid");
    }

    // Uppercase, lowercase, number
    if (/[A-Z]/.test(value) && /[a-z]/.test(value) && /[0-9]/.test(value)) {
        upperReq.classList.replace("invalid", "valid");
    } else {
        upperReq.classList.replace("valid", "invalid");
    }

    // Special character
    if (/[!@#$%^&*(),.?":{}|<>]/.test(value)) {
        specialReq.classList.replace("invalid", "valid");
    } else {
        specialReq.classList.replace("valid", "invalid");
    }

    // Not same as old password
    if (value !== oldPassword.value && value.length > 0) {
        matchReq.classList.replace("invalid", "valid");
    } else {
        matchReq.classList.replace("valid", "invalid");
    }
}

form.addEventListener("submit", function(e){
    e.preventDefault();
    alert("Password changed successfully!");
});