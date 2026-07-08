import { calculateSemesterGPA, predictFinalCGPA, calculateRequiredGPA, simulateMonteCarlo } from './calculations.js';
import { gradeToPoints, getGradeScale, setGradeScale, pointsToGrade } from './gradeScale.js';

const STORAGE_KEY = 'gradepath_planner_scenarios_v1';

/**
 * PlannerUI manages simulated semesters UI inside Predictor view
 */
export class PlannerUI {
    /**
     * @param {Object} app - main App reference (provides semesters, state)
     * @param {Object} opts
     */
    constructor(app, opts = {}) {
        this.app = app;
        this.container = document.getElementById('predictor-view');
        this.simulated = this.loadSimulatedFromStorage() || [this.createEmptySemester('Semester 1')];
        this.gradeScale = getGradeScale();
        this.targetCGPAInput = document.getElementById('sim-target-cgpa');
        this.remainingCreditsInput = document.getElementById('sim-remaining-credits');
        this.simResultBox = document.getElementById('sim-result-box');

        this.buildUI();
        this.render();
        this.bindGlobalInputs();
    }

    bindGlobalInputs() {
        const trigger = () => this.renderComputed();
        if (this.targetCGPAInput) this.targetCGPAInput.addEventListener('input', trigger);
        if (this.remainingCreditsInput) this.remainingCreditsInput.addEventListener('input', trigger);
    }

    createEmptySemester(name = 'Future Semester') {
        return {
            id: `fsem-${Date.now()}-${Math.floor(Math.random()*1000)}`,
            name,
            collapsed: false,
            subjects: []
        };
    }

