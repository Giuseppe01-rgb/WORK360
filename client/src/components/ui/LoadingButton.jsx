import { Loader2 } from 'lucide-react';

/**
 * Bottone riutilizzabile con supporto per stato di loading
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Contenuto del bottone
 * @param {'primary'|'secondary'|'danger'|'ghost'} props.variant - Stile del bottone
 * @param {'sm'|'md'|'lg'} props.size - Dimensione del bottone
 * @param {boolean} props.isLoading - Se true, mostra spinner e disabilita
 * @param {string} props.loadingText - Testo da mostrare durante loading
 * @param {boolean} props.disabled - Disabilita il bottone
 * @param {boolean} props.fullWidth - Larghezza 100%
 * @param {string} props.className - Classi CSS aggiuntive
 * 
 * @example
 * <LoadingButton 
 *   variant="primary" 
 *   isLoading={isSaving} 
 *   loadingText="Salvando..."
 *   onClick={handleSave}
 * >
 *   Salva Cantiere
 * </LoadingButton>
 */
const LoadingButton = ({
    children,
    variant = 'primary',
    size = 'md',
    isLoading = false,
    loadingText,
    disabled = false,
    fullWidth = false,
    className = '',
    type = 'button',
    onClick,
    ...props
}) => {
    // Configurazione varianti
    const variants = {
        primary: 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-400',
        secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:bg-slate-50 disabled:text-slate-400',
        danger: 'bg-red-600 hover:bg-red-700 text-white disabled:bg-red-400',
        ghost: 'bg-transparent hover:bg-slate-100 text-slate-600 disabled:text-slate-300',
        success: 'bg-green-600 hover:bg-green-700 text-white disabled:bg-green-400'
    };

    // Configurazione dimensioni
    const sizes = {
        sm: 'px-3 py-1.5 text-sm rounded-lg',
        md: 'px-4 py-2.5 text-sm rounded-xl',
        lg: 'px-6 py-3 text-base rounded-xl'
    };

    const variantClasses = variants[variant] || variants.primary;
    const sizeClasses = sizes[size] || sizes.md;
    const widthClass = fullWidth ? 'w-full' : '';

    const isDisabled = disabled || isLoading;

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={isDisabled}
            className={`
                ${variantClasses}
                ${sizeClasses}
                ${widthClass}
                font-semibold
                transition-all
                duration-200
                flex
                items-center
                justify-center
                gap-2
                disabled:cursor-not-allowed
                ${className}
            `}
            {...props}
        >
            {isLoading && (
                <Loader2 className="w-4 h-4 animate-spin" />
            )}
            <span>
                {isLoading ? (loadingText || children) : children}
            </span>
        </button>
    );
};

export default LoadingButton;
