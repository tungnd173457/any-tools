import React from 'react';
import { useChatContext } from '../context/ChatContext';

interface ChatHeaderProps {
    onToggleHistory: () => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ onToggleHistory }) => {
    const { currentConversation, startNewConversation, setModel, settings } = useChatContext();

    return (
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-[#0f0f10]/80 backdrop-blur-sm shrink-0">
            {/* Left */}
            <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                </div>
                <span className="text-sm font-semibold text-white/90 truncate">
                    {currentConversation?.title || 'New Chat'}
                </span>
            </div>

            {/* Right */}
            <div className="flex items-center gap-1">
                {/* Model selector */}
                <select
                    value={settings.chatModel}
                    onChange={(e) => setModel(e.target.value)}
                    className="bg-white/[0.06] text-white/70 text-xs rounded-md px-2 py-1.5 border border-white/[0.08] outline-none hover:bg-white/[0.1] cursor-pointer transition-colors"
                >
                    <option value="gpt-4.1">GPT-4.1</option>
                    <option value="gpt-4.1-mini">GPT-4.1 Mini</option>
                    <option value="gpt-4o">GPT-4o</option>
                    <option value="gpt-4o-mini">GPT-4o Mini</option>
                </select>

                {/* History */}
                <button
                    onClick={onToggleHistory}
                    className="p-1.5 rounded-lg text-white/50 hover:text-white/80 hover:bg-white/[0.06] transition-colors"
                    title="Chat history"
                >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                    </svg>
                </button>

                {/* New chat */}
                <button
                    onClick={startNewConversation}
                    className="p-1.5 rounded-lg text-white/50 hover:text-white/80 hover:bg-white/[0.06] transition-colors"
                    title="New chat"
                >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default ChatHeader;
