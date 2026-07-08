/**
 * Grade scale utilities
 * Default and customizable grade to points mapping
 */

export const DEFAULT_GRADE_SCALE = {
    'O': 10,
    'A+': 9,
    'A': 8,
    'B+': 7,
    'B': 6,
    'C': 5,
    'F': 0
};

let activeScale = Object.assign({}, DEFAULT_GRADE_SCALE);

/**
 * Set a custom grade scale. The scale should be an object mapping grade labels to numeric points.
 * @param {Object} scale
 */
export function setGradeScale(scale) {
    if (scale && typeof scale === 'object') {
        activeScale = Object.assign({}, scale);
    }
}

/**
 * Get the active grade scale
 * @returns {Object}
 */
export function getGradeScale() {
    return Object.assign({}, activeScale);
}

/**
 * Convert a grade label to numeric points using the active scale
 * @param {string} grade
 * @returns {number}
 */
export function gradeToPoints(grade) {
    if (!grade) return 0;
    const val = activeScale[String(grade).trim()];
    return typeof val === 'number' ? val : 0;
}

/**
 * Get maximum possible grade point in the current scale
 * @returns {number}
 */
export function maxGradePoint() {
    return Math.max(...Object.values(activeScale));
}

/**
 * Find a grade label matching given points. If exact match not found,
 * return the nearest grade label (highest <= points), else the max label.
 * @param {number} points
 * @returns {string}
 */
export function pointsToGrade(points) {
    const entries = Object.entries(activeScale).map(([g,p]) => ({ g, p }));
    // try exact
    for (const e of entries) {
        if (e.p === points) return e.g;
    }
    // find closest by absolute distance
    entries.sort((a,b) => Math.abs(a.p - points) - Math.abs(b.p - points));
    return entries.length ? entries[0].g : Object.keys(DEFAULT_GRADE_SCALE)[0];
}

