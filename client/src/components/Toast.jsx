import { X, CheckCircle, XCircle, AlertTriangle, Info, Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import PropTypes from 'prop-types';

const Toast = ({ type = 'info', message, onClose, duration = 5000 }) => {
    useEffect(() => {
        if (duration > 0) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [duration, onClose]);

    // Check if this is a loading/progress toast
    const isLoading = type === 'info' && typeof message === 'string' && (message.includes('Sto ') || message.includes('⏳'));

    const typeConfig = {
        success: {
            bgColor: 'bg-green-50',
            borderColor: 'border-green-200',
            textColor: 'text-green-800',
            icon: CheckCircle,
            iconColor: 'text-green-600'
        },
        error: {
            bgColor: 'bg-red-50',
            borderColor: 'border-red-200',
            textColor: 'text-red-800',
            icon: XCircle,
            iconColor: 'text-red-600'
        },
        warning: {
            bgColor: 'bg-orange-50',
            borderColor: 'border-orange-200',
            textColor: 'text-orange-800',
            icon: AlertTriangle,
            iconColor: 'text-orange-600'
        },
        info: {
            bgColor: 'bg-blue-50',
            borderColor: 'border-blue-200',
            textColor: 'text-blue-800',
            icon: isLoading ? Loader2 : Info,
            iconColor: 'text-blue-600'
        }
    };

    const config = typeConfig[type] || typeConfig.info;
    const Icon = config.icon;

    return (
        <div className={`${config.bgColor} ${config.borderColor} ${config.textColor} border-2 rounded-[2.5rem] shadow-lg p-4 flex items-start gap-3 min-w-[320px] max-w-md animate-in slide-in-from-top-5 fade-in duration-300`}>
            <Icon className={`w-5 h-5 ${config.iconColor} flex-shrink-0 mt-0.5 ${isLoading ? 'animate-spin' : ''}`} />
            <p className="flex-1 text-sm font-medium leading-relaxed">{message}</p>
            <button
                onClick={onClose}
                className={`${config.textColor} hover:opacity-70 transition-opacity flex-shrink-0`}
                aria-label="Close"
            >
                <X className="w-5 h-5" />
            </button>
        </div>
    );
};

Toast.propTypes = {
    type: PropTypes.oneOf(['success', 'error', 'warning', 'info']),
    message: PropTypes.string.isRequired,
    onClose: PropTypes.func.isRequired,
    duration: PropTypes.number
};

export default Toast;

