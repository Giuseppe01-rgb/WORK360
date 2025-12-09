/**
 * Push Notification Controller
 * Handles subscription management and manual notification sending
 */
const PushSubscription = require('../models/PushSubscription');
const { sendPushNotification, sendBulkPushNotifications, getVapidPublicKey } = require('../utils/pushNotification');
const { logInfo, logError } = require('../utils/logger');

/**
 * Get VAPID public key for client
 */
exports.getVapidPublicKey = async (req, res) => {
    try {
        const publicKey = getVapidPublicKey();
        if (!publicKey) {
            return res.status(500).json({
                message: 'Push notifications not configured'
            });
        }
        res.json({ publicKey });
    } catch (error) {
        logError('Error getting VAPID key', { error: error.message });
        res.status(500).json({ message: 'Error getting push configuration' });
    }
};

/**
 * Subscribe to push notifications
 */
exports.subscribe = async (req, res) => {
    try {
        const { subscription } = req.body;
        const userId = req.user.id;

        if (!subscription || !subscription.endpoint || !subscription.keys) {
            return res.status(400).json({
                message: 'Invalid subscription data'
            });
        }

        // Check if endpoint already exists
        const existing = await PushSubscription.findOne({
            where: { endpoint: subscription.endpoint }
        });

        if (existing) {
            // Update existing subscription
            await existing.update({
                userId,
                p256dh: subscription.keys.p256dh,
                auth: subscription.keys.auth,
                userAgent: req.headers['user-agent'],
                isActive: true,
                failureCount: 0
            });

            logInfo('Push subscription updated', { userId, subscriptionId: existing.id });
            return res.json({
                message: 'Sottoscrizione aggiornata',
                subscriptionId: existing.id
            });
        }

        // Create new subscription
        const newSubscription = await PushSubscription.create({
            userId,
            endpoint: subscription.endpoint,
            p256dh: subscription.keys.p256dh,
            auth: subscription.keys.auth,
            userAgent: req.headers['user-agent']
        });

        logInfo('New push subscription created', { userId, subscriptionId: newSubscription.id });
        res.status(201).json({
            message: 'Notifiche attivate!',
            subscriptionId: newSubscription.id
        });
    } catch (error) {
        logError('Error subscribing to push', { error: error.message });
        res.status(500).json({ message: 'Errore durante l\'attivazione delle notifiche' });
    }
};

/**
 * Unsubscribe from push notifications
 */
exports.unsubscribe = async (req, res) => {
    try {
        const { endpoint } = req.body;
        const userId = req.user.id;

        const deleted = await PushSubscription.destroy({
            where: {
                userId,
                endpoint
            }
        });

        if (deleted) {
            logInfo('Push subscription removed', { userId });
            res.json({ message: 'Notifiche disattivate' });
        } else {
            res.status(404).json({ message: 'Sottoscrizione non trovata' });
        }
    } catch (error) {
        logError('Error unsubscribing from push', { error: error.message });
        res.status(500).json({ message: 'Errore durante la disattivazione' });
    }
};

/**
 * Check if user has active subscription
 */
exports.checkStatus = async (req, res) => {
    try {
        const userId = req.user.id;

        const subscription = await PushSubscription.findOne({
            where: { userId, isActive: true }
        });

        res.json({
            subscribed: !!subscription,
            subscriptionCount: subscription ? 1 : 0
        });
    } catch (error) {
        logError('Error checking push status', { error: error.message });
        res.status(500).json({ message: 'Error checking status' });
    }
};

/**
 * Send test notification to current user
 */
exports.sendTestNotification = async (req, res) => {
    try {
        const userId = req.user.id;

        const subscriptions = await PushSubscription.findAll({
            where: { userId, isActive: true }
        });

        if (subscriptions.length === 0) {
            return res.status(404).json({
                message: 'Nessuna sottoscrizione attiva. Attiva prima le notifiche.'
            });
        }

        const payload = {
            title: '🔔 Test WORK360',
            body: 'Le notifiche funzionano correttamente!',
            url: '/',
            tag: 'test-notification'
        };

        const results = await sendBulkPushNotifications(subscriptions, payload);

        // Update lastPushAt for successful sends
        if (results.sent > 0) {
            await PushSubscription.update(
                { lastPushAt: new Date() },
                { where: { userId, isActive: true } }
            );
        }

        // Deactivate expired subscriptions
        if (results.expired.length > 0) {
            await PushSubscription.update(
                { isActive: false },
                { where: { id: results.expired } }
            );
        }

        res.json({
            message: `Notifica test inviata a ${results.sent} dispositivo/i`,
            results
        });
    } catch (error) {
        logError('Error sending test notification', { error: error.message });
        res.status(500).json({ message: 'Errore durante l\'invio' });
    }
};

/**
 * Admin: Send notification to all users (for scheduler)
 * @internal
 */
exports.sendToAllUsers = async (payload) => {
    try {
        const subscriptions = await PushSubscription.findAll({
            where: { isActive: true }
        });

        if (subscriptions.length === 0) {
            logInfo('No active subscriptions for bulk push', {});
            return { sent: 0, total: 0 };
        }

        const results = await sendBulkPushNotifications(subscriptions, payload);

        // Update lastPushAt for all
        await PushSubscription.update(
            { lastPushAt: new Date() },
            { where: { isActive: true } }
        );

        // Deactivate expired subscriptions
        if (results.expired.length > 0) {
            await PushSubscription.update(
                { isActive: false },
                { where: { id: results.expired } }
            );
        }

        return results;
    } catch (error) {
        logError('Error in bulk push to all users', { error: error.message });
        throw error;
    }
};
