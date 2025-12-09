import { useState, useEffect } from 'react';
import { Bell, BellOff, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import {
    isPushSupported,
    isSubscribedToPush,
    subscribeToPush,
    unsubscribeFromPush,
    sendTestNotification,
    getNotificationPermission
} from '../../utils/pushNotifications';

export default function NotificationSettings() {
    // Get token from localStorage since AuthContext doesn't expose it
    const token = localStorage.getItem('token');
    const { showSuccess, showError, showInfo } = useToast();


    const [isSupported, setIsSupported] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [permission, setPermission] = useState('default');

    useEffect(() => {
        checkStatus();
    }, []);

    const checkStatus = async () => {
        setIsLoading(true);
        setIsSupported(isPushSupported());
        setPermission(getNotificationPermission());

        if (isPushSupported()) {
            const subscribed = await isSubscribedToPush();
            setIsSubscribed(subscribed);
        }
        setIsLoading(false);
    };

    const handleToggle = async () => {
        if (!token) {
            showError('Devi essere loggato per attivare le notifiche');
            return;
        }

        setIsLoading(true);
        try {
            if (isSubscribed) {
                const result = await unsubscribeFromPush(token);
                if (result.success) {
                    showSuccess('Notifiche disattivate');
                    setIsSubscribed(false);
                } else {
                    showError(result.message);
                }
            } else {
                const result = await subscribeToPush(token);
                if (result.success) {
                    showSuccess('🔔 Notifiche attivate! Riceverai promemoria per le timbrature.');
                    setIsSubscribed(true);
                } else {
                    showError(result.message);
                }
            }
        } catch (error) {
            showError('Errore durante l\'operazione');
        }
        setIsLoading(false);
    };

    const handleTestNotification = async () => {
        if (!token) return;

        showInfo('Invio notifica di test...');
        const result = await sendTestNotification(token);
        if (result.success) {
            showSuccess(result.message);
        } else {
            showError(result.message);
        }
    };

    if (isLoading) {
        return (
            <div className="bg-white rounded-xl p-4 flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                <span className="text-slate-500 text-sm">Caricamento...</span>
            </div>
        );
    }

    if (!isSupported) {
        return (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    <div>
                        <p className="font-medium text-amber-800">Notifiche non supportate</p>
                        <p className="text-sm text-amber-700">
                            Il tuo browser non supporta le notifiche push.
                            {/iPhone|iPad/.test(navigator.userAgent) &&
                                ' Su iOS, installa prima l\'app sulla home screen.'}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (permission === 'denied') {
        return (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                    <BellOff className="w-5 h-5 text-red-600" />
                    <div>
                        <p className="font-medium text-red-800">Notifiche bloccate</p>
                        <p className="text-sm text-red-700">
                            Hai bloccato le notifiche. Vai nelle impostazioni del browser per riattivarle.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {isSubscribed ? (
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                            <Bell className="w-5 h-5 text-green-600" />
                        </div>
                    ) : (
                        <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                            <BellOff className="w-5 h-5 text-slate-400" />
                        </div>
                    )}
                    <div>
                        <p className="font-semibold text-slate-900">
                            Notifiche Timbratura
                        </p>
                        <p className="text-sm text-slate-500">
                            {isSubscribed
                                ? 'Ricevi promemoria alle 7:00 e 16:00'
                                : 'Attiva per ricevere promemoria'}
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleToggle}
                    disabled={isLoading}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isSubscribed ? 'bg-green-500' : 'bg-slate-300'
                        }`}
                >
                    <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isSubscribed ? 'translate-x-6' : 'translate-x-1'
                            }`}
                    />
                </button>
            </div>

            {isSubscribed && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                    <button
                        onClick={handleTestNotification}
                        className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                        <CheckCircle className="w-4 h-4" />
                        Invia notifica di test
                    </button>
                </div>
            )}
        </div>
    );
}
