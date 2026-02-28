import React from 'react';
import {
    SlidersHorizontal,
    Sidebar as SidebarIcon,
    Menu,
    Languages as LanguagesIcon,
    Bot,
    Sparkles,
    Command,
    ExternalLink,
    HelpCircle
} from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';

const MenuItem = ({ id, icon: Icon, label, disabled = false }: any) => {
    const { activeTab, setActiveTab } = useSettings();
    return (
        <button
            disabled={disabled}
            onClick={() => setActiveTab(id)}
            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-colors mb-1
                ${activeTab === id
                    ? 'bg-[#F3E8FF] text-[#8B5CF6]'
                    : disabled
                        ? 'text-gray-400 cursor-not-allowed opacity-50'
                        : 'text-gray-600 hover:bg-gray-100 cursor-pointer'
                }`}
        >
            <div className="flex items-center gap-3">
                <Icon size={18} strokeWidth={2} />
                <span>{label}</span>
            </div>
            {disabled && <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded text-gray-400">Soon</span>}
        </button>
    );
};

const Sidebar: React.FC = () => {
    return (
        <div className="w-64 border-r border-gray-100 flex flex-col pt-8 pb-4 px-3 flex-shrink-0 bg-[#FAFAFA]/40">
            <div className="flex-1 overflow-y-auto hide-scrollbar">
                <MenuItem id="general" icon={SlidersHorizontal} label="General" />
                <MenuItem id="sidebar" icon={SidebarIcon} label="Sidebar" disabled />
                <MenuItem id="context" icon={Menu} label="Context menu" disabled />
                <MenuItem id="translate" icon={LanguagesIcon} label="Translate" />
                <MenuItem id="assistant" icon={Bot} label="Web assistant" />
                <MenuItem id="prompts" icon={Sparkles} label="Prompts" disabled />
                <MenuItem id="keyboard" icon={Command} label="Keyboard shortcuts" disabled />
            </div>

            <div className="pt-4 mt-auto">
                <button className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
                    <div className="flex items-center gap-3">
                        <ExternalLink size={18} strokeWidth={2} className="rotate-0 text-gray-500" />
                        <span>Contact Us</span>
                    </div>
                </button>
                <button className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
                    <div className="flex items-center gap-3">
                        <HelpCircle size={18} strokeWidth={2} className="text-gray-500" />
                        <span>Help Center</span>
                    </div>
                    <ExternalLink size={14} className="text-gray-400" />
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
