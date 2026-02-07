import React from 'react';
import PropTypes from 'prop-types';

const SquircleCard = ({ children, className = '', onClick }) => {
    if (onClick) {
        return (
            <button
                type="button"
                onClick={onClick}
                className={`bg-white rounded-[2.5rem] border border-slate-100/50 shadow-sm hover:shadow-xl transition-all duration-300 relative group overflow-hidden w-full text-left ${className}`}
            >
                <div className="relative h-full w-full">
                    {children}
                </div>
            </button>
        );
    }

    return (
        <div
            className={`bg-white rounded-[2.5rem] border border-slate-100/50 shadow-sm hover:shadow-xl transition-all duration-300 relative group overflow-hidden ${className}`}
        >
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

