import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Settings } from '../../../shared/types';
import { Tab, StatusMessage } from '../types';

interface SettingsContextType {
    activeTab: Tab;
    setActiveTab: (tab: Tab) => void;
    settings: Settings;
    setSettings: (settings: Settings) => void;
    status: StatusMessage;
    showStatus: (message: string, type: string) => void;
    handleSave: (newSettings: Partial<Settings>) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within SettingsProvider');
    }
    return context;
};

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [activeTab, setActiveTab] = useState<Tab>('general');
    const [settings, setSettings] = useState<Settings>({
        sourceLang: 'auto',
        targetLang: 'vi',
        popupMode: 'button',
        googleApiKey: '',
        openaiApiKey: '',
        chatModel: 'gpt-4.1-mini',
        serviceProvider: 'custom'
    });
    const [status, setStatus] = useState<StatusMessage>({ message: '', type: '' });

    useEffect(() => {
        chrome.storage.sync.get({
            sourceLang: 'auto',
            targetLang: 'vi',
            popupMode: 'button',
            googleApiKey: '',
            openaiApiKey: '',
            chatModel: 'gpt-4.1-mini',
            serviceProvider: 'custom'
        }, (res) => {
            setSettings(res as unknown as Settings);
        });
    }, []);

    const showStatus = (message: string, type: string) => {
        setStatus({ message, type });
        setTimeout(() => setStatus({ message: '', type: '' }), 3000);
    };

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

    return (
        <SettingsContext.Provider value={{
            activeTab,
            setActiveTab,
            settings,
            setSettings,
            status,
            showStatus,
            handleSave
        }}>
            {children}
        </SettingsContext.Provider>
    );
};
