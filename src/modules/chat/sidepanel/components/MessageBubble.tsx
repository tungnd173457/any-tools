import React from 'react';
import { ChatMessage } from '../types';

interface MessageBubbleProps {
    message: ChatMessage;
}

function formatTime(ts: number): string {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatContent(content: string): string {
    let html = escapeHtml(content);

    // Code blocks
    html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_match, _lang, code) => {
        return `<pre><code>${code.trim()}</code></pre>`;
    });

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Italic
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Line breaks
    html = html.replace(/\n/g, '<br/>');

    return html;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
    const isUser = message.role === 'user';

    if (isUser) {
        return (
            <div className="flex justify-end mb-3">
                <div className="max-w-[85%] flex flex-col items-end">
                    <div className="bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-2xl rounded-br-md px-4 py-2.5 text-[13.5px] leading-relaxed shadow-lg shadow-violet-500/10">
                        <div
                            className="msg-content"
                            dangerouslySetInnerHTML={{ __html: formatContent(message.content) }}
                        />
                    </div>
                    <span className="text-[10px] text-white/25 mt-1 mr-1">{formatTime(message.timestamp)}</span>
                </div>
            </div>
        );
    }

    // AI message — full width
    return (
        <div className="mb-4">
            <div className="flex items-center gap-2 mb-1.5">
                <div className="w-5 h-5 rounded-md bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M12 2L2 7l10 5 10-5-10-5z" />
                        <path d="M2 17l10 5 10-5" />
                        <path d="M2 12l10 5 10-5" />
                    </svg>
                </div>
                <span className="text-[11px] text-white/40 font-medium">AI</span>
            </div>
            <div className="text-white/85 text-[13.5px] leading-relaxed pl-7">
                <div
                    className="msg-content"
                    dangerouslySetInnerHTML={{ __html: formatContent(message.content) }}
                />
            </div>
            <span className="text-[10px] text-white/20 mt-1 pl-7 block">{formatTime(message.timestamp)}</span>
        </div>
    );
};

export default MessageBubble;
