import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const PortalModal = ({ children, onClose }) => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        // Prevent body scroll and overscroll
        document.body.style.overflow = 'hidden';
        document.body.style.overscrollBehavior = 'none';

        return () => {
            document.body.style.overflow = 'unset';
            document.body.style.overscrollBehavior = 'unset';
        };
    }, []);

    // Handle ESC key
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape' && onClose) onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    if (!mounted) return null;

    return createPortal(
        children,
        document.body
    );
};

export default PortalModal;
