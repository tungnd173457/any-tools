import React, { useState } from 'react';
import { useChatContext } from '../context/ChatContext';

interface HistoryPanelProps {
    onClose: () => void;
}

function formatRelativeTime(ts: number): string {
    const now = Date.now();
    const diff = now - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(ts).toLocaleDateString();
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ onClose }) => {
    const { conversations, currentConversation, loadConversation, deleteConversation, startNewConversation } = useChatContext();
    const [search, setSearch] = useState('');

    const filtered = conversations.filter(c => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return c.title.toLowerCase().includes(q) ||
            c.messages.some(m => m.content.toLowerCase().includes(q));
    }).sort((a, b) => b.updatedAt - a.updatedAt);

    return (
        <div className="absolute inset-0 z-50 flex flex-col bg-[#0f0f10]/95 backdrop-blur-md">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] shrink-0">
                <h3 className="text-sm font-semibold text-white/80">
                    History <span className="text-white/30 font-normal">({conversations.length})</span>
                </h3>
                <button
                    onClick={onClose}
                    className="p-1 rounded-md text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
                >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>
            </div>

            {/* Search */}
            <div className="px-3 py-2 shrink-0">
                <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search conversations…"
                    className="w-full bg-white/[0.04] text-white/80 text-xs rounded-lg px-3 py-2 border border-white/[0.06] outline-none focus:border-violet-500/30 placeholder:text-white/20 transition-colors"
                />
            </div>

            {/* New chat button */}
            <div className="px-3 pb-2 shrink-0">
                <button
                    onClick={() => { startNewConversation(); onClose(); }}
                    className="w-full flex items-center justify-center gap-2 py-2 text-xs font-medium text-violet-300 bg-violet-500/10 hover:bg-violet-500/15 border border-violet-500/20 rounded-lg transition-colors"
                >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    New Conversation
                </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-3">
                {filtered.length === 0 ? (
                    <div className="text-center text-white/20 text-xs py-10">
                        {search ? 'No results found.' : 'No conversations yet.'}
                    </div>
                ) : (
                    <div className="flex flex-col gap-1 py-1">
                        {filtered.map(convo => (
                            <div
                                key={convo.id}
                                onClick={() => { loadConversation(convo.id); onClose(); }}
                                className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${convo.id === currentConversation?.id
                                        ? 'bg-violet-500/10 border border-violet-500/20'
                                        : 'hover:bg-white/[0.04] border border-transparent'
                                    }`}
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs font-medium text-white/70 truncate">{convo.title}</div>
                                    <div className="text-[10px] text-white/25 mt-0.5">{formatRelativeTime(convo.updatedAt)}</div>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); deleteConversation(convo.id); }}
                                    className="opacity-0 group-hover:opacity-100 p-1 rounded text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                    title="Delete"
                                >
                                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="3 6 5 6 21 6" />
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                    </svg>
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default HistoryPanel;
