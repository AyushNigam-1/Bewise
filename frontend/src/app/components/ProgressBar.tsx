import React from 'react';

const ProgressBar = ({ completed, total }: { completed: number, total: number }) => {
    const radius = 45;
    const stroke = 8;
    const normalizedRadius = radius - stroke / 2;
    const circumference = 2 * Math.PI * normalizedRadius;
    const percentage = total === 0 ? 0 : (completed / total) * 100;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <div className="size-10 md:size-12.5 relative">
            <svg height="100%" width="100%" viewBox="0 0 100 100">
                <circle
                    className='stroke-gray-200' // Tailwind gray-200
                    fill="transparent"
                    strokeWidth={stroke}
                    r={normalizedRadius}
                    cx="50"
                    cy="50"
                />
                <circle
                    // Tailwind green-500
                    className='stroke-gray-600'
                    fill="transparent"
                    strokeWidth={stroke}
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    r={normalizedRadius}
                    cx="50"
                    cy="50"
                    transform="rotate(-90 50 50)"
                />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold">
                {percentage.toFixed(0)}%
            </div>
        </div>
    );
};

export default ProgressBar;
