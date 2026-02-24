import React from 'react';
import { useSettings } from '../../context/SettingsContext';
import { POPUP_MODES } from '../../../shared/constants';

const GeneralTab: React.FC = () => {
    const { settings, handleSave } = useSettings();

    return (
        <div className="animate-in fade-in duration-300">
            <h2 className="text-[17px] font-medium text-[#1e293b] mb-4">Appearance</h2>

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

            <h2 className="text-[17px] font-medium text-[#1e293b] mb-4">General Settings</h2>

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
    );
};

export default GeneralTab;
