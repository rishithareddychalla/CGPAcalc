/**
 * GPA & CGPA Calculator UI Module
 */

import { 
    calculateSemesterGPA, 
    calculateCGPA, 
    cgpaToPercentage, 
    checkGraduationEligibility, 
    checkAchievements 
} from './calculator.js';

import { 
    exportToJSON, 
    exportToCSV, 
    exportToPDF 
} from './storage.js';

import { updateCharts } from './charts.js';
import { predictFinalCGPA, calculateRequiredGPA } from './prediction.js';

// Dom cache
let container = null;

export class UIManager {
    constructor(app) {
        this.app = app;
        this.activeTab = 'dashboard';
        this.initDOMElements();
        this.bindEvents();
    }

    initDOMElements() {
        this.themeToggleBtn = document.getElementById('theme-toggle');
        this.addSemesterBtn = document.getElementById('btn-add-semester');
        this.undoBtn = document.getElementById('btn-undo');
        this.redoBtn = document.getElementById('btn-redo');
        
        this.exportPDFBtn = document.getElementById('btn-export-pdf');
        this.exportCSVBtn = document.getElementById('btn-export-csv');
        this.exportJSONBtn = document.getElementById('btn-export-json');
        this.importJSONBtn = document.getElementById('btn-import-json');
        this.clearDataBtn = document.getElementById('btn-clear-data');
        this.importFileInput = document.getElementById('import-file-input');

        this.semestersContainer = document.getElementById('semesters-container');

        // Tabs
        this.navItems = document.querySelectorAll('.nav-item');
        
        // Sim Inputs
        this.simTargetCGPA = document.getElementById('sim-target-cgpa');
        this.simRemainingCredits = document.getElementById('sim-remaining-credits');
        this.simResultBox = document.getElementById('sim-result-box');

        // Dashboard Stats
        this.cgpaVal = document.getElementById('stat-cgpa');
        this.percentageVal = document.getElementById('stat-percentage');
        this.totalCreditsVal = document.getElementById('stat-total-credits');
        this.highestGPAVal = document.getElementById('stat-highest-gpa');
        this.lowestGPAVal = document.getElementById('stat-lowest-gpa');
        this.graduationCheckVal = document.getElementById('stat-grad-status');
        this.progressFill = document.getElementById('credit-progress-fill');
        this.progressText = document.getElementById('credit-progress-text');
        this.badgesContainer = document.getElementById('badges-container');
        this.timelineContainer = document.getElementById('timeline-container');

        // Modal Elements
        this.semesterModal = document.getElementById('semester-modal');
        this.modalCloseBtn = document.getElementById('modal-close');
        this.modalCancelBtn = document.getElementById('modal-cancel');
        this.modalSubmitBtn = document.getElementById('modal-submit');
        this.modalInputName = document.getElementById('modal-semester-name');
        
        this.editingSemesterId = null;
        this.modalMode = 'create'; // 'create' or 'edit'

        // Mobile Nav
        this.menuToggleBtn = document.getElementById('menu-toggle');
        this.sidebar = document.querySelector('.sidebar');
    }

