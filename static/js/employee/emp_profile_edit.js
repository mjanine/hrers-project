function setupProfileEditPage() {
    const sidebar = document.getElementById('sidebar');
    const logoToggle = document.getElementById('logoToggle');
    const closeBtn = document.getElementById('closeBtn');
    const menuItems = document.querySelectorAll('.menu-item');

    menuItems.forEach((item) => {
        const span = item.querySelector('span');
        if (span) item.setAttribute('data-text', span.innerText);
    });

    if (sidebar && logoToggle) logoToggle.addEventListener('click', () => sidebar.classList.toggle('close'));
    if (sidebar && closeBtn) closeBtn.addEventListener('click', () => sidebar.classList.add('close'));
}

function setValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value || '';
}

function renderDocumentAlerts(alerts) {
    const banner = document.getElementById('docAlertBanner');
    if (!banner) return;

    if (!Array.isArray(alerts) || alerts.length === 0) {
        banner.style.display = 'none';
        banner.textContent = '';
        return;
    }

    banner.style.display = 'block';
    banner.innerHTML = `<strong>Action needed:</strong> ${alerts[0].message || 'One or more documents need attention.'}`;
}

function renderUploadedDocuments(documents) {
    const tbody = document.getElementById('uploadedDocsBody');
    if (!tbody) return;

    if (!Array.isArray(documents) || documents.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:16px;">No uploaded documents yet.</td></tr>';
        return;
    }

    tbody.innerHTML = documents.map((doc) => {
        const safeName = doc.name || 'Document';
        const safeType = doc.type || 'FILE';
        const safeStatus = doc.status || 'Submitted';
        const safeDate = doc.dateUploaded || '--';
        const safeUrl = doc.url || '';
        return `
            <tr>
                <td>${safeName}</td>
                <td>${safeType}</td>
                <td>${safeStatus}</td>
                <td>${safeDate}</td>
                <td>${safeUrl ? `<a href="${safeUrl}" target="_blank">View</a>` : '---'}</td>
            </tr>
        `;
    }).join('');
}

async function loadProfileEditData() {
    try {
        const response = await fetch('/api/profile/me');
        if (!response.ok) return;
        const profile = await response.json();

        setValue('firstName', profile.firstName || '');
        setValue('lastName', profile.lastName || '');
        setValue('empID', profile.employeeNo || profile.id || '');
        setValue('empStatus', profile.isActive ? 'Active' : 'Inactive');
        setValue('empType', profile.employmentType || 'Full-time');
        setValue('dept', profile.department || '');
        setValue('pos', profile.position || profile.roleLabel || '');
        setValue('dateHired', profile.dateHired || '');
        setValue('email', profile.email || '');
        setValue('contact', profile.contactNumber || '');
        setValue('address', profile.address || '');
        setValue('emergencyName', profile.emergencyName || '');
        setValue('emergencyPhone', profile.emergencyPhone || '');

        renderDocumentAlerts(profile.documentAlerts || []);
        renderUploadedDocuments(profile.documents || []);
    } catch (error) {
    }
}

async function submitProfileUpdate() {
    const formData = new FormData();
    formData.set('firstName', document.getElementById('firstName')?.value || '');
    formData.set('lastName', document.getElementById('lastName')?.value || '');
    formData.set('email', document.getElementById('email')?.value || '');
    formData.set('contactNumber', document.getElementById('contact')?.value || '');
    formData.set('address', document.getElementById('address')?.value || '');
    formData.set('emergencyName', document.getElementById('emergencyName')?.value || '');
    formData.set('emergencyPhone', document.getElementById('emergencyPhone')?.value || '');

    const response = await fetch('/api/profile/me', {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        const payload = await response.json().catch(() => ({ detail: 'Unable to update profile.' }));
        throw new Error(payload.detail || 'Unable to update profile.');
    }
}

function updateEProfile() {
    submitProfileUpdate()
        .then(() => {
            if (window.Swal) {
                const Toast = Swal.mixin({
                    toast: true,
                    position: 'top',
                    showConfirmButton: false,
                    timer: 1800,
                    timerProgressBar: true,
                    width: '450px',
                    background: '#fff',
                    color: '#4a1d1d',
                    iconColor: '#4a1d1d',
                });
                return Toast.fire({ icon: 'success', title: 'Success!', text: 'Employee profile has been updated.' });
            }
            return Promise.resolve();
        })
        .then(() => {
            window.location.href = 'emp_profile_view.html';
        })
        .catch((error) => {
            if (window.Swal) {
                Swal.fire({ icon: 'error', title: 'Update failed', text: error.message || 'Unable to update profile.' });
            } else {
                alert(error.message || 'Unable to update profile.');
            }
        });
}

async function uploadDocument() {
    const fileInput = document.getElementById('documentFile');
    const nameInput = document.getElementById('documentName');
    const typeInput = document.getElementById('documentType');

    const file = fileInput?.files?.[0];
    if (!file) {
        const message = 'Please select a file to upload.';
        if (window.Swal) {
            return Swal.fire({ icon: 'warning', title: 'Missing file', text: message });
        }
        return alert(message);
    }

    const formData = new FormData();
    formData.append('document_file', file);
    if (nameInput?.value) formData.append('document_name', nameInput.value.trim());
    if (typeInput?.value) formData.append('document_type', typeInput.value.trim());

    const response = await fetch('/api/profile/documents', {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        const payload = await response.json().catch(() => ({ detail: 'Unable to upload document.' }));
        throw new Error(payload.detail || 'Unable to upload document.');
    }

    if (fileInput) fileInput.value = '';
    if (nameInput) nameInput.value = '';
    if (typeInput) typeInput.value = '';

    await loadProfileEditData();
}

function cancelEEdit() { 
    Swal.fire({
        title: 'Discard changes?',
        text: "Any unsaved information will be lost.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#4a1d1d',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, discard',
        cancelButtonText: 'No',
        width: '400px',
        padding: '1rem',
        customClass: {
            title: 'small-swal-title',
            htmlContainer: 'small-swal-text'
        }
    }).then((result) => {
        if (result.isConfirmed) {
            window.location.href = 'emp_profile_view.html';
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    setupProfileEditPage();
    loadProfileEditData();

    const uploadBtn = document.getElementById('uploadDocumentBtn');
    if (uploadBtn) {
        uploadBtn.addEventListener('click', () => {
            uploadDocument().then(() => {
                if (window.Swal) {
                    Swal.fire({ icon: 'success', title: 'Uploaded', text: 'Your document was uploaded successfully.' });
                }
            }).catch((error) => {
                if (window.Swal) {
                    Swal.fire({ icon: 'error', title: 'Upload failed', text: error.message || 'Unable to upload document.' });
                } else {
                    alert(error.message || 'Unable to upload document.');
                }
            });
        });
    }
});