    saveSimulatedToStorage() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.simulated));
    }

    loadSimulatedFromStorage() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return null;
            return JSON.parse(raw);
        } catch (e) {
            return null;
        }
    }

    buildUI() {
        // Create main planner panel inside predictor-view
        this.panel = document.createElement('div');
        this.panel.className = 'planner-panel glass';
        this.panel.style.padding = '18px';
        this.panel.style.marginTop = '18px';
        this.panel.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                <h3 style="margin:0">Academic Planner</h3>
                <div>
                    <button class="btn btn-secondary" id="planner-add-sem">➕ Add Semester</button>
                    <button class="btn btn-secondary" id="planner-save-scenario">💾 Save Scenario</button>
                </div>
            </div>
            <div id="planner-sems"></div>
            <div style="display:flex; gap:12px; margin-top:14px; align-items:center;">
                <div id="planner-projection" style="font-weight:700">Projected CGPA: 0.00</div>
                <div id="planner-target-status" style="color:var(--text-tertiary)"></div>
            </div>
            <div id="planner-chart-placeholder" style="margin-top:12px; display:none"></div>
        `;

        // Place panel below the existing predictor form container
        // Append to predictor-view
        this.container.appendChild(this.panel);

        // Bind add semester
        this.panel.querySelector('#planner-add-sem').addEventListener('click', () => {
            this.simulated.push(this.createEmptySemester(`Semester ${this.simulated.length + 1}`));
            this.saveSimulatedToStorage();
            this.render();
        });

        this.panel.querySelector('#planner-save-scenario').addEventListener('click', () => {
            this.saveCurrentScenarioPrompt();
        });
    }

    saveCurrentScenarioPrompt() {
        const name = prompt('Scenario name', `Plan ${new Date().toISOString().slice(0,10)}`);
        if (!name) return;
        const scenarios = JSON.parse(localStorage.getItem(STORAGE_KEY + '_list') || '[]');
        scenarios.push({ id: `sc-${Date.now()}`, name, data: this.simulated });
        localStorage.setItem(STORAGE_KEY + '_list', JSON.stringify(scenarios));
        alert('Scenario saved');
    }

    render() {
        const list = this.panel.querySelector('#planner-sems');
        list.innerHTML = '';

        this.simulated.forEach((sem, sIdx) => {
            const semCard = document.createElement('div');
            semCard.className = 'planner-semester-card';
            semCard.style.borderBottom = '1px solid rgba(255,255,255,0.03)';
            semCard.style.padding = '8px 0';

            semCard.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div style="display:flex; gap:8px; align-items:center;">
                        <button class="btn-icon btn-collapse" title="Collapse/Expand">${sem.collapsed ? '▶' : '▼'}</button>
                        <input class="planner-sem-name" value="${sem.name}" style="background:transparent; border:none; color:var(--text-primary); font-weight:700; width:220px">
                        <span style="font-size:12px; color:var(--text-tertiary)">| Subjects: ${sem.subjects.length}</span>
                    </div>
                    <div>
                        <button class="btn btn-secondary btn-dup">📋</button>
                        <button class="btn btn-secondary btn-delete" style="color:var(--accent-danger)">🗑️</button>
                    </div>
                </div>
                <div class="planner-subjects" style="margin-top:8px; display:${sem.collapsed ? 'none' : 'block'}"></div>
            `;

            // Bind name change
            semCard.querySelector('.planner-sem-name').addEventListener('change', (e) => {
                sem.name = e.target.value;
                this.saveSimulatedToStorage();
                this.render();
            });

            semCard.querySelector('.btn-collapse').addEventListener('click', () => {
                sem.collapsed = !sem.collapsed;
                this.saveSimulatedToStorage();
                this.render();
            });

            semCard.querySelector('.btn-dup').addEventListener('click', () => {
                const copy = JSON.parse(JSON.stringify(sem));
                copy.id = `fsem-${Date.now()}`;
                copy.name = `${copy.name} (Copy)`;
                this.simulated.splice(sIdx+1, 0, copy);
                this.saveSimulatedToStorage();
                this.render();
            });

            semCard.querySelector('.btn-delete').addEventListener('click', () => {
                if (!confirm(`Delete ${sem.name}?`)) return;
                this.simulated.splice(sIdx,1);
                this.saveSimulatedToStorage();
                this.render();
            });

            const subjContainer = semCard.querySelector('.planner-subjects');
            // subjects list
            sem.subjects.forEach((sub, subIdx) => {
                const subRow = document.createElement('div');
                subRow.style.display = 'flex';
                subRow.style.gap = '8px';
                subRow.style.marginBottom = '6px';
                subRow.innerHTML = `
                    <input class="sub-name" placeholder="Subject name" value="${sub.name || ''}" style="flex:1">
                    <input class="sub-credits" type="number" value="${sub.credits || 3}" min="0" style="width:72px">
                    <select class="sub-grade">
                        ${Object.keys(this.gradeScale).map(g => `<option value="${g}" ${sub.grade===g?'selected':''}>${g} (${this.gradeScale[g]})</option>`).join('')}
                    </select>
                    <button class="btn btn-secondary btn-grade-plus">+1</button>
                    <button class="btn btn-danger btn-grade-minus">-1</button>
                    <button class="btn btn-icon btn-del-sub">🗑️</button>
                `;

                subRow.querySelector('.sub-name').addEventListener('change', (e) => { sub.name = e.target.value; this.saveSimulatedToStorage(); this.renderComputed(); });
                subRow.querySelector('.sub-credits').addEventListener('change', (e) => { sub.credits = parseFloat(e.target.value) || 0; this.saveSimulatedToStorage(); this.renderComputed(); this.render(); });
                subRow.querySelector('.sub-grade').addEventListener('change', (e) => { sub.grade = e.target.value; sub.gradePoints = gradeToPoints(sub.grade); this.saveSimulatedToStorage(); this.renderComputed(); });
                subRow.querySelector('.btn-grade-plus').addEventListener('click', () => {
                    sub.gradePoints = (sub.gradePoints || gradeToPoints(sub.grade)) + 1;
                    // map back to nearest grade label
                    try { sub.grade = pointsToGrade(Math.round(sub.gradePoints)); } catch(e) {}
                    const sel = subRow.querySelector('.sub-grade'); if (sel) sel.value = sub.grade;
                    this.saveSimulatedToStorage(); this.renderComputed(); this.render();
                });
                subRow.querySelector('.btn-grade-minus').addEventListener('click', () => {
                    sub.gradePoints = (sub.gradePoints || gradeToPoints(sub.grade)) - 1;
                    try { sub.grade = pointsToGrade(Math.round(sub.gradePoints)); } catch(e) {}
                    const sel = subRow.querySelector('.sub-grade'); if (sel) sel.value = sub.grade;
                    this.saveSimulatedToStorage(); this.renderComputed(); this.render();
                });
                subRow.querySelector('.btn-del-sub').addEventListener('click', () => { sem.subjects.splice(subIdx,1); this.saveSimulatedToStorage(); this.render(); this.renderComputed(); });

                subjContainer.appendChild(subRow);
            });

            // add subject button
            const addSubBtn = document.createElement('button');
            addSubBtn.className = 'btn btn-secondary';
            addSubBtn.textContent = '➕ Add Subject';
            addSubBtn.addEventListener('click', () => {
                sem.subjects.push({ id: `fsub-${Date.now()}`, name: '', credits: 3, grade: 'A+' , gradePoints: gradeToPoints('A+')});
                this.saveSimulatedToStorage();
                this.render();
                this.renderComputed();
            });

            subjContainer.appendChild(addSubBtn);
            list.appendChild(semCard);
        });

        // final computed
        this.renderComputed();
    }

    renderComputed() {
        const stats = (this.app && this.app.semesters) ? this.app : null;
        // compute current totals
        const currentStats = (this.app && typeof this.app.semesters !== 'undefined') ? this.app : null;
        const currentCredits = (() => {
            // reuse existing calculator minimal: sum credits in completed semesters
            const semesters = this.app.semesters || [];
            return semesters.reduce((acc, s) => acc + ((s.subjects || []).reduce((a, sub) => a + (parseFloat(sub.credits)||0), 0)), 0);
        })();

        const currentCGPA = (() => {
            // compute using available function in app: calculateCGPA exists in ui.js imports but not accessible; compute simply
            const semesters = this.app.semesters || [];
            let creds = 0;
            let points = 0;
            semesters.forEach(s => {
                (s.subjects || []).forEach(sub => {
                    const c = parseFloat(sub.credits) || 0;
                    const p = gradeToPoints(sub.grade) || 0;
                    creds += c;
                    points += c * p;
                });
            });
            return creds > 0 ? parseFloat((points / creds).toFixed(2)) : 0;
        })();

        const predicted = predictFinalCGPA(currentCredits, currentCGPA, this.simulated || []);
        const projEl = this.panel.querySelector('#planner-projection');
        projEl.textContent = `Projected CGPA: ${predicted.predictedCGPA.toFixed(2)} (${predicted.totalCredits} credits)`;

        // Update target box if provided
        const target = parseFloat(this.targetCGPAInput.value)||0;
        const remaining = parseFloat(this.remainingCreditsInput.value)||0;
        if (target>0 && remaining>0) {
            const req = calculateRequiredGPA(currentCredits, currentCGPA, target, remaining);
            if (req.possible) {
                this.simResultBox.className = 'sim-result sim-result-success';
                this.simResultBox.innerHTML = `<strong>Possible!</strong><br>${req.reason}`;
            } else {
                this.simResultBox.className = 'sim-result sim-result-error';
                this.simResultBox.innerHTML = `<strong>Difficult Target!</strong><br>${req.reason}`;
            }
        }
    }
}
