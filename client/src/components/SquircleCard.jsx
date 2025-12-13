import React from 'react';

const SquircleCard = ({ children, className = '', onClick }) => {
    return (
        <div
            onClick={onClick}
            className={`relative group transition-all duration-300 drop-shadow-sm hover:drop-shadow-xl ${className}`}
            style={{
                // Ensure the wrapper doesn't clip the shadow
                willChange: 'filter'
            }}
        >
            <div
                className="w-full h-full bg-white overflow-hidden"
                style={{
                    maskImage: 'url(/squircle.svg)',
                    WebkitMaskImage: 'url(/squircle.svg)',
                    maskSize: '100% 100%',
                    WebkitMaskSize: '100% 100%',
                    maskRepeat: 'no-repeat',
                    WebkitMaskRepeat: 'no-repeat'
                }}
            >
                {/* Border Simulation - Inset Shadow to survive the mask clipping */}
                <div className="absolute inset-0 pointer-events-none z-50 shadow-[inset_0_0_0_1px_rgba(241,245,249,1)]" />

                {/* Content */}
                <div className="relative h-full w-full">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default SquircleCard;
