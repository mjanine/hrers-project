document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const logoToggle = document.getElementById('logoToggle');
    const closeBtn = document.getElementById('closeBtn');
    const menuItems = document.querySelectorAll('.menu-item');

    // 1. Tooltip Logic: Set data-text attribute automatically
    menuItems.forEach(item => {
        const span = item.querySelector("span");
        if (span) {
            item.setAttribute("data-text", span.textContent.trim());
        }
    });

    // 2. Sidebar Toggle Logic
    if (closeBtn) {
        closeBtn.onclick = () => sidebar.classList.add("collapsed");
    }
    if (logoToggle) {
        logoToggle.onclick = () => sidebar.classList.toggle("collapsed");
    }
});

function saveEmployee() {
    const Toast = Swal.mixin({
        toast: true,
        position: 'top',
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
        width: '450px', 
        background: '#fff',
        color: '#4a1d1d',
        iconColor: '#4a1d1d'
    });

    Toast.fire({
        icon: 'success',
        title: 'Employee Added!',
        text: 'The new record has been successfully created.'
    }).then(() => {
        window.location.href = 'hr_employeelist.html';
    });
}

function confirmCancel() {
    Swal.fire({
        title: 'Stop adding employee?',
        text: "Any data you've entered will be cleared.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#4a1d1d',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, stop',
        cancelButtonText: 'No, stay',
        width: '400px'
    }).then((result) => {
        if (result.isConfirmed) {
            window.location.href = 'hr_employeelist.html';
        }
    });
}