import React from 'react';
import { useChatContext } from '../context/ChatContext';

const WelcomeScreen: React.FC = () => {
    const { sendMessage } = useChatContext();

    const quickActions = [
        { icon: '💡', label: 'Explain', prompt: 'Explain the following: ' },
        { icon: '📝', label: 'Summarize', prompt: 'Summarize the following: ' },
        { icon: '🌐', label: 'Translate', prompt: 'Translate the following to English: ' },
        { icon: '💻', label: 'Code', prompt: 'Write code to: ' },
    ];

    return (
        <div className="flex flex-col items-center justify-center h-full px-6 pb-10">
            {/* Logo */}
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mb-5 shadow-xl shadow-violet-500/20">
                <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
            </div>

            <h2 className="text-lg font-semibold text-white/90 mb-1">How can I help?</h2>
            <p className="text-sm text-white/30 mb-8 text-center">Ask anything or pick an action below.</p>

            {/* Quick actions */}
            <div className="grid grid-cols-2 gap-2.5 w-full max-w-[280px]">
                {quickActions.map((action) => (
                    <button
                        key={action.label}
                        onClick={() => sendMessage(action.prompt)}
                        className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] hover:border-white/[0.12] transition-all text-left group"
                    >
                        <span className="text-base">{action.icon}</span>
                        <span className="text-xs font-medium text-white/50 group-hover:text-white/70 transition-colors">{action.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default WelcomeScreen;
