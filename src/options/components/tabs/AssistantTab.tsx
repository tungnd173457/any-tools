import React, { useState } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { MODELS } from '../../constants';
import { Eye, EyeOff } from 'lucide-react';

const AssistantTab: React.FC = () => {
    const { settings, setSettings, handleSave } = useSettings();
    const [showOpenAIKey, setShowOpenAIKey] = useState(false);

    return (
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
    );
};

export default AssistantTab;
