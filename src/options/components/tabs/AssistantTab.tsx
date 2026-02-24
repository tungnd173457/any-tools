import React, { useState, useRef, useEffect } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { CUSTOM_MODELS, WEBAPP_MODELS } from '../../../shared/constants';
import { Eye, EyeOff, ChevronDown } from 'lucide-react';

const AssistantTab: React.FC = () => {
    const { settings, setSettings, handleSave } = useSettings();
    const [showOpenAIKey, setShowOpenAIKey] = useState(false);
    const [isServiceProviderOpen, setIsServiceProviderOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsServiceProviderOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="animate-in fade-in duration-300">
            <h2 className="text-[17px] font-medium text-[#1e293b] mb-4">AI access</h2>

            <div className="border border-gray-200 rounded-xl bg-white mb-3 flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-gray-100" ref={dropdownRef}>
                    <div className="text-[14px] font-medium text-gray-700">Service provider</div>
                    <div className="relative">
                        <button
                            onClick={() => setIsServiceProviderOpen(!isServiceProviderOpen)}
                            className="flex items-center justify-between gap-6 px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-700 outline-none hover:bg-gray-100 transition-colors w-full sm:w-auto min-w-0"
                        >
                            <span className="whitespace-nowrap">{settings.serviceProvider === 'webapp' ? 'ChatGPT Webapp' : 'Custom API Key'}</span>
                            <ChevronDown size={14} className="text-gray-500 shrink-0" />
                        </button>

                        {isServiceProviderOpen && (
                            <div className="absolute right-0 top-full mt-2 w-[340px] bg-white rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.12)] border border-gray-100 z-50 py-1.5 overflow-hidden">
                                <div
                                    className={`p-3 mx-1.5 my-1 rounded-lg cursor-pointer transition-colors ${settings.serviceProvider === 'custom' || !settings.serviceProvider ? 'bg-[#f4e8ff]' : 'hover:bg-gray-50'}`}
                                    onClick={() => {
                                        handleSave({
                                            serviceProvider: 'custom',
                                            chatModel: CUSTOM_MODELS[0].value
                                        });
                                        setIsServiceProviderOpen(false);
                                    }}
                                >
                                    <div className="text-[14px] font-medium text-gray-900 mb-1">Custom API Key</div>
                                    <div className="text-[13px] text-gray-500 leading-snug">Ideal for those with an API key: stable, usage-based pricing</div>
                                </div>

                                <div
                                    className={`p-3 mx-1.5 my-1 rounded-lg cursor-pointer transition-colors ${settings.serviceProvider === 'webapp' ? 'bg-[#f4e8ff]' : 'hover:bg-gray-50'}`}
                                    onClick={() => {
                                        handleSave({
                                            serviceProvider: 'webapp',
                                            chatModel: WEBAPP_MODELS[0].value
                                        });
                                        setIsServiceProviderOpen(false);
                                    }}
                                >
                                    <div className="text-[14px] font-medium text-gray-900 mb-1">ChatGPT Webapp</div>
                                    <div className="text-[13px] text-gray-500 leading-snug">May be unstable due to OpenAI policy changes</div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <div className="text-[14px] font-medium text-gray-700">AI Model</div>
                    <div className="relative inline-grid items-center">
                        <div className="invisible px-3 pr-7 py-1.5 text-sm whitespace-nowrap col-start-1 row-start-1 h-0">
                            {(settings.serviceProvider === 'webapp' ? WEBAPP_MODELS : CUSTOM_MODELS).find(m => m.value === settings.chatModel)?.label || settings.chatModel}
                        </div>
                        <select
                            value={settings.chatModel}
                            onChange={(e) => handleSave({ chatModel: e.target.value })}
                            className="col-start-1 row-start-1 w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white text-gray-600 outline-none appearance-none focus:outline-none focus:border-purple-300 focus:ring-1 focus:ring-purple-300"
                        >
                            {(settings.serviceProvider === 'webapp' ? WEBAPP_MODELS : CUSTOM_MODELS).map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                        <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                </div>

                {settings.serviceProvider !== 'webapp' && (
                    <div className="flex items-center justify-between p-4">
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
                )}
            </div>

            {settings.serviceProvider !== 'webapp' && (
                <p className="text-[13px] text-gray-500 leading-relaxed mb-8 px-1">
                    Configure your API key to access OpenAI models. Your API key is stored locally within your browser and is never shared or transmitted anywhere else.
                </p>
            )}
        </div>
    );
};

export default AssistantTab;
