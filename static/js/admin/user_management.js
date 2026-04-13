/* =================================
   User Management JavaScript
   ================================= */

console.log("User Management JS Loaded - Version 4. If you do not see this, YOUR BROWSER IS CACHING THE OLD FILE!");

let currentEditingUserId = null;
let selectedUsers = [];
let confirmedAction = null; // To store the action for the confirm modal

document.addEventListener('DOMContentLoaded', function() {
    initializeUserManagement();
});

function initializeUserManagement() {
    setupEventListeners();
    setupFilterListeners();
    setupTableCheckboxes();
    updateSelectedUsers(); // Initialize bulk actions visibility
}

function setupEventListeners() {
    // Create User Button
    // Ultimate failsafe: Listen to the whole page and catch clicks on the button or its icons
    document.body.addEventListener('click', function(e) {
        const createBtn = e.target.closest('#createUserBtn, [onclick*="openUserModal"]');
        if (createBtn) {
            e.preventDefault();
            openUserModal();
        }
    });

    // Edit User Links
    document.querySelectorAll('.edit-user').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const userId = this.dataset.userId;
            editUser(userId);
        });
    });

    // Assign Role Links
    document.querySelectorAll('.assign-role').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const userId = this.dataset.userId;
            const userName = this.dataset.userName;
            const currentRole = this.dataset.currentRole;
            const currentDepartment = this.dataset.currentDepartment;
            openAssignRoleModal(userId, userName, currentRole, currentDepartment);
        });
    });

    // Lock/Unlock User
    document.querySelectorAll('.lock-user').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const userId = this.dataset.userId;
            confirmUserStatusChange(userId, 'lock');
        });
    });
    document.querySelectorAll('.unlock-user').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const userId = this.dataset.userId;
            confirmUserStatusChange(userId, 'unlock');
        });
    });
    // Reset Password Links
    document.querySelectorAll('.reset-password').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const userId = this.dataset.userId;
            const userName = this.dataset.userName;
            openResetPasswordModal(userId, userName);
        });
    });

    // Activate/Deactivate User
    document.querySelectorAll('.deactivate-user, .activate-user').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const userId = this.dataset.userId;
            const action = this.classList.contains('deactivate-user') ? 'deactivate' : 'activate'; // This line is redundant now, as I've separated the event listeners.
            confirmUserStatusChange(userId, action);
        });
    });

    // Delete User
    document.querySelectorAll('.delete-user').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const userId = this.dataset.userId;
            confirmDeleteUser(userId);
        });
    });

    // Modal Close Buttons
    document.querySelectorAll('.modal .close').forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal').classList.remove('show');
        });
    });

    // Form Submissions
    document.getElementById('userForm')?.addEventListener('submit', handleUserFormSubmit);
    document.getElementById('assignRoleForm')?.addEventListener('submit', handleAssignRoleSubmit);
    document.getElementById('resetPasswordForm')?.addEventListener('submit', handleResetPasswordSubmit);

    // Password strength indicator
    document.getElementById('newPassword')?.addEventListener('input', updatePasswordStrength);
    document.getElementById('password')?.addEventListener('input', updatePasswordStrengthForCreateEdit); // For create/edit user modal

    // Department filter for create/edit user modal
document.getElementById('role')?.addEventListener('change', function() {
    const deptGroup = document.getElementById('departmentSelectGroupUserModal');
    const deptSelect = document.getElementById('departmentUserModal');

    if (deptGroup && deptSelect) {
        // Use 'HEAD' (Uppercase) to match your Django Choices
        if (this.value === 'HEAD' || this.value === 'EMPLOYEE') { 
            deptGroup.style.display = 'block';
            deptSelect.required = true;
        } else {
            deptGroup.style.display = 'none';
            deptSelect.required = false;
        }
    }
});

   // Department filter for create/edit user modal
