/**
 * GPA & CGPA Calculator LocalStorage & Import/Export Module
 */

const STORAGE_KEY = 'gpa_calculator_data';
const THEME_KEY = 'gpa_calculator_theme';

export class AppState {
    constructor() {
        this.undoStack = [];
        this.redoStack = [];
        this.maxHistory = 20;
    }

    /**
     * Loads the saved semester state from localStorage
     * @returns {Array} List of semesters
     */
    loadData() {
        const data = localStorage.getItem(STORAGE_KEY);
        try {
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error("Failed to parse localStorage data", e);
            return [];
        }
    }

    /**
     * Saves the current semester state to localStorage
     * @param {Array} semesters 
     */
    saveData(semesters) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(semesters));
    }

    /**
     * Records the state for Undo/Redo
     * @param {Array} semesters 
     */
    pushState(semesters) {
        // Deep copy the current state
        const stateCopy = JSON.parse(JSON.stringify(semesters));
        
        // Avoid pushing identical consecutive states
        if (this.undoStack.length > 0) {
            const lastState = JSON.stringify(this.undoStack[this.undoStack.length - 1]);
            if (lastState === JSON.stringify(stateCopy)) {
                return;
            }
        }

        this.undoStack.push(stateCopy);
        if (this.undoStack.length > this.maxHistory) {
            this.undoStack.shift();
        }
        // Clear redo stack on new action
        this.redoStack = [];
    }

    /**
     * Undoes the last action
     * @param {Array} currentState 
     * @returns {Array|null} Previous state, or null if empty
     */
    undo(currentState) {
        if (this.undoStack.length === 0) return null;
        
        const previousState = this.undoStack.pop();
        this.redoStack.push(JSON.parse(JSON.stringify(currentState)));
        
        this.saveData(previousState);
        return previousState;
    }

    /**
     * Redoes the last undone action
     * @param {Array} currentState 
     * @returns {Array|null} Next state, or null if empty
     */
    redo(currentState) {
        if (this.redoStack.length === 0) return null;

        const nextState = this.redoStack.pop();
        this.undoStack.push(JSON.parse(JSON.stringify(currentState)));

        this.saveData(nextState);
        return nextState;
    }

    /**
     * Theme management
     */
    getTheme() {
        return localStorage.getItem(THEME_KEY) || 'dark';
    }

    setTheme(theme) {
        localStorage.setItem(THEME_KEY, theme);
    }
}

/**
 * Exports data to JSON file
 * @param {Array} semesters 
 */
