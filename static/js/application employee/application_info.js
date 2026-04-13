document.addEventListener("DOMContentLoaded", () => {
    // --- 1. Selectors ---
    const applicantForm = document.getElementById("applicantForm");
    const cvInput = document.getElementById("cv-upload");
    const fileNameDisplay = document.getElementById("file-name");
    const dropZone = document.getElementById("drop-zone");
    
    // Success Modal elements
    const successModal = document.getElementById("successModal");
    const modalOkBtn = document.getElementById("modalOkBtn");

    // Cancel Modal elements
    const cancelBtn = document.getElementById("cancelBtn");
    const cancelModal = document.getElementById("cancelModal");
    const confirmCancelBtn = document.getElementById("confirmCancelBtn");
    const stayBtn = document.getElementById("stayBtn");

    /**
     * 2. File Upload & Drag-and-Drop Logic
     */
    if (dropZone && cvInput) {
        dropZone.addEventListener("click", () => cvInput.click());

        dropZone.addEventListener("dragover", (e) => {
            e.preventDefault();
            dropZone.classList.add("over");
        });

        ["dragleave", "dragend"].forEach(type => {
            dropZone.addEventListener(type, () => dropZone.classList.remove("over"));
        });

        dropZone.addEventListener("drop", (e) => {
            e.preventDefault();
            dropZone.classList.remove("over");
            if (e.dataTransfer.files.length) {
                cvInput.files = e.dataTransfer.files;
                updateFileDisplay(e.dataTransfer.files[0]);
            }
        });

        cvInput.addEventListener("change", (e) => {
            if (e.target.files.length) {
                updateFileDisplay(e.target.files[0]);
            }
        });
    }

    function updateFileDisplay(file) {
        if (file) {
            fileNameDisplay.textContent = `Selected: ${file.name}`;
            fileNameDisplay.style.color = "#5c2b2b";
            fileNameDisplay.style.fontWeight = "bold";
        }
    }

    /**
     * 3. Submission Logic with Timer
     */
    if (applicantForm) {
        applicantForm.addEventListener("submit", (e) => {
            e.preventDefault();

            // Show the success modal
            successModal.style.display = "flex";

            // Start Countdown Timer Logic
            let timeLeft = 5; // 5 seconds countdown
            const timerText = document.createElement("p");
            timerText.id = "redirect-timer";
            timerText.style.marginTop = "15px";
            timerText.style.fontSize = "0.9rem";
            timerText.style.color = "#666";
            timerText.innerHTML = `Redirecting in <b>${timeLeft}</b> seconds...`;
            
            // Append timer below the success message in the modal
            const modalContent = successModal.querySelector(".modal-content");
            // Remove old timer if it exists (for multiple clicks)
            const oldTimer = document.getElementById("redirect-timer");
            if (oldTimer) oldTimer.remove();
            modalContent.insertBefore(timerText, modalOkBtn);

            const timerInterval = setInterval(() => {
                timeLeft--;
                const bTag = timerText.querySelector("b");
                if (bTag) bTag.textContent = timeLeft;

                if (timeLeft <= 0) {
                    clearInterval(timerInterval);
                    handleRedirect();
                }
            }, 1000);

            // Store interval ID to clear it if user clicks "OK" manually
            modalOkBtn.onclick = () => {
                clearInterval(timerInterval);
                handleRedirect();
            };
        });
    }

    function handleRedirect() {
        window.location.href = "success.html";
    }

    /**
     * 4. Custom Cancel Modal Logic
     */
    if (cancelBtn) {
        cancelBtn.addEventListener("click", () => {
            cancelModal.style.display = "flex";
        });
    }

    if (confirmCancelBtn) {
        confirmCancelBtn.addEventListener("click", () => {
            // Redirect to dashboard immediately on cancel
            window.location.href = "welcomepage.html";
        });
    }

    if (stayBtn) {
        stayBtn.addEventListener("click", () => {
            cancelModal.style.display = "none";
        });
    }

    // Close modals if user clicks the dark backdrop
    window.addEventListener("click", (e) => {
        if (e.target === successModal) {
            // We usually don't close success modals on backdrop click if they have a timer
            // but you can enable it here if needed.
        }
        if (e.target === cancelModal) {
            cancelModal.style.display = "none";
        }
    });
});