document.getElementById('role')?.addEventListener('change', function() {
    const deptGroup = document.getElementById('departmentSelectGroupUserModal');
    
    if (deptGroup) {
        // Change to lowercase 'head' or 'employee' to match the HTML above!
        if (this.value === 'head' || this.value === 'employee') { 
            deptGroup.style.display = 'block';
        } else {
            deptGroup.style.display = 'none';
        }
    }
});

    // Bulk Actions
    document.getElementById('bulkDeactivate')?.addEventListener('click', bulkDeactivateUsers);
    document.getElementById('bulkActivate')?.addEventListener('click', bulkActivateUsers);
    document.getElementById('bulkDelete')?.addEventListener('click', bulkDeleteUsers);

    document.getElementById('bulkLock')?.addEventListener('click', bulkLockUsers);
    document.getElementById('bulkUnlock')?.addEventListener('click', bulkUnlockUsers);

    // Confirm Modal Button
    document.getElementById('confirmBtn')?.addEventListener('click', executeConfirmedAction);
}

function setupFilterListeners() {
    document.getElementById('userSearch')?.addEventListener('keyup', debounce(applyFilters, 300));
    document.getElementById('roleFilter')?.addEventListener('change', applyFilters);
    document.getElementById('statusFilter')?.addEventListener('change', applyFilters);
    document.getElementById('departmentFilter')?.addEventListener('change', applyFilters);
    document.getElementById('applyFiltersBtn')?.addEventListener('click', applyFilters);
    document.getElementById('clearFiltersBtn')?.addEventListener('click', clearFilters);
}

function setupTableCheckboxes() {
    const selectAllCheckbox = document.getElementById('selectAll');
    const userCheckboxes = document.querySelectorAll('.user-checkbox');

    selectAllCheckbox?.addEventListener('change', function() {
        userCheckboxes.forEach(cb => {
            cb.checked = this.checked;
        });
        updateSelectedUsers();
    });

    userCheckboxes.forEach(cb => {
        cb.addEventListener('change', updateSelectedUsers);
    });
}

function updateSelectedUsers() {
    const checkboxes = document.querySelectorAll('.user-checkbox:checked');
    selectedUsers = Array.from(checkboxes).map(cb => 
        cb.closest('tr').dataset.userId
    );

    const bulkActionsDiv = document.getElementById('bulkActions');
    if (selectedUsers.length > 0) {
        bulkActionsDiv.style.display = 'flex';
        document.getElementById('selectedCount').textContent = 
            `${selectedUsers.length} selected`;
    } else {
        bulkActionsDiv.style.display = 'none';
    }
}

function openUserModal() {
    console.log("1. Button clicked! Trying to open modal...");

    const modal = document.getElementById('userModal');
    if (!modal) {
        console.error("ERROR: Cannot find the modal HTML. Did the ID get deleted?");
        alert("Developer Error: Modal not found. Check F12 Console.");
        return;
    }

    // --- ADD THESE 3 LINES TO FIX THE 0x0 SIZE PROBLEM ---
    modal.style.setProperty('display', 'flex', 'important');
    modal.style.setProperty('width', '100vw', 'important');
    modal.style.setProperty('height', '100vh', 'important');

    const form = document.getElementById('userForm');
    if (form) form.reset(); // Clear out any old text

    // Reset hidden fields and titles safely
    const titleField = document.getElementById('modalTitle');
    if (titleField) titleField.textContent = 'Create New User';

    const userIdField = document.getElementById('userIdForEdit');
    if (userIdField) userIdField.value = '';

    // Hide the department dropdown for new users safely
    const deptGroup = document.getElementById('departmentSelectGroupUserModal');
    if (deptGroup) deptGroup.style.display = 'none';

    // Finally, force it to show!
    modal.classList.add('show');
    console.log("2. Modal opened successfully!");
}
// Make the function globally available so the inline `onclick="openUserModal()"` attribute can find it.
window.openUserModal = openUserModal;


function closeUserModal() {
    document.getElementById('userModal').style.display = 'none';
}

