import { gradeToPoints, maxGradePoint } from './gradeScale.js';

/**
 * Calculate GPA for a single semester from subjects
 * @param {Array} subjects - [{ name, credits, grade }]
 * @returns {{ gpa: number, totalCredits: number, totalPoints: number }}
 */
export function calculateSemesterGPA(subjects = []) {
    let totalCredits = 0;
    let totalPoints = 0;

    subjects.forEach(s => {
        const credits = parseFloat(s.credits) || 0;
        const points = gradeToPoints(s.grade) || 0;
        totalCredits += credits;
        totalPoints += credits * points;
    });

    const gpa = totalCredits > 0 ? totalPoints / totalCredits : 0;
    return {
        gpa: parseFloat(gpa.toFixed(2)),
        totalCredits,
        totalPoints: parseFloat(totalPoints.toFixed(2))
    };
}

/**
 * Predict final CGPA given current standing and simulated semesters
 * @param {number} currentCredits
 * @param {number} currentCGPA
 * @param {Array} simulatedSemesters - [{ name, subjects: [] }]
 * @returns {{ predictedCGPA: number, totalCredits: number, totalPoints: number }}
 */
export function predictFinalCGPA(currentCredits, currentCGPA, simulatedSemesters = []) {
    let totalCredits = currentCredits;
    let totalPoints = currentCredits * currentCGPA;

    simulatedSemesters.forEach(sem => {
        const calc = calculateSemesterGPA(sem.subjects || []);
        if (calc.totalCredits > 0) {
            totalCredits += calc.totalCredits;
            totalPoints += calc.totalPoints;
        }
    });

    const predictedCGPA = totalCredits > 0 ? totalPoints / totalCredits : 0;
    return {
        predictedCGPA: parseFloat(predictedCGPA.toFixed(2)),
        totalCredits,
        totalPoints: parseFloat(totalPoints.toFixed(2))
    };
}

/**
 * Calculate required GPA across remaining credits to hit a target CGPA
 * @param {number} currentCredits
 * @param {number} currentCGPA
 * @param {number} targetCGPA
 * @param {number} remainingCredits
 */
export function calculateRequiredGPA(currentCredits, currentCGPA, targetCGPA, remainingCredits) {
    if (remainingCredits <= 0) {
        return {
            possible: false,
            requiredGPA: 0,
            reason: 'No remaining credits specified.'
        };
    }

    const totalCredits = currentCredits + remainingCredits;
    const totalRequiredPoints = totalCredits * targetCGPA;
    const currentPoints = currentCredits * currentCGPA;
    const requiredPoints = totalRequiredPoints - currentPoints;
    const requiredGPA = requiredPoints / remainingCredits;

    const maxGPA = maxGradePoint();
    if (requiredGPA > maxGPA) {
        return {
            possible: false,
            requiredGPA: parseFloat(requiredGPA.toFixed(2)),
            reason: `Requires a ${requiredGPA.toFixed(2)} GPA, which exceeds the max grade scale (${maxGPA.toFixed(2)}). Try adjusting your target CGPA or completing more credits.`
        };
    }

    if (requiredGPA < 0) {
        return {
            possible: true,
            requiredGPA: 0.0,
            reason: 'Target already achieved! You need a 0.0 GPA (just pass your classes).'
        };
    }

    return {
        possible: true,
        requiredGPA: parseFloat(requiredGPA.toFixed(2)),
        reason: `You need an average of ${requiredGPA.toFixed(2)} GPA over your remaining ${remainingCredits} credits to hit a ${targetCGPA.toFixed(2)} CGPA.`
    };
}

/**
 * Calculate subject impact: delta in final CGPA when a single subject's grade changes by gradeDeltaPoints
 * @param {number} currentCredits
 * @param {number} currentCGPA
 * @param {Array} simulatedSemesters
 * @param {number} semIndex
 * @param {number} subIndex
 * @param {number} gradeDeltaPoints - change in grade points (e.g., +1 or -1)
 * @returns {number} cgpaDelta
 */
export function calculateSubjectImpact(currentCredits, currentCGPA, simulatedSemesters, semIndex, subIndex, gradeDeltaPoints) {
    // Deep clone to avoid mutation
    const sims = JSON.parse(JSON.stringify(simulatedSemesters || []));
    const targetSem = sims[semIndex];
    if (!targetSem || !targetSem.subjects || !targetSem.subjects[subIndex]) return 0;

    const sub = targetSem.subjects[subIndex];
    const credits = parseFloat(sub.credits) || 0;
    if (credits <= 0) return 0;

    const base = predictFinalCGPA(currentCredits, currentCGPA, simulatedSemesters);
    // apply delta
    const originalPoints = (parseFloat(sub.gradePoints) || 0);
    const newPoints = originalPoints + gradeDeltaPoints;

    // replace gradePoints temporarily
    sims[semIndex].subjects[subIndex].gradePoints = newPoints;

    // If gradePoints field is present we prefer it else convert grade label
    // Adjust calculateSemesterGPA to read gradePoints if present
    const after = predictFinalCGPA(currentCredits, currentCGPA, sims);
    const delta = parseFloat((after.predictedCGPA - base.predictedCGPA).toFixed(3));
    return delta;
}

/**
 * Monte Carlo simulation: run N simulations by sampling grades within provided ranges
 * Each subject may provide {min, max} gradePoints; if not provided we use exact gradeToPoints(subject.grade)
 * @param {number} runs
 * @param {number} currentCredits
 * @param {number} currentCGPA
 * @param {Array} simulatedSemesters
 */
export function simulateMonteCarlo(runs, currentCredits, currentCGPA, simulatedSemesters) {
    const results = [];
    const rng = () => Math.random();

    for (let i = 0; i < runs; i++) {
        const sims = simulatedSemesters.map(sem => ({
            name: sem.name,
            subjects: sem.subjects.map(sub => {
                const min = (sub.range && parseFloat(sub.range.min)) || (sub.gradePoints || 0);
                const max = (sub.range && parseFloat(sub.range.max)) || (sub.gradePoints || 0);
                const sampled = min === max ? min : (min + rng() * (max - min));
                return Object.assign({}, sub, { gradePoints: sampled });
            })
        }));

        const predicted = predictFinalCGPA(currentCredits, currentCGPA, sims);
        results.push(predicted.predictedCGPA);
    }

    return results;
}
