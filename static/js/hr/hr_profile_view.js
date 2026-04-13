document.addEventListener('DOMContentLoaded', () => {
    // --- SIDEBAR ELEMENTS ---
    const sidebar = document.getElementById('sidebar');
    const logoToggle = document.getElementById('logoToggle');
    const closeBtn = document.getElementById('closeBtn');
    const menuItems = document.querySelectorAll('.menu-item');

    // --- SIDEBAR TOGGLE & GLIDE LOGIC ---
    if (logoToggle) {
        logoToggle.addEventListener('click', () => sidebar.classList.toggle('close'));
    }
    if (closeBtn) {
        closeBtn.addEventListener('click', () => sidebar.classList.add('close'));
    }

    // --- AUTOMATIC TOOLTIP LABELS ---
    // This pulls text from the span and puts it into data-text for the CSS tooltip
    menuItems.forEach(item => {
        const span = item.querySelector('span');
        if (span) {
            item.setAttribute('data-text', span.innerText);
        }
    });

    // --- TAB SWITCHING LOGIC ---
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content-item');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            tabContents.forEach(content => content.classList.remove('active'));

            const target = tab.getAttribute('data-tab');
            document.getElementById(target).classList.add('active');
        });
    });

    // --- FILE UPLOAD & STATUS CHANGE LOGIC ---
    const uploaders = document.querySelectorAll('.file-uploader');

    uploaders.forEach(uploader => {
        uploader.addEventListener('change', function() {
            if (this.files && this.files[0]) {
                const file = this.files[0];
                const row = this.closest('tr');
                
                const statusCell = row.querySelector('.status-cell');
                const dateCell = row.querySelector('.date-cell');
                const actionCell = row.querySelector('.action-cell');

                statusCell.textContent = "Valid";
                statusCell.style.color = "#28a745";

                const today = new Date().toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                });
                dateCell.textContent = today;

                const fileURL = URL.createObjectURL(file);

                actionCell.innerHTML = `
                    <a href="${fileURL}" target="_blank" title="View Document">
                        <i class="fas fa-eye"></i>
                    </a>
                    <a href="${fileURL}" download="${file.name}" title="Download Document">
                        <i class="fas fa-download"></i>
                    </a>
                `;
            }
        });
    });

    // --- HISTORY MODAL LOGIC ---
    const modal = document.getElementById('historyModal');
    const openBtn = document.getElementById('openHistoryModal');
    const closeBtnModal = document.getElementById('closeHistoryModal');
    const saveBtn = document.getElementById('saveEventBtn');

    // Open Modal
    if (openBtn) {
        openBtn.addEventListener('click', () => {
            modal.style.display = "block";
        });
    }

    // Close Modal via 'X'
    if (closeBtnModal) {
        closeBtnModal.addEventListener('click', () => {
            modal.style.display = "none";
        });
    }

    // Close Modal by clicking outside the box
    window.addEventListener('click', (event) => {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    });

    // Save Event Logic
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            const dateVal = document.getElementById('eventDate').value;
            const titleVal = document.getElementById('eventTitle').value;
            const descVal = document.getElementById('eventDesc').value;

            if (dateVal && titleVal && descVal) {
                const timeline = document.getElementById('timelineContainer');
                
                const newItem = document.createElement('div');
                newItem.classList.add('timeline-item');
                
                newItem.innerHTML = `
                    <div class="timeline-date">${dateVal}</div>
                    <div class="timeline-content">
                        <h4>${titleVal}</h4>
                        <p>${descVal}</p>
                    </div>
                `;

                timeline.prepend(newItem);

                // Reset and Close
                modal.style.display = "none";
                document.getElementById('eventDate').value = "";
                document.getElementById('eventTitle').value = "";
                document.getElementById('eventDesc').value = "";
            } else {
                alert("Please fill in all fields before saving.");
            }
        });
    }
});