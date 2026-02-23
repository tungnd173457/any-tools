import React from 'react';
import Sidebar from './Sidebar';
import HeaderProfile from './HeaderProfile';
import { useSettings } from '../../context/SettingsContext';

interface OptionsLayoutProps {
    children: React.ReactNode;
}

const OptionsLayout: React.FC<OptionsLayoutProps> = ({ children }) => {
    const { status } = useSettings();

    return (
        <div className="flex h-screen bg-white">
            <Sidebar />

            <div className="flex-1 overflow-y-auto w-full relative">
                {status.message && (
                    <div className="fixed top-6 right-6 z-50">
                        <div className={`px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 transform transition-all duration-300 ${status.type === 'error' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-600 border border-green-200'
                            }`}>
                            <span className="text-sm font-medium">{status.message}</span>
                        </div>
                    </div>
                )}

                <div className="max-w-3xl mx-auto px-10 py-8">
                    <HeaderProfile />
                    {children}
                </div>
            </div>
        </div>
    );
};

export default OptionsLayout;
