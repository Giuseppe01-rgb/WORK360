/**
 * Push Notifications Utility
 * Handles subscription to push notifications for PWA
 */

const API_URL = import.meta.env.VITE_API_URL || 'https://work360-production.up.railway.app';

/**
 * Check if push notifications are supported
 */
export function isPushSupported() {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/**
 * Check current notification permission
 * @returns {'granted' | 'denied' | 'default'}
 */
export function getNotificationPermission() {
    if (!('Notification' in window)) return 'denied';
    return Notification.permission;
}

/**
 * Request notification permission
 * @returns {Promise<boolean>} - Whether permission was granted
 */
export async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        console.warn('Notifications not supported');
        return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
}

/**
 * Get VAPID public key from server
 */
async function getVapidPublicKey() {
    const response = await fetch(`${API_URL}/api/push/vapid-public-key`);
    if (!response.ok) {
        throw new Error('Failed to get VAPID key');
    }
    const data = await response.json();
    return data.publicKey;
}

/**
 * Convert VAPID key to Uint8Array
 */
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

/**
 * Subscribe to push notifications
 * @param {string} authToken - JWT token for API authentication
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function subscribeToPush(authToken) {
    if (!isPushSupported()) {
        return { success: false, message: 'Push notifications non supportate su questo browser' };
    }

    // Request permission first
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
        return { success: false, message: 'Permesso notifiche negato' };
    }

    try {
        // Get the service worker registration
        const registration = await navigator.serviceWorker.ready;

        // Get VAPID public key
        const vapidPublicKey = await getVapidPublicKey();

        // Subscribe to push
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
        });

        // Send subscription to backend
        const response = await fetch(`${API_URL}/api/push/subscribe`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ subscription })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Subscription failed');
        }

        const data = await response.json();
        return { success: true, message: data.message };
    } catch (error) {
        console.error('Push subscription error:', error);
        return { success: false, message: error.message || 'Errore durante l\'attivazione' };
    }
}

/**
 * Unsubscribe from push notifications
 * @param {string} authToken - JWT token for API authentication
 */
export async function unsubscribeFromPush(authToken) {
    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        if (subscription) {
            // Unsubscribe locally
            await subscription.unsubscribe();

            // Notify backend
            await fetch(`${API_URL}/api/push/unsubscribe`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({ endpoint: subscription.endpoint })
            });
        }

        return { success: true, message: 'Notifiche disattivate' };
    } catch (error) {
        console.error('Unsubscribe error:', error);
        return { success: false, message: 'Errore durante la disattivazione' };
    }
}

/**
 * Check if user is currently subscribed
 */
export async function isSubscribedToPush() {
    if (!isPushSupported()) return false;

    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        return !!subscription;
    } catch {
        return false;
    }
}

/**
 * Send test notification
 * @param {string} authToken - JWT token
 */
export async function sendTestNotification(authToken) {
    try {
        const response = await fetch(`${API_URL}/api/push/test`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            }
        });

        const data = await response.json();
        return { success: response.ok, message: data.message };
    } catch (error) {
        return { success: false, message: error.message };
    }
}
