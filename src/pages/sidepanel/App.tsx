import React, { useState } from 'react';
import { ChatProvider } from './context/ChatContext';
import { AgentProvider } from './context/AgentContext';
import ChatLayout from './components/layout/ChatLayout';
import AgentLayout from './components/agent/AgentLayout';
import Sidebar, { type AppMode } from './components/layout/Sidebar';

const App: React.FC = () => {
    const [mode, setMode] = useState<AppMode>('chat');

    return (
        <ChatProvider>
            <AgentProvider>
                <div className="flex h-screen overflow-hidden">
                    {/* Main Content */}
                    <div className="flex-1 min-w-0">
                        {mode === 'chat' ? <ChatLayout /> : <AgentLayout />}
                    </div>

                    {/* Sidebar (right side) */}
                    <Sidebar activeMode={mode} onModeChange={setMode} />
                </div>
            </AgentProvider>
        </ChatProvider>
    );
};

export default App;
