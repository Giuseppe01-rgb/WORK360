import { createContext, useContext, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { AlertTriangle, Trash2, HelpCircle, X } from 'lucide-react';

const ConfirmModalContext = createContext();

/**
 * Hook per mostrare modali di conferma
 * @returns {{ showConfirm: Function }}
 * 
 * @example
 * const { showConfirm } = useConfirmModal();
 * 
 * const handleDelete = async () => {
 *   const confirmed = await showConfirm({
 *     title: 'Elimina cantiere',
 *     message: 'Sei sicuro di voler eliminare questo cantiere?',
 *     confirmText: 'Elimina',
 *     variant: 'danger'
 *   });
 *   if (confirmed) {
 *     // procedi con l'eliminazione
 *   }
 * };
 */
export const useConfirmModal = () => {
    const context = useContext(ConfirmModalContext);
    if (!context) {
        throw new Error('useConfirmModal must be used within ConfirmModalProvider');
    }
    return context;
};

/**
 * Provider per le modali di conferma
 * Avvolge l'app per permettere l'uso di showConfirm in qualsiasi componente
 */
export const ConfirmModalProvider = ({ children }) => {
    const [modalState, setModalState] = useState({
        isOpen: false,
        title: '',
        message: '',
        confirmText: 'Conferma',
        cancelText: 'Annulla',
        variant: 'default', // 'default' | 'danger' | 'warning'
        onConfirm: null,
        onCancel: null
    });

    /**
     * Mostra una modale di conferma
     * @param {Object} options
     * @param {string} options.title - Titolo della modale
     * @param {string} options.message - Messaggio/descrizione
     * @param {string} options.confirmText - Testo bottone conferma (default: 'Conferma')
     * @param {string} options.cancelText - Testo bottone annulla (default: 'Annulla')
     * @param {'default'|'danger'|'warning'} options.variant - Stile della modale
     * @returns {Promise<boolean>} - true se confermato, false se annullato
     */
    const showConfirm = useCallback((options) => {
        return new Promise((resolve) => {
            const closeAndResolve = (result) => {
                setModalState(prev => ({ ...prev, isOpen: false }));
                resolve(result);
            };

            setModalState({
                isOpen: true,
                title: options.title || 'Conferma',
                message: options.message || 'Sei sicuro di voler procedere?',
                confirmText: options.confirmText || 'Conferma',
                cancelText: options.cancelText || 'Annulla',
                variant: options.variant || 'default',
                onConfirm: () => closeAndResolve(true),
                onCancel: () => closeAndResolve(false)
            });
        });
    }, []);

    // Configurazione stili per varianti
    const variantConfig = {
        default: {
            icon: HelpCircle,
            iconBg: 'bg-blue-100',
            iconColor: 'text-blue-600',
            confirmBg: 'bg-blue-600 hover:bg-blue-700',
            confirmText: 'text-white'
        },
        danger: {
            icon: Trash2,
            iconBg: 'bg-red-100',
            iconColor: 'text-red-600',
            confirmBg: 'bg-red-600 hover:bg-red-700',
            confirmText: 'text-white'
        },
        warning: {
            icon: AlertTriangle,
            iconBg: 'bg-amber-100',
            iconColor: 'text-amber-600',
            confirmBg: 'bg-amber-600 hover:bg-amber-700',
            confirmText: 'text-white'
        }
    };

    const config = variantConfig[modalState.variant] || variantConfig.default;
    const Icon = config.icon;

    return (
        <ConfirmModalContext.Provider value={{ showConfirm }}>
            {children}

            {/* Modal Overlay */}
            {modalState.isOpen && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4"
                    onClick={(e) => { if (e.target === e.currentTarget) modalState.onCancel(); }}
                >
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-none" />

                    {/* Modal Content */}
                    <div
                        className="relative bg-white rounded-[2.5rem] shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 fade-in duration-200"
                    >
                        {/* Close button */}
                        <button
                            onClick={modalState.onCancel}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        {/* Icon */}
                        <div className={`w-14 h-14 ${config.iconBg} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                            <Icon className={`w-7 h-7 ${config.iconColor}`} />
                        </div>

                        {/* Title */}
                        <h3 className="text-xl font-bold text-slate-900 text-center mb-2">
                            {modalState.title}
                        </h3>

                        {/* Message */}
                        <p className="text-slate-600 text-center mb-6 leading-relaxed">
                            {modalState.message}
                        </p>

                        {/* Buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={modalState.onCancel}
                                className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors"
                            >
                                {modalState.cancelText}
                            </button>
                            <button
                                onClick={modalState.onConfirm}
                                className={`flex-1 px-4 py-3 ${config.confirmBg} ${config.confirmText} font-semibold rounded-xl transition-colors`}
                            >
                                {modalState.confirmText}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </ConfirmModalContext.Provider>
    );
};

ConfirmModalProvider.propTypes = {
    children: PropTypes.node.isRequired
};
