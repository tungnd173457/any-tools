import React, { useState } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { LANGUAGES } from '../../../shared/constants';
import { Eye, EyeOff } from 'lucide-react';

const TranslateTab: React.FC = () => {
    const { settings, setSettings, handleSave } = useSettings();
    const [showGoogleKey, setShowGoogleKey] = useState(false);

    return (
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
                            className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-md transition-colors border border-transparent"
                        >
                            {showGoogleKey ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TranslateTab;
