import React, { useState } from 'react';
import { ChatProvider } from './context/ChatContext';
import { AgentProvider } from './context/AgentContext';
import ChatLayout from './components/layout/ChatLayout';
import AgentLayout from './components/agent/AgentLayout';
import DebugLayout from './components/debug/DebugLayout';
import OcrLayout from './components/ocr/OcrLayout';
import Sidebar, { type AppMode } from './components/layout/Sidebar';

const App: React.FC = () => {
    const [mode, setMode] = useState<AppMode>('chat');

    const renderContent = () => {
        switch (mode) {
            case 'chat': return <ChatLayout />;
            case 'agent': return <AgentLayout />;
            case 'debug': return <DebugLayout />;
            case 'ocr': return <OcrLayout />;
        }
    };

    return (
        <ChatProvider>
            <AgentProvider>
                <div className="flex h-screen overflow-hidden">
                    {/* Main Content */}
                    <div className="flex-1 min-w-0">
                        {renderContent()}
                    </div>

                    {/* Sidebar (right side) */}
                    <Sidebar activeMode={mode} onModeChange={setMode} />
                </div>
            </AgentProvider>
        </ChatProvider>
    );
};

export default App;

