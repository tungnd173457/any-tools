import React from 'react';
import { Bot, User } from 'lucide-react';
import { ChatMessage } from '../types';

interface MessageBubbleProps {
    message: ChatMessage;
}

function formatTime(ts: number): string {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatContent(content: string): string {
    // Basic Markdown parser (for demonstration purposes)
    // In a real app, use 'react-markdown' or 'marked'
    let html = content
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    // Code blocks
    html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_match, _lang, code) => {
        return `<pre class="bg-black/30 p-2 rounded text-xs overflow-x-auto my-2"><code>${code.trim()}</code></pre>`;
    });

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code class="bg-white/10 px-1 py-0.5 rounded text-[12px] font-mono">$1</code>');

    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Italic
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Line breaks (convert \n to <br> but avoid inside <pre>)
    // This simple regex approach is flawed for nested structures but suffices for basic chat
    html = html.replace(/\n/g, '<br/>');

    return html;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
    const isUser = message.role === 'user';

    if (isUser) {
        return (
            <div className="flex justify-end mb-4">
                <div className="max-w-[85%] flex flex-col items-end">
                    <div className="bg-[#4f46e5] text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-[14px] leading-relaxed shadow-md">
                        <div
                            className="msg-content break-words"
                            dangerouslySetInnerHTML={{ __html: formatContent(message.content) }}
                        />
                    </div>
                </div>
            </div>
        );
    }

    // AI message — full width
    return (
        <div className="mb-6 flex gap-3 group">
            <div className="shrink-0 mt-0.5">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
                    <Bot className="w-3.5 h-3.5 text-white" />
                </div>
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-[12px] font-medium text-white/90">AI</span>
                    <span className="text-[10px] text-white/30">{formatTime(message.timestamp)}</span>
                </div>

                <div className="text-white/90 text-[14px] leading-relaxed">
                    <div
                        className="msg-content prose prose-invert prose-sm max-w-none break-words"
                        dangerouslySetInnerHTML={{ __html: formatContent(message.content) }}
                    />
                </div>
            </div>
        </div>
    );
};

export default MessageBubble;
