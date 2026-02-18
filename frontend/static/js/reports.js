let clientTimeChart = null;
let supervisionChart = null;
let sessionNotesChart = null;
let currentClientTimeData = null;
let currentSupervisionData = null;
let currentSessionNotesData = null;
let currentCPDData = null;
let currentReportMode = 'clients';

const sessionNotesDefaultHead = `
    <tr>
        <th>Date</th>
        <th>Type</th>
        <th>Client</th>
        <th>Content Preview</th>
    </tr>
`;

const cpdHead = `
    <tr>
        <th>Date</th>
        <th>Title</th>
        <th>Organisation</th>
        <th>Medium</th>
        <th>Hours</th>
        <th>Notes</th>
    </tr>
`;

// Set default date range to last 30 days
window.addEventListener('load', async () => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);

    document.getElementById('start-date').value = thirtyDaysAgo.toISOString().split('T')[0];
    document.getElementById('end-date').value = today.toISOString().split('T')[0];

    // Load active clients for filter dropdown
    await loadClients();

    document.getElementById('generate-report').addEventListener('click', generateReport);
    document.getElementById('export-pdf').addEventListener('click', exportToPDF);
});

async function loadClients() {
    try {
        const response = await fetch('/api/clients/?filter=active');
        if (!response.ok) {
            throw new Error(`Failed to fetch clients: ${response.status}`);
        }
        const clients = await response.json();
        const clientFilter = document.getElementById('client-filter');
        
        // Clear existing options except "All Clients"
        clientFilter.innerHTML = '<option value="">All Clients</option>';
        
        // Add active clients
        clients.forEach(client => {
            const option = document.createElement('option');
            option.value = client.id;
            option.textContent = `${client.first_name} ${client.last_name}`;
            clientFilter.appendChild(option);
        });

        const separatorOption = document.createElement('option');
        separatorOption.disabled = true;
        separatorOption.textContent = '──────────';
        clientFilter.appendChild(separatorOption);

        const cpdOption = document.createElement('option');
        cpdOption.value = 'cpd';
        cpdOption.textContent = 'CPD';
        clientFilter.appendChild(cpdOption);
    } catch (error) {
        console.error('Error loading clients:', error);
    }
}

function setReportMode(mode) {
    const clientTimeSection = document.getElementById('client-time-section');
    const supervisionSection = document.getElementById('supervision-section');
    const sessionNotesTitle = document.getElementById('session-notes-title');
    const sessionNotesHead = document.getElementById('session-notes-thead');

    currentReportMode = mode;

    if (mode === 'cpd') {
        clientTimeSection.style.display = 'none';
        supervisionSection.style.display = 'none';
        sessionNotesTitle.textContent = 'CPD Notes Summary';
        sessionNotesHead.innerHTML = cpdHead;
    } else {
        clientTimeSection.style.display = '';
        supervisionSection.style.display = '';
        sessionNotesTitle.textContent = 'Session Notes & Times';
        sessionNotesHead.innerHTML = sessionNotesDefaultHead;
    }
}

