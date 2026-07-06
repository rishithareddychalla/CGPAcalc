/**
 * Chart.js Integration and Settings
 */

let gpaTrendChart = null;
let gradeDistChart = null;
let creditDistChart = null;

// Get colors depending on current mode
function getChartColors() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    return {
        text: isDark ? '#cbd5e1' : '#334155',
        grid: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)',
        accent: '#6366f1',
        accentSec: '#38bdf8',
        background: isDark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.1)',
        pieColors: [
            '#6366f1', // O
            '#3b82f6', // A+
            '#10b981', // A
            '#f59e0b', // B+
            '#ec4899', // B
            '#8b5cf6', // C
            '#ef4444'  // F
        ]
    };
}

/**
 * Initializes/updates all charts in the dashboard
 * @param {Array} semesters 
 */
export function updateCharts(semesters) {
    const colors = getChartColors();

    updateGPATrendChart(semesters, colors);
    updateGradeDistChart(semesters, colors);
    updateCreditDistChart(semesters, colors);
}

function updateGPATrendChart(semesters, colors) {
    const ctx = document.getElementById('gpaTrendChart');
    if (!ctx) return;

    // Filter semesters with positive credits (calculated ones)
    const activeSemesters = semesters.filter(sem => {
        const totalCredits = (sem.subjects || []).reduce((sum, sub) => sum + (parseFloat(sub.credits) || 0), 0);
        return totalCredits > 0;
    });

    const labels = activeSemesters.map(sem => sem.name);
    const data = activeSemesters.map(sem => {
        const totalCredits = (sem.subjects || []).reduce((sum, sub) => sum + (parseFloat(sub.credits) || 0), 0);
        const creditPoints = (sem.subjects || []).reduce((sum, sub) => {
            const gradePoints = { 'O': 10, 'A+': 9, 'A': 8, 'B+': 7, 'B': 6, 'C': 5, 'F': 0 };
            return sum + ((parseFloat(sub.credits) || 0) * (gradePoints[sub.grade] || 0));
        }, 0);
        return totalCredits > 0 ? parseFloat((creditPoints / totalCredits).toFixed(2)) : 0;
    });

    if (gpaTrendChart) {
        gpaTrendChart.destroy();
    }

    gpaTrendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels.length ? labels : ['No Data'],
            datasets: [{
                label: 'Semester GPA',
                data: data.length ? data : [0],
                borderColor: colors.accent,
                backgroundColor: colors.background,
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: colors.accent,
                pointBorderColor: '#fff',
                pointHoverRadius: 7,
                pointRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    padding: 12,
                    cornerRadius: 8,
                    backgroundColor: 'rgba(15, 23, 42, 0.9)'
                }
            },
            scales: {
                y: {
                    min: 0,
                    max: 10,
                    grid: { color: colors.grid },
                    ticks: { color: colors.text }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: colors.text }
                }
            }
        }
    });
}

function updateGradeDistChart(semesters, colors) {
    const ctx = document.getElementById('gradeDistChart');
    if (!ctx) return;

    const gradesCount = { 'O': 0, 'A+': 0, 'A': 0, 'B+': 0, 'B': 0, 'C': 0, 'F': 0 };
    let hasData = false;

    semesters.forEach(sem => {
        (sem.subjects || []).forEach(sub => {
            if (gradesCount[sub.grade] !== undefined) {
                gradesCount[sub.grade]++;
                hasData = true;
            }
        });
    });

    if (gradeDistChart) {
        gradeDistChart.destroy();
    }

    gradeDistChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(gradesCount),
            datasets: [{
                data: hasData ? Object.values(gradesCount) : [1],
                backgroundColor: hasData ? colors.pieColors : ['#e2e8f0'],
                borderWidth: 2,
                borderColor: document.documentElement.getAttribute('data-theme') === 'dark' ? '#1e293b' : '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: { color: colors.text }
                },
                tooltip: {
                    enabled: hasData,
                    padding: 12,
                    cornerRadius: 8
                }
            },
            cutout: '65%'
        }
    });
}

function updateCreditDistChart(semesters, colors) {
    const ctx = document.getElementById('creditDistChart');
    if (!ctx) return;

    const labels = semesters.map(sem => sem.name);
    const data = semesters.map(sem => {
        return (sem.subjects || []).reduce((sum, sub) => sum + (parseFloat(sub.credits) || 0), 0);
    });

    if (creditDistChart) {
        creditDistChart.destroy();
    }

    creditDistChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels.length ? labels : ['No Data'],
            datasets: [{
                label: 'Credits',
                data: data.length ? data : [0],
                backgroundColor: colors.accentSec,
                borderRadius: 6,
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    grid: { color: colors.grid },
                    ticks: { color: colors.text }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: colors.text }
                }
            }
        }
    });
}
