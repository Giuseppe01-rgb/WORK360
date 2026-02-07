import { AlertTriangle } from 'lucide-react';
import PropTypes from 'prop-types';

const ConfirmDialog = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Conferma', cancelText = 'Annulla', type = 'danger' }) => {
    if (!isOpen) return null;

    const typeConfig = {
        danger: {
            bgColor: 'bg-red-600',
            hoverColor: 'hover:bg-red-700',
            icon: 'text-red-600'
        },
        warning: {
            bgColor: 'bg-orange-600',
            hoverColor: 'hover:bg-orange-700',
            icon: 'text-orange-600'
        },
        info: {
            bgColor: 'bg-[#5D5FEF]',
            hoverColor: 'hover:bg-[#4B4DDB]',
            icon: 'text-[#5D5FEF]'
        }
    };

    const config = typeConfig[type] || typeConfig.danger;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-md w-full p-8 animate-in zoom-in-95 duration-200">
                {/* Icon */}
                <div className="flex justify-center mb-6">
                    <div className={`w-16 h-16 rounded-full bg-${type === 'danger' ? 'red' : type === 'warning' ? 'orange' : 'blue'}-50 flex items-center justify-center`}>
                        <AlertTriangle className={`w-8 h-8 ${config.icon}`} />
                    </div>
                </div>

                {/* Content */}
                <div className="text-center mb-8">
                    <h3 className="text-2xl font-bold text-slate-900 mb-3">{title}</h3>
                    <p className="text-slate-600 leading-relaxed">{message}</p>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-6 py-3.5 border-2 border-slate-200 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition-all"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={`flex-1 px-6 py-3.5 ${config.bgColor} ${config.hoverColor} text-white rounded-xl font-bold shadow-lg transition-all transform hover:-translate-y-0.5`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

ConfirmDialog.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onConfirm: PropTypes.func.isRequired,
    title: PropTypes.string.isRequired,
    message: PropTypes.string.isRequired,
    confirmText: PropTypes.string,
    cancelText: PropTypes.string,
    type: PropTypes.oneOf(['danger', 'warning', 'info'])
};

export default ConfirmDialog;

