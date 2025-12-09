/**
 * Notification Scheduler
 * Sends clock-in/out reminders at scheduled times
 * 
 * Schedule:
 * - 07:00 Mon-Fri: "Ricorda di timbrare l'entrata!"
 * - 16:00 Mon-Fri: "Ricorda di timbrare l'uscita!"
 */
const cron = require('node-cron');
const { logInfo, logError } = require('../utils/logger');
const pushController = require('../controllers/pushController');

// Italy timezone offset (Europe/Rome)
const TIMEZONE = 'Europe/Rome';

/**
 * Send clock-in reminder (7:00 AM)
 */
async function sendClockInReminder() {
    logInfo('⏰ Sending clock-in reminder...', {});

    try {
        const results = await pushController.sendToAllUsers({
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
 * Send clock-out reminder (4:00 PM)
 */
async function sendClockOutReminder() {
    logInfo('⏰ Sending clock-out reminder...', {});

    try {
        const results = await pushController.sendToAllUsers({
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
    // Skip scheduler initialization if not in production or explicitly disabled
    if (process.env.DISABLE_SCHEDULER === 'true') {
        logInfo('Notification scheduler disabled via env var', {});
        return;
    }

    // Clock-in reminder: 7:00 AM Monday-Friday (Italy time)
    // Cron: minute hour dayOfMonth month dayOfWeek
    cron.schedule('0 7 * * 1-5', sendClockInReminder, {
        scheduled: true,
        timezone: TIMEZONE
    });

    // Clock-out reminder: 4:00 PM (16:00) Monday-Friday (Italy time)
    cron.schedule('0 16 * * 1-5', sendClockOutReminder, {
        scheduled: true,
        timezone: TIMEZONE
    });

    logInfo('🗓️ Notification scheduler initialized', {
        clockIn: '07:00 Mon-Fri (Europe/Rome)',
        clockOut: '16:00 Mon-Fri (Europe/Rome)'
    });
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
