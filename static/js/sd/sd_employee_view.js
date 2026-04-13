document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const logoToggle = document.getElementById('logoToggle');
    const closeBtn = document.getElementById('closeBtn');
    const menuItems = document.querySelectorAll('.menu-item');

    // 1. Tooltip Fix: Automatically set labels
    menuItems.forEach(item => {
        const span = item.querySelector('span');
        if (span) {
            item.setAttribute('data-text', span.innerText.trim());
        }
    });

    // 2. Sidebar Toggle Logic
    if (logoToggle) {
        logoToggle.onclick = () => sidebar.classList.toggle('close');
    }
    if (closeBtn) {
        closeBtn.onclick = () => sidebar.classList.add('close');
    }

    // 3. Tabs Logic
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content-item');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            tabContents.forEach(c => c.classList.remove('active'));
            const targetId = tab.getAttribute('data-tab');
            const targetContent = document.getElementById(targetId);
            if (targetContent) targetContent.classList.add('active');
        });
    });

    // 4. Action Cell Logic (View & Download)
    const actionCells = document.querySelectorAll('.action-cell');

    actionCells.forEach(cell => {
        const links = cell.querySelectorAll('a');
        
        links.forEach(link => {
            link.addEventListener('click', (e) => {
                const isDownload = link.hasAttribute('download') || link.querySelector('.fa-download');
                const isView = link.querySelector('.fa-eye');
                
                // Get data from the table row for the mockup
                const row = link.closest('tr');
                const docName = row ? row.cells[0].innerText.trim() : "Document";
                const docType = row ? row.cells[1].innerText.trim().toLowerCase() : "pdf";

                if (isDownload) {
                    e.preventDefault();
                    // Create a dummy file in memory
                    const dummyContent = `This is a mockup file for: ${docName}\nType: ${docType.toUpperCase()}`;
                    const blob = new Blob([dummyContent], { type: 'text/plain' });
                    const url = window.URL.createObjectURL(blob);
                    
                    // Trigger download
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${docName.replace(/\s+/g, '_')}.${docType}`;
                    document.body.appendChild(a);
                    a.click();
                    
                    // Cleanup
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                } 
                
                else if (isView) {
                    // For "View", if the href is just #, we open a mock window
                    if (link.getAttribute('href') === "#") {
                        e.preventDefault();
                        const viewWin = window.open('', '_blank');
                        viewWin.document.write(`
                            <html>
                            <body style="margin:0; display:flex; flex-direction:column; justify-content:center; align-items:center; height:100vh; font-family:sans-serif; background:#f4f4f4;">
                                <div style="padding:40px; background:white; border-radius:8px; box-shadow:0 4px 10px rgba(0,0,0,0.1); text-align:center;">
                                    <h1 style="color:#333;">Preview: ${docName}</h1>
                                    <p style="color:#666;">This is a frontend preview of the ${docType.toUpperCase()} file.</p>
                                    <hr style="margin:20px 0; border:0; border-top:1px solid #eee;">
                                    <button onclick="window.close()" style="padding:10px 20px; cursor:pointer; background:#007bff; color:white; border:none; border-radius:4px;">Close Tab</button>
                                </div>
                            </body>
                            </html>
                        `);
                    }
                    // If href is NOT #, the browser will naturally open the file in a new tab due to target="_blank"
                }
            });
        });
    });
});