async function generateReport() {
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    const clientId = document.getElementById('client-filter').value;

    if (!startDate || !endDate) {
        alert('Please select both start and end dates');
        return;
    }

    // Build query parameters
    const baseParams = `start_date=${startDate}&end_date=${endDate}`;

    try {
        if (clientId === 'cpd') {
            const cpdResponse = await fetch(`/api/reports/cpd-notes?${baseParams}`);
            if (!cpdResponse.ok) {
                throw new Error(`CPD notes API error: ${cpdResponse.status} ${cpdResponse.statusText}`);
            }

            const cpdData = await cpdResponse.json();
            setReportMode('cpd');
            updateCPDChart(cpdData);
            updateCPDTable(cpdData);

            currentClientTimeData = null;
            currentSupervisionData = null;
            currentSessionNotesData = null;
            currentCPDData = cpdData;

            document.getElementById('export-pdf').disabled = false;
            return;
        }

        const clientParam = clientId ? `&client_id=${clientId}` : '';
        console.log('Fetching client time data...');
        const clientTimeResponse = await fetch(`/api/reports/client-time?${baseParams}${clientParam}`);
        if (!clientTimeResponse.ok) {
            throw new Error(`Client time API error: ${clientTimeResponse.status} ${clientTimeResponse.statusText}`);
        }
        const clientTimeData = await clientTimeResponse.json();
        console.log('Client time data:', clientTimeData);

        console.log('Fetching supervision data...');
        const supervisionResponse = await fetch(`/api/reports/supervision-time?${baseParams}${clientParam}`);
        if (!supervisionResponse.ok) {
            throw new Error(`Supervision time API error: ${supervisionResponse.status} ${supervisionResponse.statusText}`);
        }
        const supervisionData = await supervisionResponse.json();
        console.log('Supervision data:', supervisionData);

        console.log('Fetching session notes data...');
        const sessionNotesResponse = await fetch(`/api/reports/session-notes?${baseParams}${clientParam}`);
        if (!sessionNotesResponse.ok) {
            throw new Error(`Session notes API error: ${sessionNotesResponse.status} ${sessionNotesResponse.statusText}`);
        }
        const sessionNotesData = await sessionNotesResponse.json();
        console.log('Session notes data:', sessionNotesData);

        setReportMode('clients');
        updateClientTimeChart(clientTimeData);
        updateClientTimeTable(clientTimeData);
        updateSupervisionChart(supervisionData);
        updateSupervisionTable(supervisionData);
        updateSessionNotesChart(sessionNotesData);
        updateSessionNotesTable(sessionNotesData);
        
        // Store data for PDF export
        currentClientTimeData = clientTimeData;
        currentSupervisionData = supervisionData;
        currentSessionNotesData = sessionNotesData;
        currentCPDData = null;

        document.getElementById('export-pdf').disabled = false;
    } catch (error) {
        console.error('Error generating report:', error);
        alert(`Error generating report: ${error.message}. Please check the console for details.`);
    }
}

function updateCPDChart(data) {
    const ctx = document.getElementById('session-notes-chart').getContext('2d');

    if (sessionNotesChart) {
        sessionNotesChart.destroy();
    }

    const monthlyData = data.monthly_data || [];
    const labels = monthlyData.map(m => m.month_name);
    const monthlyHours = monthlyData.map(m => m.total_hours || 0);

    sessionNotesChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'CPD Hours',
                data: monthlyHours,
                backgroundColor: '#2563EB',
                borderColor: '#1D4ED8',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Hours'
                    }
                }
            }
        }
    });
}

function updateCPDTable(data) {
    const tbody = document.querySelector('#session-notes-table tbody');
    tbody.innerHTML = '';

    data.notes.forEach(note => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${new Date(note.date).toLocaleDateString()}</td>
            <td>${note.title || ''}</td>
            <td>${note.organisation || ''}</td>
            <td>${note.medium || ''}</td>
            <td>${(note.duration_hours || 0).toFixed(2)}</td>
            <td>${note.content_preview || ''}</td>
        `;
        tbody.appendChild(row);
    });
}

function updateClientTimeChart(data) {
    const ctx = document.getElementById('client-time-chart').getContext('2d');
    
    if (clientTimeChart) {
        clientTimeChart.destroy();
    }

    clientTimeChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => d.client_name),
            datasets: [{
                label: 'Hours',
                data: data.map(d => d.total_hours),
                backgroundColor: '#6366F1',
                borderColor: '#4f46e5',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Hours'
                    }
                }
            }
        }
    });
}

function updateClientTimeTable(data) {
    const tbody = document.querySelector('#client-time-table tbody');
    tbody.innerHTML = '';

    data.forEach(client => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${client.client_name}</td>
            <td>${client.total_hours.toFixed(1)}</td>
            <td>${client.session_count}</td>
            <td>${client.paid_sessions}</td>
            <td>${client.unpaid_sessions}</td>
        `;
        tbody.appendChild(row);
    });
}

