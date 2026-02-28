import React from 'react';

interface ErrorBannerProps {
    message: string;
    onClose: () => void;
}

const ErrorBanner: React.FC<ErrorBannerProps> = ({ message, onClose }) => {
    return (
        <div className="mx-3 mt-2 flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-300 text-xs rounded-lg px-3 py-2 shrink-0">
            <svg className="w-4 h-4 shrink-0 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span className="flex-1 leading-tight">{message}</span>
            <button onClick={onClose} className="text-red-400/60 hover:text-red-300 transition-colors shrink-0">
                ✕
            </button>
        </div>
    );
};

export default ErrorBanner;