async function editUser(userId) {
    currentEditingUserId = userId;
    
    // Fetch user data from the backend (AJAX)
    try {
        const response = await fetch(`/accounts/get-user-data/${userId}/`); // Changed to get_user_data
        if (!response.ok) {
            throw new Error('Failed to fetch user data.');
        }
        const userData = await response.json();

        if (document.getElementById('firstName')) document.getElementById('firstName').value = userData.first_name || '';
        if (document.getElementById('lastName')) document.getElementById('lastName').value = userData.last_name || '';
        if (document.getElementById('email')) document.getElementById('email').value = userData.email || '';
        if (document.getElementById('username')) document.getElementById('username').value = userData.username || '';
        if (document.getElementById('role')) document.getElementById('role').value = userData.role || '';
        if (document.getElementById('userIdForEdit')) document.getElementById('userIdForEdit').value = userId;

        // Password fields are not required for edit unless explicitly changing
            const pwdField = document.getElementById('password1'); // Updated ID
            const confirmPwdField = document.getElementById('password2'); // Updated ID

            if (pwdField) {
                pwdField.required = false;
                pwdField.value = '';
            }
            if (confirmPwdField) {
                confirmPwdField.required = false;
                confirmPwdField.value = '';
            }

        // Handle department for HEAD role
        const deptGroup = document.getElementById('departmentSelectGroupUserModal');
        if (userData.role === 'HEAD') {
            deptGroup.style.display = 'block';
            document.getElementById('departmentUserModal').required = true;
            document.getElementById('departmentUserModal').value = userData.department_id || '';
        } else {
            deptGroup.style.display = 'none';
            document.getElementById('departmentUserModal').required = false;
            document.getElementById('departmentUserModal').value = '';
        }

    document.getElementById('modalTitle').textContent = 'Edit User';
    document.getElementById('userModal').style.display = 'flex';

    } catch (error) {
        console.error('Error fetching user data:', error);
        showAlert('Error fetching user data.', 'danger');
    }
}

function openAssignRoleModal(userId, userName, currentRole, currentDepartment) {
    
    document.getElementById('assignRoleUserId').value = userId;
    document.getElementById('userNameDisplay').textContent = `User: ${userName}`;
    document.getElementById('newRole').value = currentRole;

    const deptGroup = document.getElementById('departmentSelectGroup');
    if (currentRole === 'HEAD') {
        deptGroup.style.display = 'block';
        document.getElementById('newDepartment').required = true;
        document.getElementById('newDepartment').value = currentDepartment || '';
    } else {
        deptGroup.style.display = 'none';
        document.getElementById('newDepartment').required = false;
        document.getElementById('newDepartment').value = '';
    }
    document.getElementById('assignRoleModal').style.display = 'flex';
}

function closeAssignRoleModal() {
    document.getElementById('assignRoleModal').style.display = 'none';
}

function openResetPasswordModal(userId, userName) {
    
    document.getElementById('resetUserId').value = userId;
    document.getElementById('resetUserDisplay').textContent = `User: ${userName}`;
    document.getElementById('resetPasswordForm').reset();
    document.getElementById('strengthIndicator').textContent = 'Weak';
    document.getElementById('strengthIndicator').className = 'weak';
    document.getElementById('resetPasswordModal').style.display = 'flex';
}

function closeResetPasswordModal() {
    document.getElementById('resetPasswordModal').style.display = 'none';
}

function closeConfirmModal() {
    document.getElementById('confirmModal').classList.remove('show');
    confirmedAction = null; // Clear the stored action
}

async function handleUserFormSubmit(e) {
    e.preventDefault();

    const form = e.target;
    const formData = new FormData(form);
    const userId = document.getElementById('userIdForEdit').value;

    // Grab whatever the HTML input names are (usually password / confirm_password)
    const pwd = formData.get('password') || formData.get('password1');
    const confirmPwd = formData.get('confirm_password') || formData.get('confirmPassword') || formData.get('password2');

    // Force them into the names Django's CustomUserCreationForm expects
    if (pwd) formData.set('password1', pwd);
    if (confirmPwd) formData.set('password2', confirmPwd);

    // Validation
    if (pwd && pwd !== confirmPwd) {
        showAlert('Passwords do not match!', 'danger');
        return;
    }
    
    // Safety check: only check length if password actually exists
    if (pwd && pwd.length < 8) {
        showAlert('Password must be at least 8 characters long!', 'danger');
        return;
    }

    const url = userId ? `/accounts/edit-user/${userId}/` : '/accounts/create-user/';

    try {
        const response = await fetch(url, {
            method: 'POST',
            body: formData,
            headers: {
                'X-CSRFToken': getCookie('csrftoken')
            }
        });

        const data = await response.json();

        if (response.ok) {
            showAlert(data.message, 'success');
            closeUserModal();
            location.reload();
        } else {
            showAlert(data.message || 'An error occurred.', 'danger');
            if (data.errors) {
                console.error('Form errors:', data.errors);
                for (const field in data.errors) {
                    const errorList = data.errors[field];
                    // If Django returns an object, we get the message string
                    errorList.forEach(error => {
                        const msg = typeof error === 'string' ? error : error.message;
                        showAlert(`${field}: ${msg}`, 'danger');
                    });
                }
            }
        }
    } catch (error) {
        console.error('Error submitting user form:', error);
        showAlert('An unexpected error occurred.', 'danger');
    }
}

