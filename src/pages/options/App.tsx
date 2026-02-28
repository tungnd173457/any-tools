import React from 'react';
import { SettingsProvider, useSettings } from './context/SettingsContext';
import OptionsLayout from './components/layout/OptionsLayout';
import GeneralTab from './components/tabs/GeneralTab';
import AssistantTab from './components/tabs/AssistantTab';
import TranslateTab from './components/tabs/TranslateTab';

const TabContent: React.FC = () => {
    const { activeTab } = useSettings();

    return (
        <>
            {activeTab === 'general' && <GeneralTab />}
            {activeTab === 'assistant' && <AssistantTab />}
            {activeTab === 'translate' && <TranslateTab />}
        </>
    );
};

export default function App() {
    return (
        <SettingsProvider>
            <OptionsLayout>
                <TabContent />
            </OptionsLayout>
        </SettingsProvider>
    );
}
