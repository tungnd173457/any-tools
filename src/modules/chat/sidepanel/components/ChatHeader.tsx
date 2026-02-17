import React from 'react';
import { useChatContext } from '../context/ChatContext';
import { Menu, Plus, Sparkles } from 'lucide-react';

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
                    <Sparkles className="w-4 h-4 text-white" />
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
                    <Menu className="w-4 h-4" />
                </button>

                {/* New chat */}
                <button
                    onClick={startNewConversation}
                    className="p-1.5 rounded-lg text-white/50 hover:text-white/80 hover:bg-white/[0.06] transition-colors"
                    title="New chat"
                >
                    <Plus className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

export default ChatHeader;