async function handleAssignRoleSubmit(e) {
    e.preventDefault();

    const form = e.target;
    const formData = new FormData(form);

    if (!formData.get('role')) {
        showAlert('Please select a role!', 'danger');
        return;
    }

    if (formData.get('role') === 'HEAD' && !formData.get('department')) {
        showAlert('Please select a department for department heads!', 'danger');
        return;
    }

    try {
        const response = await fetch('/accounts/assign-role/', {
            method: 'POST',
            body: formData,
            headers: {
                'X-CSRFToken': getCookie('csrftoken')
            }
        });

        const data = await response.json();

        if (response.ok) {
            showAlert(data.message, 'success');
            closeAssignRoleModal();
            location.reload();
        } else {
            showAlert(data.message || 'An error occurred.', 'danger');
            if (data.errors) {
                for (const field in data.errors) {
                    const errorList = data.errors[field];
                    errorList.forEach(error => showAlert(`${field}: ${error.message}`, 'danger'));
                }
            }
        }
    } catch (error) {
        console.error('Error assigning role:', error);
        showAlert('An unexpected error occurred.', 'danger');
    }
}

async function handleResetPasswordSubmit(e) {
    e.preventDefault();

    const form = e.target;
    const formData = new FormData(form);

    const newPassword = formData.get('new_password1');
    const confirmPassword = formData.get('new_password2');

    if (newPassword !== confirmPassword) {
        showAlert('Passwords do not match!', 'danger');
        return;
    }
    if (newPassword.length < 8) {
        showAlert('Password must be at least 8 characters long!', 'danger');
        return;
    }

    try {
        const response = await fetch('/accounts/reset-password/', {
            method: 'POST',
            body: formData,
            headers: {
                'X-CSRFToken': getCookie('csrftoken')
            }
        });

        const data = await response.json();

        if (response.ok) {
            showAlert(data.message, 'success');
            closeResetPasswordModal();
        } else {
            showAlert(data.message || 'An error occurred.', 'danger');
            if (data.errors) {
                for (const field in data.errors) {
                    const errorList = data.errors[field];
                    errorList.forEach(error => showAlert(`${field}: ${error.message}`, 'danger'));
                }
            }
        }
    } catch (error) {
        console.error('Error resetting password:', error);
        showAlert('An unexpected error occurred.', 'danger');
    }
}

function updatePasswordStrength(e) {
    const password = e.target.value;
    const indicator = document.getElementById('strengthIndicator');
    updatePasswordStrengthDisplay(password, indicator);
}

function updatePasswordStrengthForCreateEdit(e) {
    // This function is for the create/edit user modal's password fields
    // It doesn't have a dedicated strength indicator in the HTML, so we'll just log for now
    const password = e.target.value;
    // You might want to add a strength indicator to the create/edit modal as well
    // For now, this is a placeholder.
    console.log('Password strength for create/edit:', getPasswordStrength(password));
}

function getPasswordStrength(password) {
    if (!password) return 0;

    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumbers = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~]/.test(password);

    const strength = [
        password.length >= 8,
        hasUppercase,
        hasLowercase,
        hasNumbers,
        hasSpecial
    ].filter(Boolean).length;

    return strength;
}

function updatePasswordStrengthDisplay(password, indicator) {
    const strength = getPasswordStrength(password);
    
    if (strength <= 2) {
        indicator.textContent = 'Weak';
        indicator.className = 'weak';
    } else if (strength <= 3) {
        indicator.textContent = 'Medium';
        indicator.className = 'medium';
    } else {
        indicator.textContent = 'Strong';
        indicator.className = 'strong';
    }
}

