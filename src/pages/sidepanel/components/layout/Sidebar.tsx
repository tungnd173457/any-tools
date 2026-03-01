import React from 'react';
import { MessageSquare, Bot } from 'lucide-react';

export type AppMode = 'chat' | 'agent';

interface SidebarProps {
    activeMode: AppMode;
    onModeChange: (mode: AppMode) => void;
}

interface SidebarItem {
    mode: AppMode;
    icon: React.ReactNode;
    label: string;
}

const Sidebar: React.FC<SidebarProps> = ({ activeMode, onModeChange }) => {
    const items: SidebarItem[] = [
        { mode: 'chat', icon: <MessageSquare className="w-5 h-5" />, label: 'Chat' },
        { mode: 'agent', icon: <Bot className="w-5 h-5" />, label: 'Agent' },
    ];

    return (
        <div className="sidebar-strip">
            <div className="flex flex-col items-center gap-1 pt-3">
                {items.map(item => {
                    const isActive = activeMode === item.mode;
                    return (
                        <button
                            key={item.mode}
                            onClick={() => onModeChange(item.mode)}
                            className={`sidebar-item ${isActive ? 'sidebar-item-active' : ''}`}
                            title={item.label}
                        >
                            <span className={`sidebar-icon ${isActive ? 'sidebar-icon-active' : ''}`}>
                                {item.icon}
                            </span>
                            <span className={`sidebar-label ${isActive ? 'sidebar-label-active' : ''}`}>
                                {item.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default Sidebar;
