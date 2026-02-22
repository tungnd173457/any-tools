import React, { useState, useEffect } from 'react';
import { Settings } from '../shared/types';
import { LANGUAGES, POPUP_MODES, MODELS } from './constants';
import {
    SlidersHorizontal,
    Sidebar as SidebarIcon,
    Menu,
    Languages as LanguagesIcon,
    Bot,
    Sparkles,
    Command,
    ExternalLink,
    HelpCircle,
    Eye,
    EyeOff
} from 'lucide-react';

type Tab = 'general' | 'sidebar' | 'context' | 'translate' | 'assistant' | 'prompts' | 'keyboard';

export default function App() {
    const [activeTab, setActiveTab] = useState<Tab>('general');
    const [settings, setSettings] = useState<Settings>({
        sourceLang: 'auto',
        targetLang: 'vi',
        popupMode: 'button',
        googleApiKey: '',
        openaiApiKey: '',
        chatModel: 'gpt-4.1-mini'
    });
    const [showGoogleKey, setShowGoogleKey] = useState(false);
    const [showOpenAIKey, setShowOpenAIKey] = useState(false);
    const [status, setStatus] = useState({ message: '', type: '' });

    useEffect(() => {
        chrome.storage.sync.get({
            sourceLang: 'auto',
            targetLang: 'vi',
            popupMode: 'button',
            googleApiKey: '',
            openaiApiKey: '',
            chatModel: 'gpt-4.1-mini'
        }, (res) => {
            setSettings(res as Settings);
        });
    }, []);

    const handleSave = (newSettings: Partial<Settings>) => {
        const next = { ...settings, ...newSettings };
        if (next.sourceLang !== 'auto' && next.sourceLang === next.targetLang) {
            showStatus('Source and target languages should be different', 'error');
            return;
        }

        setSettings(next);
        chrome.storage.sync.set(next, () => {
            showStatus('Settings saved successfully!', 'success');
        });
    };

    const showStatus = (message: string, type: string) => {
        setStatus({ message, type });
        setTimeout(() => setStatus({ message: '', type: '' }), 3000);
    };

    const MenuItem = ({ id, icon: Icon, label, disabled = false }: any) => (
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

    return (
        <div className="flex h-screen bg-white">
            {/* Sidebar */}
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

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto w-full relative">
                {/* Status Toast */}
                {status.message && (
                    <div className="fixed top-6 right-6 z-50">
                        <div className={`px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 transform transition-all duration-300 ${status.type === 'error' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-600 border border-green-200'
                            }`}>
                            <span className="text-sm font-medium">{status.message}</span>
                        </div>
                    </div>
                )}

                <div className="max-w-3xl mx-auto px-10 py-8">
                    {/* Top Profile Card mimicking the image */}
                    <div className="bg-white border border-gray-200 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] rounded-xl p-4 flex justify-between items-center mb-12">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-[#E11D48] rounded-full flex items-center justify-center text-white font-medium text-lg">
                                t
                            </div>
                            <div>
                                <div className="font-semibold text-gray-800 text-sm">tùng nguyễn</div>
                                <div className="text-gray-500 text-sm">tungnd173457@gmail.com</div>
                            </div>
                        </div>
                        <button className="px-5 py-1.5 border border-[#F3E8FF] text-[#8B5CF6] rounded-full text-sm font-medium hover:bg-[#F3E8FF] transition-colors">
                            Log out
                        </button>
                    </div>

                    {/* Dynamic View */}
                    {activeTab === 'general' && (
                        <div className="animate-in fade-in duration-300">
                            <h2 className="text-[17px] font-bold text-[#1e293b] mb-4">Appearance</h2>

                            <div className="border border-gray-200 rounded-xl overflow-hidden mb-8">
                                <div className="flex items-center justify-between p-4 bg-white border-b border-gray-100">
                                    <div className="text-[14px] font-medium text-gray-700">Display mode</div>
                                    <select className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white min-w-[140px] appearance-none focus:outline-none focus:border-purple-300 focus:ring-1 focus:ring-purple-300 text-gray-600 outline-none" defaultValue="Light">
                                        <option value="Light">Light</option>
                                        <option value="Dark">Dark</option>
                                        <option value="Auto">Auto</option>
                                    </select>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-white">
                                    <div className="text-[14px] font-medium text-gray-700">Display language</div>
                                    <select className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white min-w-[140px] appearance-none focus:outline-none focus:border-purple-300 focus:ring-1 focus:ring-purple-300 text-gray-600 outline-none" defaultValue="English">
                                        <option value="English">English</option>
                                        <option value="Vietnamese">Vietnamese</option>
                                    </select>
                                </div>
                            </div>

                            <h2 className="text-[17px] font-bold text-[#1e293b] mb-4">General Settings</h2>

                            <div className="border border-gray-200 rounded-xl overflow-hidden mb-8">
                                <div className="flex items-center justify-between p-4 bg-white">
                                    <div className="text-[14px] font-medium text-gray-700">Popup Mode behavior</div>
                                    <select
                                        value={settings.popupMode}
                                        onChange={(e) => handleSave({ popupMode: e.target.value as any })}
                                        className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white min-w-[140px] outline-none text-gray-600 appearance-none focus:outline-none focus:border-purple-300 focus:ring-1 focus:ring-purple-300"
                                    >
                                        {POPUP_MODES.map(m => (
                                            <option key={m.value} value={m.value}>{m.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'assistant' && (
                        <div className="animate-in fade-in duration-300">
                            <h2 className="text-[17px] font-bold text-[#1e293b] mb-4">AI access</h2>

                            <div className="border border-gray-200 rounded-xl overflow-hidden mb-3">
                                <div className="flex items-center justify-between p-4 bg-white border-b border-gray-100">
                                    <div className="text-[14px] font-medium text-gray-700">Service provider</div>
                                    <div className="relative">
                                        <select
                                            value={settings.chatModel}
                                            onChange={(e) => handleSave({ chatModel: e.target.value })}
                                            className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white min-w-[140px] text-gray-600 outline-none appearance-none focus:outline-none focus:border-purple-300 focus:ring-1 focus:ring-purple-300"
                                        >
                                            {MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-white">
                                    <div className="text-[14px] font-medium text-gray-700">OpenAI API Key</div>
                                    <div className="flex items-center gap-2 w-full max-w-[280px]">
                                        <div className="relative flex-1">
                                            <input
                                                type={showOpenAIKey ? "text" : "password"}
                                                value={settings.openaiApiKey || ''}
                                                onChange={(e) => setSettings({ ...settings, openaiApiKey: e.target.value })}
                                                onBlur={(e) => handleSave({ openaiApiKey: e.target.value })}
                                                className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 outline-none focus:border-purple-300 focus:ring-1 focus:ring-purple-300 placeholder-gray-300"
                                                placeholder="sk-..."
                                            />
                                        </div>
                                        <button
                                            onClick={() => setShowOpenAIKey(!showOpenAIKey)}
                                            className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-md transition-colors border border-transparent"
                                        >
                                            {showOpenAIKey ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <p className="text-[13px] text-gray-500 leading-relaxed mb-8 px-1">
                                Configure your API key to access OpenAI models. Your API key is stored locally within your browser and is never shared or transmitted anywhere else.
                            </p>
                        </div>
                    )}

                    {activeTab === 'translate' && (
                        <div className="animate-in fade-in duration-300">
                            <h2 className="text-[17px] font-bold text-[#1e293b] mb-4">Translate settings</h2>

                            <div className="border border-gray-200 rounded-xl overflow-hidden mb-8">
                                <div className="flex items-center justify-between p-4 bg-white border-b border-gray-100">
                                    <div className="text-[14px] font-medium text-gray-700">Source language</div>
                                    <select
                                        value={settings.sourceLang}
                                        onChange={(e) => handleSave({ sourceLang: e.target.value })}
                                        className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white min-w-[200px] text-gray-600 outline-none appearance-none focus:outline-none focus:border-purple-300 focus:ring-1 focus:ring-purple-300"
                                    >
                                        <optgroup label="Auto">
                                            <option value="auto">Auto Detect</option>
                                        </optgroup>
                                        <optgroup label="Languages">
                                            {LANGUAGES.filter(v => v.value !== 'auto').map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                                        </optgroup>
                                    </select>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-white border-b border-gray-100">
                                    <div className="text-[14px] font-medium text-gray-700">Target language</div>
                                    <select
                                        value={settings.targetLang}
                                        onChange={(e) => handleSave({ targetLang: e.target.value })}
                                        className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white min-w-[200px] text-gray-600 outline-none appearance-none focus:outline-none focus:border-purple-300 focus:ring-1 focus:ring-purple-300"
                                    >
                                        {LANGUAGES.filter(v => v.value !== 'auto').map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                                    </select>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-white">
                                    <div className="text-[14px] font-medium text-gray-700">Google API Key</div>
                                    <div className="flex items-center gap-2 w-full max-w-[280px]">
                                        <div className="relative flex-1">
                                            <input
                                                type={showGoogleKey ? "text" : "password"}
                                                value={settings.googleApiKey || ''}
                                                onChange={(e) => setSettings({ ...settings, googleApiKey: e.target.value })}
                                                onBlur={(e) => handleSave({ googleApiKey: e.target.value })}
                                                className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 outline-none focus:border-purple-300 focus:ring-1 focus:ring-purple-300 placeholder-gray-300"
                                                placeholder="AIzaSy..."
                                            />
                                        </div>
                                        <button
                                            onClick={() => setShowGoogleKey(!showGoogleKey)}
                                            className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-md transition-colors"
                                        >
                                            {showGoogleKey ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
