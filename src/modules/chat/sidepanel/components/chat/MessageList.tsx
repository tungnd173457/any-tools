import React, { useEffect, useRef } from 'react';
import { useChatContext } from '../../context/ChatContext';
import MessageBubble from './MessageBubble';
import TypingIndicator from '../shared/TypingIndicator';

const MessageList: React.FC = () => {
    const { messages, isStreaming } = useChatContext();
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isStreaming]);

    return (
        <div className="flex flex-col gap-1 p-4">
            {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
            ))}
            {isStreaming && <TypingIndicator />}
            <div ref={bottomRef} />
        </div>
    );
};

export default MessageList;
