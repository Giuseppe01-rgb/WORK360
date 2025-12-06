/**
 * Centralized logging utility for WORK360
 * Provides structured logging for application events
 * 
 * Log Levels:
 * - INFO: Normal operations, successful actions
 * - ERROR: Technical failures, exceptions
 * - SECURITY: Security-relevant events (failed logins, rate limits, suspicious activity)
 */

/**
 * Format log message with timestamp, level, and metadata
 * @param {string} level - Log level (INFO, ERROR, SECURITY)
 * @param {string} message - Log message
 * @param {object} meta - Additional metadata to include
 * @returns {string} Formatted log string
 */
function formatLog(level, message, meta) {
    const time = new Date().toISOString();
    const metaString = Object.keys(meta || {}).length ? ` ${JSON.stringify(meta)}` : '';
    return `[${time}] [${level}] ${message}${metaString}`;
}

/**
 * Log informational messages
 * Use for: successful operations, normal flow events
 * @param {string} message - Log message
 * @param {object} meta - Additional context (userId, ip, etc.)
 */
function logInfo(message, meta = {}) {
    console.log(formatLog('INFO', message, meta));
}

/**
 * Log error messages
 * Use for: technical failures, exceptions, database errors
 * @param {string} message - Error message
 * @param {object} meta - Additional context (stack, userId, etc.)
 */
function logError(message, meta = {}) {
    console.error(formatLog('ERROR', message, meta));
}

/**
 * Log security events
 * Use for: failed logins, rate limits, unauthorized access attempts, suspicious activity
 * @param {string} message - Security event description
 * @param {object} meta - Additional context (ip, userId, path, etc.)
 */
function logSecurity(message, meta = {}) {
    console.warn(formatLog('SECURITY', message, meta));
}

module.exports = {
    logInfo,
    logError,
    logSecurity
};
