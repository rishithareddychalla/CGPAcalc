/**
 * GPA & CGPA Calculator Main Application Entry
 */

import { AppState } from './storage.js';
import { UIManager } from './ui.js';

class App {
    constructor() {
        this.state = new AppState();
        this.semesters = this.state.loadData();
        
        // Auto-clear mock data if present from previous localStorage session
        if (this.semesters.some(s => s.id === 'sem-1' || s.id === 'sem-2')) {
            this.semesters = [];
            this.state.saveData([]);
        }
        
        this.ui = new UIManager(this);
        
        // Initial theme setup
        const savedTheme = this.state.getTheme();
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.ui.updateThemeToggleUI(savedTheme);

        // Render initial UI state
        this.ui.render();
    }

    // State mutations & helper actions
    saveAndPushState() {
        this.state.pushState(this.semesters);
        this.state.saveData(this.semesters);
    }

    addSemester(name) {
        this.saveAndPushState();
        this.semesters.push({
            id: `sem-${Date.now()}`,
            name: name,
            subjects: []
        });
        this.state.saveData(this.semesters);
    }

    updateSemesterName(id, name) {
        this.saveAndPushState();
        const sem = this.semesters.find(s => s.id === id);
        if (sem) {
            sem.name = name;
            this.state.saveData(this.semesters);
        }
    }

    duplicateSemester(id) {
        this.saveAndPushState();
        const sem = this.semesters.find(s => s.id === id);
        if (sem) {
            const copy = JSON.parse(JSON.stringify(sem));
            copy.id = `sem-${Date.now()}`;
            copy.name = `${copy.name} (Copy)`;
            // Regenerate subject IDs to avoid conflicts
            copy.subjects.forEach((sub, i) => {
                sub.id = `sub-${Date.now()}-${i}`;
            });
            this.semesters.push(copy);
            this.state.saveData(this.semesters);
        }
    }

    deleteSemester(id) {
        this.saveAndPushState();
        this.semesters = this.semesters.filter(s => s.id !== id);
        this.state.saveData(this.semesters);
    }

    addSubject(semesterId) {
        this.saveAndPushState();
        const sem = this.semesters.find(s => s.id === semesterId);
        if (sem) {
            if (!sem.subjects) sem.subjects = [];
            sem.subjects.push({
                id: `sub-${Date.now()}`,
                name: '',
                code: '',
                credits: 3,
                grade: 'A+'
            });
            this.state.saveData(this.semesters);
        }
    }

    updateSubjectField(semesterId, subjectId, field, value) {
        // Suppress constant state pushing for every single keyup; trigger on 'change' input.
        // We push state beforehand to allow undoing this edit.
        this.saveAndPushState();
        
        const sem = this.semesters.find(s => s.id === semesterId);
        if (sem) {
            const sub = sem.subjects.find(s => s.id === subjectId);
            if (sub) {
                sub[field] = value;
                this.state.saveData(this.semesters);
            }
        }
    }

    deleteSubject(semesterId, subjectId) {
        this.saveAndPushState();
        const sem = this.semesters.find(s => s.id === semesterId);
        if (sem) {
            sem.subjects = sem.subjects.filter(s => s.id !== subjectId);
            this.state.saveData(this.semesters);
        }
    }

    importSemesters(data) {
        this.saveAndPushState();
        this.semesters = data;
        this.state.saveData(this.semesters);
    }

    undo() {
        const prev = this.state.undo(this.semesters);
        if (prev) {
            this.semesters = prev;
            return prev;
        }
        return null;
    }

    redo() {
        const next = this.state.redo(this.semesters);
        if (next) {
            this.semesters = next;
            return next;
        }
        return null;
    }
}

// Instantiate App on content load
window.addEventListener('DOMContentLoaded', () => {
    window.gpaApp = new App();
});
