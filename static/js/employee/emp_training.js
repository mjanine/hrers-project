let myTrainings = [];
let trainingSessions = [];
let activeSession = null;

const sidebar = document.getElementById('sidebar');
const logoToggle = document.getElementById('logoToggle');
const closeBtn = document.getElementById('closeBtn');
const menuItems = document.querySelectorAll('.menu-item');
const trainingsGrid = document.getElementById('trainingsGrid');
const myTrainingsList = document.getElementById('myTrainingsList');
const modalOverlay = document.getElementById('modalOverlay');
const btnCloseModal = document.getElementById('btnCloseModal');
const btnRegister = document.getElementById('btnRegisterModal');

function normalizeTitle(title) {
    return String(title || '').trim().toLowerCase();
}

function getMyTrainingTitleSet() {
    return new Set(myTrainings.map(function (training) {
        return normalizeTitle(training.title);
    }));
}

function toDisplayDate(value) {
    if (!value) return '--';
    if (value.includes('/')) return value;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString();
}

function statusClass(status) {
    const key = String(status || '').toLowerCase();
    if (key === 'online') return 'badge-online';
    if (key === 'hybrid') return 'badge-hybrid';
    return '';
}

function showNotification(message, icon) {
    if (window.Swal && typeof window.Swal.fire === 'function') {
        window.Swal.fire({
            icon: icon || 'info',
            title: 'Training Update',
            text: message,
            confirmButtonColor: '#4a1d1d',
        });
        return;
    }
    alert(message);
}

function syncSidebar() {
    menuItems.forEach(function (item) {
        const span = item.querySelector('span');
        if (span) item.setAttribute('data-text', span.innerText);
    });

    if (closeBtn) {
        closeBtn.addEventListener('click', function () {
            sidebar.classList.add('collapsed');
        });
    }

    if (logoToggle) {
        logoToggle.addEventListener('click', function () {
            sidebar.classList.toggle('collapsed');
        });
    }
}

function renderTrainingCards() {
    if (!trainingsGrid) return;

    if (!trainingSessions.length) {
        trainingsGrid.innerHTML = '<div class="empty-state">No training sessions available.</div>';
        return;
    }

    const registeredTitles = getMyTrainingTitleSet();
    trainingsGrid.innerHTML = '';

    trainingSessions.forEach(function (session) {
        const card = document.createElement('div');
        card.className = 'training-card';
        card.dataset.sessionId = String(session.id);

        const isRegistered = registeredTitles.has(normalizeTitle(session.title));
        const isClosed = ['completed', 'cancelled', 'full'].includes(String(session.status || '').toLowerCase());

        const buttonLabel = isRegistered
            ? 'Registered ✓'
            : (String(session.status || '').toLowerCase() === 'full' ? 'Full' : (isClosed ? 'Closed' : 'Register'));

        card.innerHTML =
            '<h3>' + (session.title || '--') + '</h3>' +
            '<div class="category">' + (session.category || '--') + '</div>' +
            '<div class="date">' + toDisplayDate(session.date || session.isoDate) + '</div>' +
            '<span class="badge ' + statusClass(session.type) + '">' + (session.type || '--') + '</span>' +
            '<div class="slots">' + (session.filled || 0) + ' / ' + (session.total || 0) + ' slots</div>' +
            '<button class="register-btn" ' + (isRegistered || isClosed ? 'disabled' : '') + '>' + buttonLabel + '</button>';

        card.addEventListener('click', function (event) {
            if (event.target.classList.contains('register-btn')) {
                registerTraining(session.id);
                return;
            }
            openModal(session);
        });

        trainingsGrid.appendChild(card);
    });
}

function renderMyTrainings() {
    if (!myTrainingsList) return;

    if (!myTrainings.length) {
        myTrainingsList.innerHTML = '<div class="empty-state">No registered trainings yet.</div>';
        return;
    }

    myTrainingsList.innerHTML = '';
    myTrainings.forEach(function (training) {
        const item = document.createElement('div');
        item.className = 'my-training-item';
        item.innerHTML =
            '<div class="t-name">' + (training.title || '--') + '</div>' +
            '<div class="t-date">' + toDisplayDate(training.date) + '</div>' +
            '<span class="status-badge registered">' + (training.status || 'Registered') + '</span>';
        myTrainingsList.appendChild(item);
    });
}

function openModal(session) {
    activeSession = session;

    document.getElementById('modal-title').textContent = session.title || '--';
    document.getElementById('modal-meta').innerHTML =
        (session.category || '--') + ' <span>|</span> ' +
        (session.type || '--') + ' <span>|</span> ' +
        toDisplayDate(session.date || session.isoDate);
    document.getElementById('modal-status').textContent = session.statusLabel || session.status || '--';
    document.getElementById('modal-description').textContent = session.description || '--';
    document.getElementById('modal-provider').textContent = session.trainer || '--';
    document.getElementById('modal-location').textContent = session.location || '--';
    document.getElementById('modal-contact').textContent = session.contact || '--';
    document.getElementById('modal-slots').textContent = (session.filled || 0) + ' / ' + (session.total || 0);

    const isRegistered = getMyTrainingTitleSet().has(normalizeTitle(session.title));
    const isClosed = ['completed', 'cancelled', 'full'].includes(String(session.status || '').toLowerCase());
    btnRegister.disabled = isRegistered || isClosed;
    btnRegister.textContent = isRegistered ? 'Registered ✓' : (isClosed ? 'Closed' : 'Register');

    modalOverlay.classList.add('active');
}

function closeModal() {
    modalOverlay.classList.remove('active');
    activeSession = null;
}

async function registerTraining(trainingId) {
    const response = await fetch('/api/trainings/' + trainingId + '/register', { method: 'POST' });
    if (!response.ok) {
        const payload = await response.json().catch(function () { return { detail: 'Unable to register.' }; });
        showNotification(payload.detail || 'Unable to register.', 'error');
        return;
    }

    await refreshTrainingState();
    showNotification('Training registration saved.', 'success');
}

async function refreshTrainingState() {
    try {
        const [sessionsResponse, myResponse] = await Promise.all([
            fetch('/api/trainings'),
            fetch('/api/trainings/me'),
        ]);

        trainingSessions = sessionsResponse.ok ? ((await sessionsResponse.json()).items || []) : [];
        myTrainings = myResponse.ok ? ((await myResponse.json()).items || []) : [];
    } catch (error) {
        trainingSessions = [];
        myTrainings = [];
    }

    renderTrainingCards();
    renderMyTrainings();

    if (activeSession) {
        const fresh = trainingSessions.find(function (item) {
            return Number(item.id) === Number(activeSession.id);
        });
        if (fresh) {
            openModal(fresh);
        }
    }
}

if (btnCloseModal) {
    btnCloseModal.addEventListener('click', closeModal);
}

if (modalOverlay) {
    modalOverlay.addEventListener('click', function (event) {
        if (event.target === modalOverlay) closeModal();
    });
}

document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') closeModal();
});

if (btnRegister) {
    btnRegister.addEventListener('click', function () {
        if (!activeSession) return;
        registerTraining(activeSession.id);
    });
}

document.addEventListener('DOMContentLoaded', function () {
    syncSidebar();
    refreshTrainingState();
});
