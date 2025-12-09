/**
 * Push Notification Utility
 * Sends Web Push notifications to subscribed users
 */
const webpush = require('web-push');
const { logInfo, logError } = require('./logger');

// Configure web-push with VAPID keys
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidEmail = process.env.VAPID_EMAIL || 'mailto:colorasnc@gmail.com';

if (vapidPublicKey && vapidPrivateKey) {
    webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);
    logInfo('Web Push configured successfully', { vapidPublicKey: vapidPublicKey.substring(0, 20) + '...' });
} else {
    logError('VAPID keys not configured! Push notifications will not work.', {});
}

/**
 * Send push notification to a single subscription
 * @param {Object} subscription - Push subscription object with endpoint, keys
 * @param {Object} payload - Notification payload { title, body, icon, url, tag }
 * @returns {Promise<boolean>} - Success status
 */
async function sendPushNotification(subscription, payload) {
    if (!vapidPublicKey || !vapidPrivateKey) {
        logError('Cannot send push: VAPID keys not configured', {});
        return false;
    }

    const pushSubscription = {
        endpoint: subscription.endpoint,
        keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth
        }
    };

    const notificationPayload = JSON.stringify({
        title: payload.title || 'WORK360',
        body: payload.body || '',
        icon: payload.icon || '/icons/icon-192x192.png',
        badge: payload.badge || '/icons/icon-72x72.png',
        url: payload.url || '/',
        tag: payload.tag || 'work360-notification',
        requireInteraction: payload.requireInteraction || false,
        data: payload.data || {}
    });

    try {
        await webpush.sendNotification(pushSubscription, notificationPayload);
        logInfo('Push notification sent', { endpoint: subscription.endpoint.substring(0, 50) });
        return true;
    } catch (error) {
        // Handle specific errors
        if (error.statusCode === 410 || error.statusCode === 404) {
            // Subscription expired or removed
            logInfo('Push subscription expired, needs cleanup', {
                endpoint: subscription.endpoint.substring(0, 50),
                statusCode: error.statusCode
            });
            return { expired: true };
        }

        logError('Failed to send push notification', {
            error: error.message,
            statusCode: error.statusCode
        });
        return false;
    }
}

/**
 * Send push notification to multiple subscriptions
 * @param {Array} subscriptions - Array of subscription objects
 * @param {Object} payload - Notification payload
 * @returns {Promise<Object>} - Results { sent, failed, expired }
 */
async function sendBulkPushNotifications(subscriptions, payload) {
    const results = {
        sent: 0,
        failed: 0,
        expired: [],
        total: subscriptions.length
    };

    const promises = subscriptions.map(async (sub) => {
        const result = await sendPushNotification(sub, payload);
        if (result === true) {
            results.sent++;
        } else if (result && result.expired) {
            results.expired.push(sub.id);
        } else {
            results.failed++;
        }
    });

    await Promise.all(promises);

    logInfo('Bulk push completed', results);
    return results;
}

/**
 * Get VAPID public key for client
 */
function getVapidPublicKey() {
    return vapidPublicKey;
}

module.exports = {
    sendPushNotification,
    sendBulkPushNotifications,
    getVapidPublicKey
};
