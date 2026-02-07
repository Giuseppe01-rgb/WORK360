/**
 * Date validation utilities for PostgreSQL migration
 * Sanitizes invalid date strings that frontend may send
 */

const sanitizeDates = (data, dateFields) => {
    const sanitized = { ...data };

    dateFields.forEach(field => {
        if (sanitized[field] && (
            sanitized[field] === 'Invalid date' ||
            sanitized[field] === 'Invalid Date' ||
            sanitized[field] === '' ||
            Number.isNaN(new Date(sanitized[field]).getTime())
        )) {
            delete sanitized[field];
        }
    });

    return sanitized;
};

const sanitizeAllDates = (data) => {
    const sanitized = { ...data };

    // Common date field names
    const dateFieldPatterns = ['date', 'Date', 'startDate', 'endDate', 'birthDate', 'createdAt', 'updatedAt'];

    Object.keys(sanitized).forEach(key => {
        const isDateField = dateFieldPatterns.some(pattern => key.includes(pattern));
        const value = sanitized[key];

        if (isDateField && value && (
            value === 'Invalid date' ||
            value === 'Invalid Date' ||
            value === '' ||
            (typeof value === 'string' && Number.isNaN(new Date(value).getTime()))
        )) {
            delete sanitized[key];
        }
    });

    return sanitized;
};

module.exports = {
    sanitizeDates,
    sanitizeAllDates
};