function applyFilters() {
    const searchTerm = document.getElementById('userSearch').value;
    const roleFilter = document.getElementById('roleFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;
    const departmentFilter = document.getElementById('departmentFilter').value;

    const url = new URL(window.location.href);
    url.searchParams.set('search', searchTerm);
    url.searchParams.set('role', roleFilter);
    url.searchParams.set('status', statusFilter);
    url.searchParams.set('department', departmentFilter);
    
    window.location.href = url.toString(); // Reload page with filters
}

function clearFilters() {
    window.location.href = window.location.pathname; // Reload page without filters
}

function confirmUserStatusChange(userId, action) {
    const modal = document.getElementById('confirmModal');
    const message = document.getElementById('confirmMessage');
    
    let actionText = '';
    if (action === 'deactivate') actionText = 'deactivate';
    else if (action === 'activate') actionText = 'activate';
    else if (action === 'lock') actionText = 'lock';
    else if (action === 'unlock') actionText = 'unlock';

    message.textContent = `Are you sure you want to ${actionText} this user account?`;
    
    confirmedAction = { type: 'single', action: action, userId: userId };
    modal.style.display = 'flex'; 

    console.log("2. Modal opened successfully!");
}

// And for closing:
function closeUserModal() {
    document.getElementById('userModal').style.display = 'none';
}

async function performSingleAction(action, userId) {
    try {
        const formData = new FormData();
        formData.append('user_ids[]', userId);
        formData.append('action', action);

        const response = await fetch('/accounts/update-account-status/', {
            method: 'POST',
            body: formData,
            headers: {
                'X-CSRFToken': getCookie('csrftoken')
            }
        });

        const data = await response.json();

        if (response.ok) {
            showAlert(data.message, 'success');
            location.reload();
        } else {
            showAlert(data.message || 'An error occurred.', 'danger');
        }
    } catch (error) {
        console.error(`Error performing ${action} action:`, error);
        showAlert('An unexpected error occurred.', 'danger');
    }
}

function confirmDeleteUser(userId) {
    const modal = document.getElementById('confirmModal');
    const message = document.getElementById('confirmMessage');
    
    message.textContent = 'Are you sure you want to delete this user? This action cannot be undone.';
    
    confirmedAction = { type: 'single', action: 'delete', userId: userId };
    modal.style.display = 'flex';
}

async function performSingleDelete(userId) {
    try {
        const formData = new FormData();
        formData.append('user_ids[]', userId);

        const response = await fetch('/accounts/delete-user/', {
            method: 'POST',
            body: formData,
            headers: {
                'X-CSRFToken': getCookie('csrftoken')
            }
        });

        const data = await response.json();

        if (response.ok) {
            showAlert(data.message, 'success');
            location.reload();
        } else {
            showAlert(data.message || 'An error occurred.', 'danger');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        showAlert('An unexpected error occurred.', 'danger');
    }
}

function bulkDeactivateUsers() {
    if (selectedUsers.length === 0) return;
    
    const modal = document.getElementById('confirmModal');
    const message = document.getElementById('confirmMessage');
    
    message.textContent = `Are you sure you want to deactivate ${selectedUsers.length} user(s)?`;
    confirmedAction = { type: 'bulk', action: 'deactivate', userIds: selectedUsers };
    modal.classList.add('show');
}

function bulkActivateUsers() {
    if (selectedUsers.length === 0) return;
    
    const modal = document.getElementById('confirmModal');
    const message = document.getElementById('confirmMessage');
    
    message.textContent = `Are you sure you want to activate ${selectedUsers.length} user(s)?`;
    confirmedAction = { type: 'bulk', action: 'activate', userIds: selectedUsers };
    modal.classList.add('show');
}

function bulkLockUsers() {
    if (selectedUsers.length === 0) return;
    
    const modal = document.getElementById('confirmModal');
    const message = document.getElementById('confirmMessage');
    
    message.textContent = `Are you sure you want to lock ${selectedUsers.length} user(s)?`;
    confirmedAction = { type: 'bulk', action: 'lock', userIds: selectedUsers };
    modal.classList.add('show');
}

function bulkUnlockUsers() {
    if (selectedUsers.length === 0) return;
    
    const modal = document.getElementById('confirmModal');
    const message = document.getElementById('confirmMessage');
    
    message.textContent = `Are you sure you want to unlock ${selectedUsers.length} user(s)?`;
    confirmedAction = { type: 'bulk', action: 'unlock', userIds: selectedUsers };
    modal.classList.add('show');
}

function bulkDeleteUsers() {
    if (selectedUsers.length === 0) return;
    
    const modal = document.getElementById('confirmModal');
    const message = document.getElementById('confirmMessage');
    
    message.textContent = `Are you sure you want to delete ${selectedUsers.length} user(s)? This action cannot be undone.`;
    confirmedAction = { type: 'bulk', action: 'delete', userIds: selectedUsers };
    modal.classList.add('show');
}

async function performBulkAction(action, userIds) {
    try {
        const formData = new FormData();
        userIds.forEach(id => formData.append('user_ids[]', id));
        formData.append('action', action);

        const url = (action === 'delete') ? '/accounts/delete-user/' : '/accounts/update-account-status/';

        const response = await fetch(url, {
            method: 'POST',
            body: formData,
            headers: {
                'X-CSRFToken': getCookie('csrftoken')
            }
        });

        const data = await response.json();

        if (response.ok) {
            showAlert(data.message, 'success');
            location.reload();
        } else {
            showAlert(data.message || 'An error occurred.', 'danger');
        }
    } catch (error) {
        console.error(`Error performing bulk ${action} action:`, error);
        showAlert('An unexpected error occurred.', 'danger');
    }
}

function executeConfirmedAction() {
    if (!confirmedAction) return;

    closeConfirmModal(); // Close the confirm modal immediately

    if (confirmedAction.type === 'single') {
        if (confirmedAction.action === 'delete') {
            performSingleDelete(confirmedAction.userId);
        } else {
            performSingleAction(confirmedAction.action, confirmedAction.userId);
        }
    } else if (confirmedAction.type === 'bulk') {
        performBulkAction(confirmedAction.action, confirmedAction.userIds);
    }
}

function toggleDropdown(button) {
    const dropdown = button.closest('.action-cell');
    
    // Close all other dropdowns
    document.querySelectorAll('.action-cell.open').forEach(d => {
        if (d !== dropdown) d.classList.remove('open');
    });

    dropdown.classList.toggle('open');
}

// Close dropdowns when clicking outside
document.addEventListener('click', function(e) {
    if (!e.target.closest('.action-cell')) {
        document.querySelectorAll('.action-cell.open').forEach(d => {
            d.classList.remove('open');
        });
    }
});

// Helper function to get CSRF token
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// Debounce function for search input
function debounce(func, delay) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}

function showAlert(message, type = 'info') {
    let alertContainer = document.getElementById('toastContainer');
    if (!alertContainer) {
        alertContainer = document.createElement('div');
        alertContainer.id = 'toastContainer';
        alertContainer.style.position = 'fixed';
        alertContainer.style.top = '32px';
        alertContainer.style.right = '32px';
        alertContainer.style.zIndex = '2000';
        alertContainer.style.display = 'flex';
        alertContainer.style.flexDirection = 'column';
        alertContainer.style.gap = '12px';
        alertContainer.style.maxWidth = '420px';
        alertContainer.style.width = 'min(420px, calc(100vw - 40px))';
        alertContainer.style.pointerEvents = 'none';
        document.body.appendChild(alertContainer);
    }

    const alert = document.createElement('div');
    alert.className = `alert ${type}`;
    alert.innerHTML = `<i class="fas fa-info-circle"></i> <span>${message}</span>`;
    alert.style.maxWidth = '400px';
    alert.style.margin = '0';
    alert.style.pointerEvents = 'auto';
    
    alertContainer.appendChild(alert);
    
    setTimeout(() => {
        alert.remove();

        if (alertContainer && !alertContainer.children.length) {
            alertContainer.remove();
        }
    }, 3000);
}
// This "pairs" your Save Button to your Saving Logic
document.addEventListener('DOMContentLoaded', function() {
    const userForm = document.getElementById('userForm');
    
    if (userForm) {
        // This tells the form: "When Save is clicked, run handleUserFormSubmit"
        userForm.addEventListener('submit', handleUserFormSubmit);
        console.log("PAIRED: Save button is now connected to the code!");
    } else {
        console.error("ERROR: Could not find the form with ID 'userForm'!");
    }
});