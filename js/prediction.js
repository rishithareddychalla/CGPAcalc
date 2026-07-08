/**
 * Prediction facade - keeps backwards compatibility for existing imports
 * Delegates to new planner calculation utilities.
 */

import { predictFinalCGPA as _predictFinalCGPA, calculateRequiredGPA as _calculateRequiredGPA } from './planner/calculations.js';

/**
 * Predict final CGPA (backwards-compatible)
 */
export function predictFinalCGPA(currentCredits, currentCGPA, simulatedSemesters) {
    return _predictFinalCGPA(currentCredits, currentCGPA, simulatedSemesters);
}

/**
 * Calculate required GPA (backwards-compatible)
 */
export function calculateRequiredGPA(currentCredits, currentCGPA, targetCGPA, remainingCredits) {
    return _calculateRequiredGPA(currentCredits, currentCGPA, targetCGPA, remainingCredits);
}
