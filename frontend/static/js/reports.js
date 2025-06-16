let clientTimeChart = null;
let supervisionChart = null;

// Set default date range to last 30 days
window.addEventListener('load', () => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);

    document.getElementById('start-date').value = thirtyDaysAgo.toISOString().split('T')[0];
    document.getElementById('end-date').value = today.toISOString().split('T')[0];

    document.getElementById('generate-report').addEventListener('click', generateReport);
    document.getElementById('export-pdf').addEventListener('click', exportToPDF);
});

async function generateReport() {
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;

    if (!startDate || !endDate) {
        alert('Please select both start and end dates');
        return;
    }

    try {
        console.log('Fetching client time data...');
        const clientTimeResponse = await fetch(`/api/reports/client-time?start_date=${startDate}&end_date=${endDate}`);
        if (!clientTimeResponse.ok) {
            throw new Error(`Client time API error: ${clientTimeResponse.status} ${clientTimeResponse.statusText}`);
        }
        const clientTimeData = await clientTimeResponse.json();
        console.log('Client time data:', clientTimeData);

        console.log('Fetching supervision data...');
        const supervisionResponse = await fetch(`/api/reports/supervision-time?start_date=${startDate}&end_date=${endDate}`);
        if (!supervisionResponse.ok) {
            throw new Error(`Supervision time API error: ${supervisionResponse.status} ${supervisionResponse.statusText}`);
        }
        const supervisionData = await supervisionResponse.json();
        console.log('Supervision data:', supervisionData);

        updateClientTimeChart(clientTimeData);
        updateClientTimeTable(clientTimeData);
        updateSupervisionChart(supervisionData);
        updateSupervisionTable(supervisionData);

        document.getElementById('export-pdf').disabled = false;
    } catch (error) {
        console.error('Error generating report:', error);
        alert(`Error generating report: ${error.message}. Please check the console for details.`);
    }
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

    supervisionChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.notes.map(n => new Date(n.date).toLocaleDateString()),
            datasets: [{
                label: 'Supervision Sessions',
                data: data.notes.map(() => 1),
                borderColor: '#10B981',
                backgroundColor: '#10B981',
                fill: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
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

function exportToPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Add title
    doc.setFontSize(20);
    doc.text('Therapy Session Report', 14, 20);

    // Add date range
    doc.setFontSize(12);
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    doc.text(`Period: ${startDate} to ${endDate}`, 14, 30);

    // Add client time table
    doc.setFontSize(16);
    doc.text('Client Time Allocation', 14, 45);
    
    const clientTable = document.getElementById('client-time-table');
    doc.autoTable({
        html: clientTable,
        startY: 50,
        theme: 'grid',
        headStyles: { fillColor: [99, 102, 241] }
    });

    // Add supervision table
    const supervisionY = doc.lastAutoTable.finalY + 20;
    doc.setFontSize(16);
    doc.text('Supervision Time', 14, supervisionY);
    
    const supervisionTable = document.getElementById('supervision-table');
    doc.autoTable({
        html: supervisionTable,
        startY: supervisionY + 5,
        theme: 'grid',
        headStyles: { fillColor: [99, 102, 241] }
    });

    // Save the PDF
    doc.save('therapy-report.pdf');
} 