const sendBtn = document.getElementById("sendBtn");
const backLogin = document.getElementById("backLogin");
const emailInput = document.getElementById("email");
const message = document.getElementById("message");

sendBtn.addEventListener("click", function() {

    const email = emailInput.value.trim();

    if (email === "") {
        message.style.display = "block";
        message.style.color = "red";
        message.innerText = "Please enter your email address.";
        return;
    }

    const emailPattern = /^[^ ]+@[^ ]+\.[a-z]{2,3}$/;

    if (!email.match(emailPattern)) {
        message.style.display = "block";
        message.style.color = "red";
        message.innerText = "Please enter a valid email address.";
        return;
    }

    message.style.display = "block";
    message.style.color = "green";
    message.innerText = "Password reset link has been sent to your email!";
});

backLogin.addEventListener("click", function() {
    alert("Redirecting to login page...");
    // Example redirect:
    // window.location.href = "login.html";
});