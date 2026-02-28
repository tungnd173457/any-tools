import React from 'react';
import { ChatProvider } from './context/ChatContext';
import ChatLayout from './components/layout/ChatLayout';

const App: React.FC = () => {
    return (
        <ChatProvider>
            <ChatLayout />
        </ChatProvider>
    );
};

export default App;
