import React from 'react';

const SquircleCard = ({ children, className = '', onClick }) => {
    return (
        <div
            onClick={onClick}
            className={`bg-white rounded-[5rem] border border-slate-100/50 shadow-sm hover:shadow-xl transition-all duration-300 relative group overflow-hidden ${className}`}
        >
            {/* Content */}
            <div className="relative h-full w-full">
                {children}
            </div>
        </div>
    );
};

export default SquircleCard;