    bindEvents() {
        // Theme toggle
        this.themeToggleBtn.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            this.app.state.setTheme(newTheme);
            this.updateThemeToggleUI(newTheme);
            this.render(); // update chart colors
        });

        // Navigation
        this.navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const targetTab = item.dataset.tab;
                this.switchTab(targetTab);
            });
        });

        // Mobile Nav toggle
        if (this.menuToggleBtn) {
            this.menuToggleBtn.addEventListener('click', () => {
                this.sidebar.classList.toggle('active');
            });
        }

        // Add semester trigger modal
        this.addSemesterBtn.addEventListener('click', () => this.openSemesterModal('create'));

        // Modal close
        this.modalCloseBtn.addEventListener('click', () => this.closeSemesterModal());
        this.modalCancelBtn.addEventListener('click', () => this.closeSemesterModal());
        this.modalSubmitBtn.addEventListener('click', () => this.handleSemesterSubmit());

        // Undo & Redo
        this.undoBtn.addEventListener('click', () => {
            const prev = this.app.undo();
            if (prev) {
                this.showToast("Action Undone", "info");
                this.render();
            }
        });

        this.redoBtn.addEventListener('click', () => {
            const next = this.app.redo();
            if (next) {
                this.showToast("Action Redone", "info");
                this.render();
            }
        });

        // What-If live changes
        const triggerSim = () => this.runSimulation();
        this.simTargetCGPA.addEventListener('input', triggerSim);
        this.simRemainingCredits.addEventListener('input', triggerSim);

        // Exports
        this.exportJSONBtn.addEventListener('click', () => {
            exportToJSON(this.app.semesters);
            this.showToast("JSON report downloaded!", "success");
        });
        this.exportCSVBtn.addEventListener('click', () => {
            exportToCSV(this.app.semesters);
            this.showToast("CSV report downloaded!", "success");
        });
        this.exportPDFBtn.addEventListener('click', () => {
            const stats = calculateCGPA(this.app.semesters);
            exportToPDF(this.app.semesters, stats);
            this.showToast("PDF report printing...", "success");
        });

        // Imports
        this.importJSONBtn.addEventListener('click', () => this.importFileInput.click());
        this.importFileInput.addEventListener('change', (e) => this.handleJSONImport(e));

        // Clear all data
        if (this.clearDataBtn) {
            this.clearDataBtn.addEventListener('click', () => {
                if (confirm("Are you sure you want to clear all semesters and reset the calculator? This action cannot be undone.")) {
                    this.app.importSemesters([]);
                    this.showToast("All data cleared!", "success");
                    this.render();
                }
            });
        }
    }

    switchTab(tab) {
        this.activeTab = tab;
        this.navItems.forEach(item => {
            if (item.dataset.tab === tab) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Toggle sections based on tab
        const dashboardView = document.getElementById('dashboard-view');
        const semestersView = document.getElementById('semesters-view');
        const predictorView = document.getElementById('predictor-view');

        if (tab === 'dashboard') {
            dashboardView.style.display = 'grid';
            semestersView.style.display = 'none';
            predictorView.style.display = 'none';
        } else if (tab === 'semesters') {
            dashboardView.style.display = 'none';
            semestersView.style.display = 'flex';
            predictorView.style.display = 'none';
        } else if (tab === 'predictor') {
            dashboardView.style.display = 'none';
            semestersView.style.display = 'none';
            predictorView.style.display = 'grid';
        }

        // Close mobile menu if active
        if (this.sidebar.classList.contains('active')) {
            this.sidebar.classList.remove('active');
        }
    }

    updateThemeToggleUI(theme) {
        const textSpan = this.themeToggleBtn.querySelector('span');
        const iconSpan = this.themeToggleBtn.querySelector('.theme-toggle-icon');
        if (theme === 'dark') {
            textSpan.textContent = 'Light Mode';
            iconSpan.textContent = '☀️';
        } else {
            textSpan.textContent = 'Dark Mode';
            iconSpan.textContent = '🌙';
        }
    }

    // Modal Logic
    openSemesterModal(mode, semesterId = null) {
        this.modalMode = mode;
        this.editingSemesterId = semesterId;

        if (mode === 'create') {
            this.modalInputName.value = `Semester ${this.app.semesters.length + 1}`;
            this.semesterModal.querySelector('.modal-title').textContent = 'Add Semester';
        } else {
            const sem = this.app.semesters.find(s => s.id === semesterId);
            this.modalInputName.value = sem ? sem.name : '';
            this.semesterModal.querySelector('.modal-title').textContent = 'Rename Semester';
        }

        this.semesterModal.classList.add('active');
        this.modalInputName.focus();
    }

    closeSemesterModal() {
        this.semesterModal.classList.remove('active');
        this.editingSemesterId = null;
    }

    handleSemesterSubmit() {
        const name = this.modalInputName.value.trim();
        if (!name) return;

        if (this.modalMode === 'create') {
            this.app.addSemester(name);
            this.showToast("Semester added successfully!", "success");
        } else {
            this.app.updateSemesterName(this.editingSemesterId, name);
            this.showToast("Semester renamed!", "success");
        }

        this.closeSemesterModal();
        this.render();
    }

    handleJSONImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (Array.isArray(data)) {
                    this.app.importSemesters(data);
                    this.showToast("Data imported successfully!", "success");
                    this.render();
                } else {
                    this.showToast("Invalid data structure", "danger");
                }
            } catch (err) {
                this.showToast("Failed to parse JSON file", "danger");
            }
        };
        reader.readAsText(file);
    }

    showToast(message, type = "info") {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let icon = "ℹ️";
        if (type === 'success') icon = "✅";
        if (type === 'danger') icon = "⚠️";

        toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('fade-out');
            toast.addEventListener('animationend', () => toast.remove());
        }, 3000);
    }

    // Main Renderer
    render() {
        const semesters = this.app.semesters;
        const stats = calculateCGPA(semesters);

        // Update Undo/Redo button visual states
        this.undoBtn.disabled = this.app.state.undoStack.length === 0;
        this.redoBtn.disabled = this.app.state.redoStack.length === 0;

        // Render stats cards
        this.cgpaVal.textContent = stats.cgpa.toFixed(2);
        this.percentageVal.textContent = `${cgpaToPercentage(stats.cgpa).toFixed(1)}%`;
        this.totalCreditsVal.textContent = stats.totalCredits;

        // Extract min and max GPA
        const activeGPAs = stats.semesterGPAs.filter(s => s.credits > 0);
        if (activeGPAs.length > 0) {
            const highest = Math.max(...activeGPAs.map(s => s.gpa));
            const lowest = Math.min(...activeGPAs.map(s => s.gpa));
            this.highestGPAVal.textContent = highest.toFixed(2);
            this.lowestGPAVal.textContent = lowest.toFixed(2);
        } else {
            this.highestGPAVal.textContent = '0.00';
            this.lowestGPAVal.textContent = '0.00';
        }

        // Graduation Check
        const targetCredits = 120;
        const gradEligibility = checkGraduationEligibility(stats.totalCredits, semesters, targetCredits);
        this.progressFill.style.width = `${gradEligibility.progressPercent}%`;
        this.progressText.textContent = `${stats.totalCredits} / ${targetCredits} Credits`;
        
        if (gradEligibility.eligible) {
            this.graduationCheckVal.textContent = 'Eligible for Graduation';
            this.graduationCheckVal.style.color = 'var(--accent-success)';
        } else {
            this.graduationCheckVal.textContent = gradEligibility.reasons[0] || 'Awaiting credits';
            this.graduationCheckVal.style.color = 'var(--text-tertiary)';
        }

        // Achievements Badges
        const badges = checkAchievements(stats.cgpa, stats.totalCredits);
        this.badgesContainer.innerHTML = '';
        if (badges.length > 0) {
            badges.forEach(badge => {
                const el = document.createElement('div');
                el.className = 'badge-pill';
                el.style.borderColor = badge.color;
                el.style.color = badge.color;
                el.innerHTML = `<span>${badge.icon}</span> <span>${badge.name}</span>`;
                el.title = badge.description;
                this.badgesContainer.appendChild(el);
            });
        } else {
            this.badgesContainer.innerHTML = `<span style="font-size: 13px; color: var(--text-tertiary);">No achievements unlocked yet. Complete subjects to earn badges!</span>`;
        }

        // Timeline History render
        this.timelineContainer.innerHTML = '';
        if (activeGPAs.length > 0) {
            activeGPAs.forEach(g => {
                const el = document.createElement('div');
                el.className = 'timeline-item';
                el.innerHTML = `
                    <div class="timeline-dot"></div>
                    <div class="timeline-content">
                        <div>
                            <div class="timeline-title">${g.name}</div>
                            <div class="timeline-desc">${g.credits} credits completed</div>
                        </div>
                        <div style="font-weight: 700; color: var(--accent-primary)">GPA: ${g.gpa.toFixed(2)}</div>
                    </div>
                `;
                this.timelineContainer.appendChild(el);
            });
        } else {
            this.timelineContainer.innerHTML = `<span style="font-size: 13px; color: var(--text-tertiary);">No academic history yet.</span>`;
        }

        // Semesters panel render
        this.renderSemestersList();

        // Update Charts
        updateCharts(semesters);

        // Run Simulator automatically
        this.runSimulation();
    }

    renderSemestersList() {
        this.semestersContainer.innerHTML = '';
        
        if (this.app.semesters.length === 0) {
            this.semestersContainer.innerHTML = `
                <div class="glass" style="padding: 40px; text-align: center; color: var(--text-tertiary);">
                    <p style="font-size: 15px; margin-bottom: 16px;">No semesters added yet.</p>
                    <button class="btn btn-primary" onclick="document.getElementById('btn-add-semester').click()">
                        <span>➕</span> Create First Semester
                    </button>
                </div>
            `;
            return;
        }

        this.app.semesters.forEach(sem => {
            const calculated = calculateSemesterGPA(sem.subjects || []);
            
            const card = document.createElement('div');
            card.className = 'semester-card glass';
            card.dataset.id = sem.id;

            card.innerHTML = `
                <div class="semester-header">
                    <div class="semester-title-group">
                        <span class="semester-name">${sem.name}</span>
                        <span class="semester-gpa-pill">GPA: ${calculated.gpa.toFixed(2)}</span>
                        <span style="font-size: 12px; color: var(--text-tertiary); font-weight: 500;">(${calculated.totalCredits} credits)</span>
                    </div>
                    <div class="semester-actions">
                        <button class="btn-icon btn-edit-sem" title="Rename Semester">✏️</button>
                        <button class="btn-icon btn-duplicate-sem" title="Duplicate Semester">📋</button>
                        <button class="btn-icon btn-delete-sem" style="color: var(--accent-danger);" title="Delete Semester">🗑️</button>
                    </div>
                </div>
                
                <div class="subjects-table-header">
                    <div>Subject Description</div>
                    <div>Code</div>
                    <div>Credits</div>
                    <div>Grade</div>
                    <div></div>
                </div>

                <div class="subjects-list"></div>

                <div style="display: flex; justify-content: flex-start; margin-top: 12px;">
                    <button class="btn btn-secondary btn-add-subject" style="padding: 8px 14px; font-size: 13px;">
                        <span>➕</span> Add Subject
                    </button>
                </div>
            `;

            // Bind Semester operations
            card.querySelector('.btn-edit-sem').addEventListener('click', () => this.openSemesterModal('edit', sem.id));
            card.querySelector('.btn-duplicate-sem').addEventListener('click', () => {
                this.app.duplicateSemester(sem.id);
                this.showToast("Semester duplicated!", "success");
                this.render();
            });
            card.querySelector('.btn-delete-sem').addEventListener('click', () => {
                if (confirm(`Are you sure you want to delete ${sem.name}?`)) {
                    this.app.deleteSemester(sem.id);
                    this.showToast("Semester deleted", "info");
                    this.render();
                }
            });

            // Add Subject handler
            card.querySelector('.btn-add-subject').addEventListener('click', () => {
                this.app.addSubject(sem.id);
                this.render();
            });

            // Subjects list DOM builder
            const subjectsListEl = card.querySelector('.subjects-list');
            (sem.subjects || []).forEach(sub => {
                const subRow = document.createElement('div');
                subRow.className = 'subject-row';
                subRow.dataset.id = sub.id;

                subRow.innerHTML = `
                    <input type="text" class="subject-input sub-name" placeholder="Subject Name" value="${sub.name || ''}">
                    <input type="text" class="subject-input sub-code" placeholder="Code" value="${sub.code || ''}">
                    <input type="number" class="subject-input sub-credits" placeholder="Credits" value="${sub.credits}" min="1" step="0.5">
                    <select class="subject-input subject-select sub-grade">
                        <option value="O" ${sub.grade === 'O' ? 'selected' : ''}>O (10)</option>
                        <option value="A+" ${sub.grade === 'A+' ? 'selected' : ''}>A+ (9)</option>
                        <option value="A" ${sub.grade === 'A' ? 'selected' : ''}>A (8)</option>
                        <option value="B+" ${sub.grade === 'B+' ? 'selected' : ''}>B+ (7)</option>
                        <option value="B" ${sub.grade === 'B' ? 'selected' : ''}>B (6)</option>
                        <option value="C" ${sub.grade === 'C' ? 'selected' : ''}>C (5)</option>
                        <option value="F" ${sub.grade === 'F' ? 'selected' : ''}>F (0)</option>
                    </select>
                    <button class="btn-delete-subject" title="Remove Subject">🗑️</button>
                `;

                // Handle changes inside fields
                subRow.querySelector('.sub-name').addEventListener('change', (e) => {
                    this.app.updateSubjectField(sem.id, sub.id, 'name', e.target.value);
                });
                subRow.querySelector('.sub-code').addEventListener('change', (e) => {
                    this.app.updateSubjectField(sem.id, sub.id, 'code', e.target.value);
                });
                subRow.querySelector('.sub-credits').addEventListener('change', (e) => {
                    const val = parseFloat(e.target.value) || 0;
                    this.app.updateSubjectField(sem.id, sub.id, 'credits', val);
                    this.render(); // update calculations immediately
                });
                subRow.querySelector('.sub-grade').addEventListener('change', (e) => {
                    this.app.updateSubjectField(sem.id, sub.id, 'grade', e.target.value);
                    this.render(); // update calculations immediately
                });
                subRow.querySelector('.btn-delete-subject').addEventListener('click', () => {
                    this.app.deleteSubject(sem.id, sub.id);
                    this.render();
                });

                subjectsListEl.appendChild(subRow);
            });

            this.semestersContainer.appendChild(card);
        });
    }

    runSimulation() {
        const stats = calculateCGPA(this.app.semesters);
        const targetCGPA = parseFloat(this.simTargetCGPA.value) || 0;
        const remainingCredits = parseFloat(this.simRemainingCredits.value) || 0;

        if (targetCGPA <= 0 || remainingCredits <= 0) {
            this.simResultBox.className = 'sim-result';
            this.simResultBox.textContent = 'Enter a valid target CGPA and remaining credits above to run the simulation.';
            return;
        }

        const result = calculateRequiredGPA(stats.totalCredits, stats.cgpa, targetCGPA, remainingCredits);

        if (result.possible) {
            this.simResultBox.className = 'sim-result sim-result-success';
            this.simResultBox.innerHTML = `<strong>Possible!</strong><br>${result.reason}`;
        } else {
            this.simResultBox.className = 'sim-result sim-result-error';
            this.simResultBox.innerHTML = `<strong>Difficult Target!</strong><br>${result.reason}`;
        }
    }
}
