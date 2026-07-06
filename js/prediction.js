/**
 * What-If CGPA & Target Predictor Logic
 */

/**
 * Predicts final graduation CGPA based on current standing and simulated future semesters
 * @param {number} currentCredits 
 * @param {number} currentCGPA 
 * @param {Array} simulatedSemesters - [{ name, gpa, credits }]
 * @returns {Object} { predictedCGPA: number, totalCredits: number }
 */
export function predictFinalCGPA(currentCredits, currentCGPA, simulatedSemesters) {
    let totalCredits = currentCredits;
    let totalCreditPoints = currentCredits * currentCGPA;

    simulatedSemesters.forEach(sem => {
        const semCredits = parseFloat(sem.credits) || 0;
        const semGPA = parseFloat(sem.gpa) || 0;
        
        if (semCredits > 0) {
            totalCredits += semCredits;
            totalCreditPoints += semCredits * semGPA;
        }
    });

    const predictedCGPA = totalCredits > 0 ? totalCreditPoints / totalCredits : 0;
    return {
        predictedCGPA: parseFloat(predictedCGPA.toFixed(2)),
        totalCredits
    };
}

/**
 * Calculates the required GPA in remaining credits to achieve a target CGPA
 * @param {number} currentCredits - Credits already completed
 * @param {number} currentCGPA - Current cumulative CGPA
 * @param {number} targetCGPA - Target graduation CGPA
 * @param {number} remainingCredits - Remaining credits to graduate
 * @returns {Object} { possible: boolean, requiredGPA: number, reason: string }
 */
export function calculateRequiredGPA(currentCredits, currentCGPA, targetCGPA, remainingCredits) {
    if (remainingCredits <= 0) {
        return {
            possible: false,
            requiredGPA: 0,
            reason: "No remaining credits specified."
        };
    }

    const totalCredits = currentCredits + remainingCredits;
    const totalRequiredPoints = totalCredits * targetCGPA;
    const currentPoints = currentCredits * currentCGPA;
    const requiredPoints = totalRequiredPoints - currentPoints;
    const requiredGPA = requiredPoints / remainingCredits;

    if (requiredGPA > 10.0) {
        return {
            possible: false,
            requiredGPA: parseFloat(requiredGPA.toFixed(2)),
            reason: `Requires a ${requiredGPA.toFixed(2)} GPA, which exceeds the max grade scale (10.0). Try adjusting your target CGPA or completing more credits.`
        };
    }

    if (requiredGPA < 0) {
        return {
            possible: true,
            requiredGPA: 0.0,
            reason: `Target already achieved! You need a 0.0 GPA (just pass your classes).`
        };
    }

    return {
        possible: true,
        requiredGPA: parseFloat(requiredGPA.toFixed(2)),
        reason: `You need an average of ${requiredGPA.toFixed(2)} GPA over your remaining ${remainingCredits} credits to hit a ${targetCGPA.toFixed(2)} CGPA.`
    };
}
