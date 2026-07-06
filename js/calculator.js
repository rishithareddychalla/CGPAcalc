/**
 * GPA & CGPA Calculator Logic Module
 */

export const GRADE_POINTS = {
    'O': 10,
    'A+': 9,
    'A': 8,
    'B+': 7,
    'B': 6,
    'C': 5,
    'F': 0
};

/**
 * Calculates GPA for a single semester
 * GPA = Sum(Credit * Grade Point) / Sum(Credits)
 * @param {Array} subjects - List of subjects in the semester
 * @returns {Object} { gpa: number, totalCredits: number, creditPoints: number }
 */
export function calculateSemesterGPA(subjects) {
    let totalCredits = 0;
    let totalCreditPoints = 0;

    subjects.forEach(subject => {
        const credits = parseFloat(subject.credits) || 0;
        const grade = subject.grade;
        
        if (credits > 0 && grade && GRADE_POINTS[grade] !== undefined) {
            totalCredits += credits;
            totalCreditPoints += credits * GRADE_POINTS[grade];
        }
    });

    const gpa = totalCredits > 0 ? totalCreditPoints / totalCredits : 0;
    return {
        gpa: parseFloat(gpa.toFixed(2)),
        totalCredits,
        creditPoints: totalCreditPoints
    };
}

/**
 * Calculates overall CGPA from all semesters
 * CGPA = Total Credit Points / Total Credits
 * @param {Array} semesters - List of semesters with their subjects
 * @returns {Object} { cgpa: number, totalCredits: number, totalCreditPoints: number, semesterGPAs: Array }
 */
export function calculateCGPA(semesters) {
    let totalCredits = 0;
    let totalCreditPoints = 0;
    const semesterGPAs = [];

    semesters.forEach(sem => {
        const calc = calculateSemesterGPA(sem.subjects || []);
        semesterGPAs.push({
            id: sem.id,
            name: sem.name,
            gpa: calc.gpa,
            credits: calc.totalCredits,
            creditPoints: calc.creditPoints
        });

        // Do not include empty semesters in CGPA
        if (calc.totalCredits > 0) {
            totalCredits += calc.totalCredits;
            totalCreditPoints += calc.creditPoints;
        }
    });

    const cgpa = totalCredits > 0 ? totalCreditPoints / totalCredits : 0;
    return {
        cgpa: parseFloat(cgpa.toFixed(2)),
        totalCredits,
        totalCreditPoints,
        semesterGPAs
    };
}

/**
 * Converts CGPA to Percentage (standard Indian scale: CGPA * 9.5 or other scales)
 * Standard formula: CGPA * 9.5
 * @param {number} cgpa 
 * @returns {number} percentage
 */
export function cgpaToPercentage(cgpa) {
    return parseFloat((cgpa * 9.5).toFixed(2));
}

/**
 * Checks graduation eligibility
 * Assumes a default target of 120 total credits and no standing 'F' grades.
 * @param {number} totalCredits - Total credits completed
 * @param {Array} semesters - Semesters array
 * @param {number} requiredCredits - Target required credits
 * @returns {Object} { eligible: boolean, reasons: Array, progressPercent: number }
 */
export function checkGraduationEligibility(totalCredits, semesters, requiredCredits = 120) {
    const reasons = [];
    let hasFailures = false;

    semesters.forEach(sem => {
        (sem.subjects || []).forEach(sub => {
            if (sub.grade === 'F') {
                hasFailures = true;
            }
        });
    });

    if (totalCredits < requiredCredits) {
        reasons.push(`Requires ${requiredCredits - totalCredits} more credits.`);
    }
    if (hasFailures) {
        reasons.push("Clear all outstanding 'F' grade subjects.");
    }

    const progressPercent = Math.min(Math.round((totalCredits / requiredCredits) * 100), 100);

    return {
        eligible: reasons.length === 0 && totalCredits > 0,
        reasons,
        progressPercent
    };
}

/**
 * Returns eligible badges based on performance
 * @param {number} cgpa 
 * @param {number} totalCredits 
 * @returns {Array} badges list { name, icon, description, color }
 */
export function checkAchievements(cgpa, totalCredits) {
    const achievements = [];

    if (totalCredits >= 15) {
        achievements.push({
            name: "Academic Explorer",
            icon: "🏆",
            description: "Completed 15+ credits",
            color: "var(--accent-cyan)"
        });
    }
    if (totalCredits >= 60) {
        achievements.push({
            name: "Credit Heavyweight",
            icon: "⚡",
            description: "Completed 60+ credits",
            color: "var(--accent-purple)"
        });
    }
    if (cgpa >= 9.0 && totalCredits >= 10) {
        achievements.push({
            name: "Dean's List",
            icon: "⭐",
            description: "Maintain a CGPA >= 9.0",
            color: "var(--accent-gold)"
        });
    } else if (cgpa >= 8.0 && totalCredits >= 10) {
        achievements.push({
            name: "High Achiever",
            icon: "🌟",
            description: "Maintain a CGPA >= 8.0",
            color: "var(--accent-green)"
        });
    }

    // Check if user has perfect semester (10.0 GPA)
    return achievements;
}
