import React from 'react';
import PropTypes from 'prop-types';

const SquircleCard = ({ children, className = '', onClick }) => {
    return (
        <div
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
            onClick={onClick}
            onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick(e) : undefined}
            className={`bg-white rounded-[2.5rem] border border-slate-100/50 shadow-sm hover:shadow-xl transition-all duration-300 relative group overflow-hidden ${className}`}
        >
            {/* Content */}
            <div className="relative h-full w-full">
                {children}
            </div>
        </div>
    );
};

SquircleCard.propTypes = {
    children: PropTypes.node,
    className: PropTypes.string,
    onClick: PropTypes.func
};

export default SquircleCard;

