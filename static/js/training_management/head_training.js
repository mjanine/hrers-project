/* ============================================================
   head_training.js
   Path: static/js/training_management/head_training.js
   ============================================================ */

// ── State ─────────────────────────────────────────────────────────────
let myTrainings = [];       // registered trainings for this user
let activeCardData = null;  // data of the card currently open in modal

// ── DOM References ────────────────────────────────────────────────────
const sidebar        = document.getElementById('sidebar');
const logoToggle     = document.getElementById('logoToggle');
const closeBtn       = document.getElementById('closeBtn');
const menuItems      = document.querySelectorAll('.menu-item');
const modalOverlay   = document.getElementById('modalOverlay');
const btnCloseModal  = document.getElementById('btnCloseModal');
const btnRegister    = document.getElementById('btnRegisterModal');
const myTrainingsList = document.getElementById('myTrainingsList');

// ── Sidebar: collapse / expand ────────────────────────────────────────
closeBtn.addEventListener('click', () => {
    sidebar.classList.add('collapsed');
});

logoToggle.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
});

// ── Sidebar: tooltip data-text + active state ─────────────────────────
menuItems.forEach(item => {
    const text = item.querySelector('span')?.innerText;
    if (text) item.setAttribute('data-text', text);

    item.addEventListener('click', () => {
        document.querySelector('.menu-item.active')?.classList.remove('active');
        item.classList.add('active');

        // Handle navigation for sidebar menu items
        const targetUrl = item.getAttribute('href');
        // If href is a placeholder like '#', check for a data-target-url attribute
        if (targetUrl === '#' || !targetUrl) {
            const dataTargetUrl = item.dataset.targetUrl;
            if (dataTargetUrl) {
                window.location.href = dataTargetUrl;
            }
        } else if (targetUrl) { // If href is a valid URL, navigate
            window.location.href = targetUrl;
        }
    });
});

// ── Training Cards: open modal on card click, skip register button ─────
document.querySelectorAll('.training-card').forEach(card => {
    card.addEventListener('click', (e) => {
        if (e.target.classList.contains('register-btn')) {
            // Register button clicked directly on the card
            handleRegister(card.dataset, card);
            return;
        }
        openModal(card.dataset, card);
    });
});

// ── Open Modal ────────────────────────────────────────────────────────
function openModal(data, card) {
    activeCardData = { data, card };

    document.getElementById('modal-title').textContent       = data.title;
    document.getElementById('modal-meta').innerHTML          =
        `${data.category} <span>|</span> ${data.type} <span>|</span> ${data.date}`;
    document.getElementById('modal-status').textContent      = data.status;
    document.getElementById('modal-description').textContent = data.description;
    document.getElementById('modal-provider').textContent    = data.provider;
    document.getElementById('modal-location').textContent    = data.location;
    document.getElementById('modal-contact').textContent     = data.contact;
    document.getElementById('modal-slots').textContent       = data.slots;

    // Sync register button state with card
    const alreadyRegistered = myTrainings.some(t => t.title === data.title);
    if (alreadyRegistered) {
        btnRegister.textContent = 'Registered ✓';
        btnRegister.classList.add('registered');
        btnRegister.disabled = true;
    } else {
        btnRegister.textContent = 'Register';
        btnRegister.classList.remove('registered');
        btnRegister.disabled = false;
    }

    modalOverlay.classList.add('active');
}

// ── Close Modal ───────────────────────────────────────────────────────
function closeModal() {
    modalOverlay.classList.remove('active');
    activeCardData = null;
}

btnCloseModal.addEventListener('click', closeModal);

modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
});

// ── Register Handler ──────────────────────────────────────────────────
btnRegister.addEventListener('click', () => {
    if (!activeCardData) return;
    handleRegister(activeCardData.data, activeCardData.card);
});

function handleRegister(data, card) {
    // Prevent duplicate registrations
    const alreadyRegistered = myTrainings.some(t => t.title === data.title);
    if (alreadyRegistered) return;

    // Add to My Trainings state
    myTrainings.push({
        title:  data.title,
        date:   data.date,
        type:   data.type,
        status: 'Registered'
    });

    // Update card button
    const cardBtn = card.querySelector('.register-btn');
    if (cardBtn) {
        cardBtn.textContent = 'Registered ✓';
        cardBtn.classList.add('registered');
        cardBtn.disabled = true;
    }
    card.classList.add('registered');

    // Update modal button if modal is open for this card
    const alreadyInModal = activeCardData && activeCardData.data.title === data.title;
    if (alreadyInModal) {
        btnRegister.textContent = 'Registered ✓';
        btnRegister.classList.add('registered');
        btnRegister.disabled = true;
    }

    // Re-render My Trainings panel
    renderMyTrainings();
}

// ── Render My Trainings Panel ─────────────────────────────────────────
function renderMyTrainings() {
    if (myTrainings.length === 0) {
        myTrainingsList.innerHTML =
            '<div class="empty-state">No registered trainings yet.</div>';
        return;
    }

    myTrainingsList.innerHTML = '';
    myTrainings.forEach(t => {
        const item = document.createElement('div');
        item.className = 'my-training-item';
        item.innerHTML =
            `<div class="t-name">${t.title}</div>` +
            `<div class="t-date">${t.date}</div>` +
            `<span class="status-badge registered">${t.status}</span>`;
        myTrainingsList.appendChild(item);
    });
}