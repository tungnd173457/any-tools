import React, { useState } from 'react';
import { useChatContext } from '../context/ChatContext';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import HistoryPanel from './HistoryPanel';
import WelcomeScreen from './WelcomeScreen';
import ErrorBanner from './ErrorBanner';
import SelectionContext from './SelectionContext';

const ChatLayout: React.FC = () => {
    const { messages, error, clearError } = useChatContext();
    const [historyOpen, setHistoryOpen] = useState(false);

    return (
        <div className="flex flex-col h-screen bg-[#0f0f10] text-white font-['Inter',system-ui,sans-serif] relative overflow-hidden">
            {/* Header */}
            <ChatHeader />

            {/* Error */}
            {error && <ErrorBanner message={error} onClose={clearError} />}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto">
                {messages.length === 0 ? <WelcomeScreen /> : <MessageList />}
            </div>

            {/* Input */}
            {/* Input Area */}
            <div className="flex-none bg-[#0f0f10]">
                <SelectionContext />
                <ChatInput onToggleHistory={() => setHistoryOpen(!historyOpen)} />
            </div>

            {/* History Overlay */}
            {historyOpen && (
                <HistoryPanel onClose={() => setHistoryOpen(false)} />
            )}
        </div>
    );
};

export default ChatLayout;
