/**
 * Calculate worked hours with automatic lunch break deduction
 * 
 * Business rule:
 * - If presence duration >= 6 hours → deduct 1 hour lunch break (unpaid)
 * - If presence duration < 6 hours → no lunch break deduction
 * 
 * @param {Date|string} clockIn - Clock in timestamp
 * @param {Date|string} clockOut - Clock out timestamp
 * @returns {Object} { presenceHours, workedHours, lunchBreakApplied }
 */
function calculateWorkedHours(clockIn, clockOut) {
    if (!clockIn || !clockOut) {
        return { presenceHours: 0, workedHours: 0, lunchBreakApplied: false };
    }

    const inTime = new Date(clockIn);
    const outTime = new Date(clockOut);

    // Calculate raw presence in milliseconds
    const presenceMs = outTime.getTime() - inTime.getTime();
    if (presenceMs <= 0) {
        return { presenceHours: 0, workedHours: 0, lunchBreakApplied: false };
    }

    // Convert to hours (decimal)
    const presenceHours = presenceMs / (1000 * 60 * 60);

    // Threshold for lunch break: 6 hours
    const thresholdHours = 6;
    // Lunch break duration: 1 hour
    const lunchBreakHours = 1;

    let workedHours;
    let lunchBreakApplied = false;

    if (presenceHours >= thresholdHours) {
        // Apply lunch break deduction
        workedHours = presenceHours - lunchBreakHours;
        lunchBreakApplied = true;
    } else {
        // No lunch break for short shifts
        workedHours = presenceHours;
    }

    // Ensure non-negative and round to 2 decimals
    workedHours = Math.max(0, workedHours);

    return {
        presenceHours: parseFloat(presenceHours.toFixed(2)),
        workedHours: parseFloat(workedHours.toFixed(2)),
        lunchBreakApplied
    };
}

/**
 * Calculate worked hours from a totalHours value (for migration)
 * Applies lunch break deduction if presence was >= 6 hours
 * 
 * @param {number} totalHours - Raw presence hours
 * @returns {Object} { presenceHours, workedHours, lunchBreakApplied }
 */
function recalculateWorkedHoursFromTotal(totalHours) {
    const presenceHours = parseFloat(totalHours) || 0;

    if (presenceHours <= 0) {
        return { presenceHours: 0, workedHours: 0, lunchBreakApplied: false };
    }

    const thresholdHours = 6;
    const lunchBreakHours = 1;

    let workedHours;
    let lunchBreakApplied = false;

    if (presenceHours >= thresholdHours) {
        workedHours = presenceHours - lunchBreakHours;
        lunchBreakApplied = true;
    } else {
        workedHours = presenceHours;
    }

    return {
        presenceHours: parseFloat(presenceHours.toFixed(2)),
        workedHours: parseFloat(Math.max(0, workedHours).toFixed(2)),
        lunchBreakApplied
    };
}

module.exports = { calculateWorkedHours, recalculateWorkedHoursFromTotal };