function updateSupervisionChart(data) {
    const ctx = document.getElementById('supervision-chart').getContext('2d');
    
    if (supervisionChart) {
        supervisionChart.destroy();
    }

    // Use monthly_data if available, otherwise fall back to old format
    const monthlyData = data.monthly_data || [];
    const labels = monthlyData.map(m => m.month_name);
    const hours = monthlyData.map(m => m.total_hours);

    supervisionChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Supervision Hours',
                data: hours,
                backgroundColor: '#10B981',
                borderColor: '#059669',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Hours'
                    }
                }
            }
        }
    });
}

function updateSupervisionTable(data) {
    const tbody = document.querySelector('#supervision-table tbody');
    tbody.innerHTML = '';

    data.notes.forEach(note => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${new Date(note.date).toLocaleDateString()}</td>
            <td>${note.content_preview}</td>
        `;
        tbody.appendChild(row);
    });
}

function updateSessionNotesChart(data) {
    const ctx = document.getElementById('session-notes-chart').getContext('2d');
    
    if (sessionNotesChart) {
        sessionNotesChart.destroy();
    }

    const monthlyData = data.monthly_data || [];
    const labels = monthlyData.map(m => m.month_name);
    const sessionHours = monthlyData.map(m => m.session_hours);
    const assessmentHours = monthlyData.map(m => m.assessment_hours);

    sessionNotesChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Session Hours',
                    data: sessionHours,
                    backgroundColor: '#6366F1',
                    borderColor: '#4f46e5',
                    borderWidth: 1
                },
                {
                    label: 'Assessment Hours',
                    data: assessmentHours,
                    backgroundColor: '#4A90E2',
                    borderColor: '#357ABD',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Hours'
                    }
                }
            }
        }
    });
}

function updateSessionNotesTable(data) {
    const tbody = document.querySelector('#session-notes-table tbody');
    tbody.innerHTML = '';

    data.notes.forEach(note => {
        const row = document.createElement('tr');
        const typeClass = note.type === 'Session' ? 'note-type-session' : 'note-type-assessment';
        row.className = typeClass;
        row.innerHTML = `
            <td>${new Date(note.date).toLocaleDateString()}</td>
            <td>${note.type}</td>
            <td>${note.client_name || 'N/A'}</td>
            <td>${note.content_preview}</td>
        `;
        tbody.appendChild(row);
    });
}

function exportToPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Add title
    doc.setFontSize(20);
    doc.text('Therapy Session Report', 14, 20);

    // Add date range and client filter
    doc.setFontSize(12);
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    const clientFilter = document.getElementById('client-filter');
    const selectedClientId = clientFilter.value;
    const selectedClientName = clientFilter.options[clientFilter.selectedIndex].text;
    
    doc.text(`Period: ${startDate} to ${endDate}`, 14, 30);
    let startY = 45;
    if (selectedClientId) {
        doc.text(`Client: ${selectedClientName}`, 14, 37);
        startY = 52;
    }

    if (currentReportMode === 'cpd') {
        doc.setFontSize(16);
        doc.text('CPD Notes Summary', 14, startY);
        doc.setFontSize(11);
        doc.text(`Total Notes: ${currentCPDData?.total_notes || 0}`, 14, startY + 7);
        doc.text(`Total Hours: ${(currentCPDData?.total_hours || 0).toFixed(2)}`, 60, startY + 7);

        const stripHTML = (html) => {
            if (!html) return '(No notes)';
            const tmp = document.createElement('DIV');
            tmp.innerHTML = html;
            return tmp.textContent || tmp.innerText || '';
        };

        const cpdTableData = (currentCPDData?.notes || []).map(note => ([
            new Date(note.date).toLocaleDateString(),
            note.title || '',
            note.organisation || '',
            note.medium || '',
            (note.duration_hours || 0).toFixed(2),
            stripHTML(note.content)
        ]));

        doc.autoTable({
            head: [['Date', 'Title', 'Organisation', 'Medium', 'Hours', 'Notes']],
            body: cpdTableData,
            startY: startY + 12,
            theme: 'grid',
            headStyles: { fillColor: [37, 99, 235] },
            styles: {
                fontSize: 9,
                cellPadding: 3
            },
            columnStyles: {
                0: { cellWidth: 25 },
                1: { cellWidth: 30 },
                2: { cellWidth: 35 },
                3: { cellWidth: 22 },
                4: { cellWidth: 16 },
                5: { cellWidth: 'auto' }
            }
        });

        doc.save('therapy-report-cpd.pdf');
        return;
    }

    // Add client time table
    doc.setFontSize(16);
    doc.text('Client Time Allocation', 14, startY);
    
    const clientTable = document.getElementById('client-time-table');
    doc.autoTable({
        html: clientTable,
        startY: startY + 5,
        theme: 'grid',
        headStyles: { fillColor: [99, 102, 241] }
    });

    // Add supervision table with full content
    const supervisionY = doc.lastAutoTable.finalY + 20;
    doc.setFontSize(16);
    doc.text('Supervision Time', 14, supervisionY);
    
    if (currentSupervisionData && currentSupervisionData.notes && currentSupervisionData.notes.length > 0) {
        // Helper function to strip HTML tags and convert to plain text
        const stripHTML = (html) => {
            if (!html) return '(No content)';
            const tmp = document.createElement('DIV');
            tmp.innerHTML = html;
            return tmp.textContent || tmp.innerText || '';
        };
        
        // Build table data with full content for PDF
        const supervisionTableData = currentSupervisionData.notes.map(note => [
            new Date(note.date).toLocaleDateString(),
            stripHTML(note.content)
        ]);
        
        doc.autoTable({
            head: [['Date', 'Content']],
            body: supervisionTableData,
            startY: supervisionY + 5,
            theme: 'grid',
            headStyles: { fillColor: [99, 102, 241] },
            columnStyles: {
                0: { cellWidth: 40 },
                1: { cellWidth: 'auto' }
            },
            styles: {
                fontSize: 9,
                cellPadding: 3
            }
        });
    } else {
        // Fallback to HTML table if data not available
        const supervisionTable = document.getElementById('supervision-table');
        doc.autoTable({
            html: supervisionTable,
            startY: supervisionY + 5,
            theme: 'grid',
            headStyles: { fillColor: [99, 102, 241] }
        });
    }

    // Add session notes table with full content
    const sessionNotesY = doc.lastAutoTable.finalY + 20;
    doc.setFontSize(16);
    doc.text('Session Notes & Times', 14, sessionNotesY);
    
    if (currentSessionNotesData && currentSessionNotesData.notes && currentSessionNotesData.notes.length > 0) {
        // Helper function to strip HTML tags and convert to plain text
        const stripHTML = (html) => {
            if (!html) return '(No content)';
            const tmp = document.createElement('DIV');
            tmp.innerHTML = html;
            return tmp.textContent || tmp.innerText || '';
        };
        
        // Build table data with full content for PDF
        const sessionNotesTableData = currentSessionNotesData.notes.map(note => [
            new Date(note.date).toLocaleDateString(),
            note.type,
            note.client_name || 'N/A',
            stripHTML(note.content)
        ]);
        
        doc.autoTable({
            head: [['Date', 'Type', 'Client', 'Content']],
            body: sessionNotesTableData,
            startY: sessionNotesY + 5,
            theme: 'grid',
            headStyles: { fillColor: [99, 102, 241] },
            columnStyles: {
                0: { cellWidth: 30 },
                1: { cellWidth: 25 },
                2: { cellWidth: 40 },
                3: { cellWidth: 'auto' }
            },
            styles: {
                fontSize: 9,
                cellPadding: 3
            }
        });
    } else {
        // Fallback to HTML table if data not available
        const sessionNotesTable = document.getElementById('session-notes-table');
        doc.autoTable({
            html: sessionNotesTable,
            startY: sessionNotesY + 5,
            theme: 'grid',
            headStyles: { fillColor: [99, 102, 241] }
        });
    }

    // Save the PDF
    doc.save('therapy-report.pdf');
} 