export function exportToJSON(semesters) {
    const dataStr = JSON.stringify(semesters, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `gpa_report_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Exports data to CSV file
 * @param {Array} semesters 
 */
export function exportToCSV(semesters) {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Semester,Subject Code,Subject Name,Credits,Grade,Grade Point\n";

    const GRADE_POINTS = { 'O': 10, 'A+': 9, 'A': 8, 'B+': 7, 'B': 6, 'C': 5, 'F': 0 };

    semesters.forEach(sem => {
        (sem.subjects || []).forEach(sub => {
            const code = sub.code ? sub.code.replace(/"/g, '""') : '';
            const name = sub.name ? sub.name.replace(/"/g, '""') : '';
            const credits = sub.credits || 0;
            const grade = sub.grade || '';
            const gp = GRADE_POINTS[grade] !== undefined ? GRADE_POINTS[grade] : '';
            
            csvContent += `"${sem.name}","${code}","${name}",${credits},"${grade}",${gp}\n`;
        });
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `gpa_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Triggers PDF export by rendering a clean printable report window.
 * This ensures precise format and styling, allowing the browser to render beautiful PDFs.
 * @param {Array} semesters 
 * @param {Object} cgpaStats 
 */
export function exportToPDF(semesters, cgpaStats) {
    const printWindow = window.open('', '_blank');
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

    const semesterRows = semesters.map(sem => {
        const subjectsList = (sem.subjects || []).map(sub => `
            <tr>
                <td>${sub.code || '-'}</td>
                <td>${sub.name || 'Unnamed Subject'}</td>
                <td>${sub.credits}</td>
                <td><strong>${sub.grade}</strong></td>
            </tr>
        `).join('');

        const subGPA = sem.subjects && sem.subjects.length ? 
            (sem.subjects.reduce((sum, s) => sum + ((parseFloat(s.credits) || 0) * ({'O':10,'A+':9,'A':8,'B+':7,'B':6,'C':5,'F':0}[s.grade] || 0)), 0) / 
             sem.subjects.reduce((sum, s) => sum + (parseFloat(s.credits) || 0), 0) || 0).toFixed(2) : '0.00';

        return `
            <div class="print-semester">
                <h3>${sem.name} <span class="gpa-badge">GPA: ${subGPA}</span></h3>
                <table>
                    <thead>
                        <tr>
                            <th>Code</th>
                            <th>Subject</th>
                            <th>Credits</th>
                            <th>Grade</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${subjectsList || '<tr><td colspan="4">No subjects added.</td></tr>'}
                    </tbody>
                </table>
            </div>
        `;
    }).join('');

    printWindow.document.write(`
        <html>
        <head>
            <title>Academic Performance Report - GPA / CGPA</title>
            <style>
                body {
                    font-family: 'Inter', system-ui, -apple-system, sans-serif;
                    color: #333;
                    padding: 40px;
                    line-height: 1.5;
                }
                .header {
                    border-bottom: 2px solid #eaeeef;
                    padding-bottom: 20px;
                    margin-bottom: 30px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .header h1 {
                    margin: 0;
                    font-size: 24px;
                    color: #111;
                }
                .header p {
                    margin: 5px 0 0 0;
                    color: #666;
                }
                .summary-cards {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 15px;
                    margin-bottom: 40px;
                }
                .card {
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    padding: 15px;
                    text-align: center;
                }
                .card .val {
                    font-size: 24px;
                    font-weight: 700;
                    color: #0f172a;
                }
                .card .lbl {
                    font-size: 12px;
                    color: #64748b;
                    text-transform: uppercase;
                    margin-top: 5px;
                }
                .print-semester {
                    margin-bottom: 30px;
                    page-break-inside: avoid;
                }
                .print-semester h3 {
                    display: flex;
                    justify-content: space-between;
                    border-bottom: 1px solid #e2e8f0;
                    padding-bottom: 8px;
                    margin-bottom: 12px;
                    color: #1e293b;
                }
                .gpa-badge {
                    background: #e0f2fe;
                    color: #0369a1;
                    padding: 2px 8px;
                    border-radius: 4px;
                    font-size: 14px;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 10px;
                }
                th, td {
                    text-align: left;
                    padding: 10px 12px;
                    border-bottom: 1px solid #f1f5f9;
                    font-size: 14px;
                }
                th {
                    background: #f8fafc;
                    color: #475569;
                    font-weight: 600;
                }
                .footer {
                    margin-top: 50px;
                    font-size: 12px;
                    color: #94a3b8;
                    text-align: center;
                    border-top: 1px solid #f1f5f9;
                    padding-top: 15px;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div>
                    <h1>Academic Performance Report</h1>
                    <p>Generated on ${new Date().toLocaleDateString()}</p>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 28px; font-weight: 800; color: #3b82f6;">${cgpaStats.cgpa.toFixed(2)}</div>
                    <div style="font-size: 12px; color: #64748b; text-transform: uppercase;">Overall CGPA</div>
                </div>
            </div>
            
            <div class="summary-cards">
                <div class="card">
                    <div class="val">${cgpaStats.cgpa.toFixed(2)}</div>
                    <div class="lbl">Cumulative GPA</div>
                </div>
                <div class="card">
                    <div class="val">${(cgpaStats.cgpa * 9.5).toFixed(1)}%</div>
                    <div class="lbl">Percentage Equivalent</div>
                </div>
                <div class="card">
                    <div class="val">${cgpaStats.totalCredits}</div>
                    <div class="lbl">Total Credits</div>
                </div>
                <div class="card">
                    <div class="val">${semesters.length}</div>
                    <div class="lbl">Semesters</div>
                </div>
            </div>

            ${semesterRows}

            <div class="footer">
                Report generated by GPA & CGPA Dashboard. Keep learning, keep growing.
            </div>

            <script>
                window.onload = function() {
                    window.print();
                    setTimeout(() => window.close(), 500);
                }
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
}
