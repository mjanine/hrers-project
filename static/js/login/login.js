/* document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.querySelector('form');
    
    loginForm.addEventListener('submit', (e) => {

        e.preventDefault();

        // 2. Select the elements
        const emailInput = document.querySelector('input[type="text"]');
        const passwordInput = document.querySelector('input[type="password"]');
        const rememberMe = document.querySelector('input[type="checkbox"]');

        // 3. Get the values
        const email = emailInput.value;
        const password = passwordInput.value;
        const isRemembered = rememberMe.checked ? "Yes" : "No";

        // 4. Trigger the alert
        alert(
            `Login Attempt Details:\n` +
            `------------------------\n` +
            `Email/Username: ${email}\n` +
            `Password: ${password}\n` +
            `Remember Me: ${isRemembered}`
        );

        passwordInput.value = '';
    });
});
*/
