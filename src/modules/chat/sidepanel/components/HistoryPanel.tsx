import React, { useState, useMemo } from 'react';
import { useChatContext } from '../context/ChatContext';
import { X, Search, Trash2, MessageSquare, MonitorSmartphone } from 'lucide-react';
import { ChatConversation } from '../types';

interface HistoryPanelProps {
    onClose: () => void;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ onClose }) => {
    const { conversations, currentConversation, loadConversation, deleteConversation } = useChatContext();
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState<'all' | 'starred'>('all');

    // Filter and Sort
    const filteredConversations = useMemo(() => {
        let filtered = conversations;

        // 1. Search Filter
        if (search.trim()) {
            const q = search.toLowerCase();
            filtered = filtered.filter(c =>
                c.title.toLowerCase().includes(q) ||
                c.messages.some(m => m.content.toLowerCase().includes(q))
            );
        }

        // 2. Tab Filter (Mocking 'starred' as empty for now or generic filter)
        if (activeTab === 'starred') {
            // Since we don't have a 'starred' property in ChatConversation yet,
            // we'll just show empty or filter if we add the prop later.
            // For now, let's just return empty to mimic the UI behavior
            return [];
        }

        return filtered.sort((a, b) => b.updatedAt - a.updatedAt);
    }, [conversations, search, activeTab]);

    // Grouping Logic
    const groupedConversations = useMemo(() => {
        const groups: Record<string, ChatConversation[]> = {
            'Today': [],
            'Yesterday': [],
            'Previous 7 Days': [],
            'Older': []
        };

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const yesterday = today - 86400000;
        const lastWeek = today - 86400000 * 7;

        filteredConversations.forEach(convo => {
            if (convo.updatedAt >= today) {
                groups['Today'].push(convo);
            } else if (convo.updatedAt >= yesterday) {
                groups['Yesterday'].push(convo);
            } else if (convo.updatedAt >= lastWeek) {
                groups['Previous 7 Days'].push(convo);
            } else {
                groups['Older'].push(convo);
            }
        });

        // Remove empty groups
        return Object.entries(groups).filter(([_, items]) => items.length > 0);
    }, [filteredConversations]);

    return (
        <div className="absolute inset-0 z-50 flex flex-col bg-[#1c1c1e] text-white animate-in slide-in-from-left duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 shrink-0">
                <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold">Chat history</h2>
                    <span className="text-white/40 text-sm">({conversations.length})</span>
                </div>
                <button
                    onClick={onClose}
                    className="p-1 rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Sync Banner (Mock) */}
            <div className="px-4 pb-4">
                <div className="bg-[#2c2c2e] rounded-xl p-3 flex items-center justify-between group cursor-pointer hover:bg-[#3a3a3c] transition-colors">
                    <div className="flex items-center gap-2">
                        <MonitorSmartphone className="w-4 h-4 text-white/70" />
                        <span className="text-xs font-medium text-white/90">Sync chats across devices</span>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="px-4 flex gap-6 border-b border-white/10 mb-2">
                <button
                    onClick={() => setActiveTab('all')}
                    className={`pb-2 text-sm font-medium transition-colors relative ${activeTab === 'all' ? 'text-white' : 'text-white/40 hover:text-white/70'
                        }`}
                >
                    All
                    {activeTab === 'all' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500 rounded-t-full" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('starred')}
                    className={`pb-2 text-sm font-medium transition-colors relative ${activeTab === 'starred' ? 'text-white' : 'text-white/40 hover:text-white/70'
                        }`}
                >
                    Starred
                    {activeTab === 'starred' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500 rounded-t-full" />
                    )}
                </button>
            </div>

            {/* Search */}
            <div className="px-4 py-2">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search"
                        className="w-full bg-[#2c2c2e] text-white text-sm rounded-full pl-9 pr-4 py-2 border border-transparent focus:border-violet-500/50 outline-none placeholder:text-white/30 transition-all"
                    />
                </div>
            </div>

            {/* Grouped List */}
            <div className="flex-1 overflow-y-auto px-2 py-2 thin-scrollbar">
                {groupedConversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-white/30 text-xs">
                        <MessageSquare className="w-8 h-8 mb-2 opacity-50" />
                        {search ? 'No results found' : 'No history yet'}
                    </div>
                ) : (
                    groupedConversations.map(([group, items]) => (
                        <div key={group} className="mb-6">
                            <div className="px-4 mb-2 text-xs font-semibold text-white/40 uppercase tracking-wider">
                                {group}
                            </div>
                            <div className="space-y-0.5">
                                {items.map(convo => (
                                    <div
                                        key={convo.id}
                                        onClick={() => { loadConversation(convo.id); onClose(); }}
                                        className={`group relative flex items-start gap-3 px-4 py-3 rounded-lg cursor-pointer transition-colors ${convo.id === currentConversation?.id
                                            ? 'bg-[#2c2c2e]'
                                            : 'hover:bg-white/5'
                                            }`}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium text-white/90 truncate mb-0.5">
                                                {convo.title}
                                            </div>
                                            <div className="text-xs text-white/40 truncate line-clamp-1">
                                                {convo.messages[convo.messages.length - 1]?.content || 'New conversation'}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 flex items-center gap-1 bg-[#2c2c2e] pl-2 rounded-l-lg transition-opacity">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); deleteConversation(convo.id); }}
                                                className="p-1.5 rounded-md text-white/40 hover:text-red-400 hover:bg-red-500/10"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Footer (Upgrade/Settings placeholder) */}
            <div className="p-4 border-t border-white/10 text-center">
                <button className="text-xs text-violet-400 hover:text-violet-300 font-medium flex items-center justify-center gap-1 w-full py-2 hover:bg-white/5 rounded-lg transition-colors">
                    Upgrade Plan
                </button>
            </div>
        </div>
    );
};

export default HistoryPanel;
