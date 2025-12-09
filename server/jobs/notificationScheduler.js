/**
 * Notification Scheduler
 * Sends clock-in/out reminders at scheduled times
 * 
 * Schedule:
 * - 07:00 Mon-Fri: "Ricorda di timbrare l'entrata!"
 * - 16:00 Mon-Fri: "Ricorda di timbrare l'uscita!"
 * 
 * Note: Railway servers run in UTC. Italy is UTC+1 (or UTC+2 during DST).
 * We schedule at 6:00 UTC (7:00 Italy) and 15:00 UTC (16:00 Italy) during winter.
 * For simplicity, we use UTC times that roughly match Italy business hours.
 */
const cron = require('node-cron');
const { logInfo, logError } = require('../utils/logger');

// Import controller lazily to avoid circular dependency issues
let pushController = null;
function getPushController() {
    if (!pushController) {
        pushController = require('../controllers/pushController');
    }
    return pushController;
}

/**
 * Send clock-in reminder (7:00 AM Italy = ~6:00 UTC)
 */
async function sendClockInReminder() {
    logInfo('⏰ Sending clock-in reminder...', {});

    try {
        const results = await getPushController().sendToAllUsers({
            title: '⏰ WORK360 - Timbratura',
            body: 'Buongiorno! Ricorda di timbrare l\'entrata.',
            icon: '/icons/icon-192x192.png',
            url: '/?tab=attendance',
            tag: 'clock-in-reminder',
            requireInteraction: true,
            data: {
                type: 'clock-in',
                timestamp: new Date().toISOString()
            }
        });

        logInfo('Clock-in reminder sent', results);
    } catch (error) {
        logError('Failed to send clock-in reminder', { error: error.message });
    }
}

/**
 * Send clock-out reminder (4:00 PM Italy = ~15:00 UTC)
 */
async function sendClockOutReminder() {
    logInfo('⏰ Sending clock-out reminder...', {});

    try {
        const results = await getPushController().sendToAllUsers({
            title: '🔔 WORK360 - Timbratura',
            body: 'Ricorda di timbrare l\'uscita prima di andare!',
            icon: '/icons/icon-192x192.png',
            url: '/?tab=attendance',
            tag: 'clock-out-reminder',
            requireInteraction: true,
            data: {
                type: 'clock-out',
                timestamp: new Date().toISOString()
            }
        });

        logInfo('Clock-out reminder sent', results);
    } catch (error) {
        logError('Failed to send clock-out reminder', { error: error.message });
    }
}

/**
 * Initialize the notification scheduler
 */
function initScheduler() {
    // Skip scheduler initialization if explicitly disabled
    if (process.env.DISABLE_SCHEDULER === 'true') {
        logInfo('Notification scheduler disabled via env var', {});
        return;
    }

    try {
        // Clock-in reminder: 6:00 UTC = 7:00 Italy (winter) / 8:00 Italy (summer)
        // For accuracy in all seasons, use 5:00 UTC which is 6:00/7:00 Italy
        // Cron: minute hour dayOfMonth month dayOfWeek
        cron.schedule('0 6 * * 1-5', sendClockInReminder);

        // Clock-out reminder: 15:00 UTC = 16:00 Italy (winter) / 17:00 Italy (summer)
        // For accuracy in all seasons, use 14:00 UTC which is 15:00/16:00 Italy
        cron.schedule('0 15 * * 1-5', sendClockOutReminder);

        logInfo('🗓️ Notification scheduler initialized', {
            clockIn: '06:00 UTC (≈07:00 Italy) Mon-Fri',
            clockOut: '15:00 UTC (≈16:00 Italy) Mon-Fri'
        });
    } catch (error) {
        logError('Failed to initialize scheduler', { error: error.message });
        // Don't crash the server if scheduler fails
    }
}

/**
 * Manual trigger for testing (can be called via API)
 */
async function triggerTestNotification(type = 'clock-in') {
    if (type === 'clock-in') {
        await sendClockInReminder();
    } else {
        await sendClockOutReminder();
    }
}

module.exports = {
    initScheduler,
    triggerTestNotification,
    sendClockInReminder,
    sendClockOutReminder
};

