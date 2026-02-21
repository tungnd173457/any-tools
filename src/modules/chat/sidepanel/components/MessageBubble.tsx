import React, { useState } from 'react';
import { Bot, User, Globe } from 'lucide-react';
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

const ImagePreview: React.FC<{ src: string }> = ({ src }) => {
    const [expanded, setExpanded] = useState(false);

    return (
        <>
            <img
                src={src}
                alt="Screenshot"
                className="max-w-full max-h-[200px] rounded-lg border border-white/10 object-cover cursor-pointer hover:opacity-90 transition-opacity shadow-sm mb-2"
                onClick={() => setExpanded(true)}
            />
            {expanded && (
                <div
                    className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center cursor-pointer backdrop-blur-sm"
                    onClick={() => setExpanded(false)}
                >
                    <img
                        src={src}
                        alt="Screenshot expanded"
                        className="max-w-[90%] max-h-[90%] rounded-xl shadow-2xl object-contain"
                    />
                </div>
            )}
        </>
    );
};

const ContextBox: React.FC<{ text: string }> = ({ text }) => {
    const [expanded, setExpanded] = useState(false);
    return (
        <div
            className="mb-2 max-w-full rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/10 px-3 py-2 text-[13px] text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-black/10 dark:hover:bg-white/20 transition-all dropdown-shadow"
            onClick={() => setExpanded(!expanded)}
            title="Click to expand/collapse"
        >
            <div className={`whitespace-pre-wrap break-words ${expanded ? '' : 'line-clamp-1'}`}>
                {text}
            </div>
        </div>
    );
};

const PageContextBox: React.FC<{ title: string; url: string; favicon: string; content: string }> = ({ title, url, favicon, content }) => {
    const [expanded, setExpanded] = useState(false);

    let hostname = url;
    try {
        hostname = new URL(url).hostname;
    } catch {
        // ignore
    }

    return (
        <div className="mb-2 w-full max-w-[250px] rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/10 p-3 text-[13px] text-gray-700 dark:text-gray-300 dropdown-shadow flex flex-col gap-2 cursor-pointer hover:bg-black/10 dark:hover:bg-white/20 transition-all"
            onClick={() => setExpanded(!expanded)}
        >
            <div className="flex items-center gap-2">
                {favicon ? (
                    <img src={favicon} className="w-5 h-5 rounded-sm flex-shrink-0 object-contain bg-white/50" alt="" />
                ) : (
                    <Globe className="w-5 h-5 text-[#8b5cf6]" />
                )}
                <div className="flex flex-col overflow-hidden w-full">
                    <span className="font-medium text-[var(--chrome-text)] truncate w-full" title={title}>{title}</span>
                    <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] opacity-60 hover:text-[#8b5cf6] hover:opacity-100 truncate w-full transition-colors flex items-center justify-start"
                        onClick={(e) => e.stopPropagation()}
                        title={url}
                    >
                        {hostname}
                    </a>
                </div>
            </div>
            {expanded && (
                <div className="mt-2 pt-2 border-t border-black/10 dark:border-white/10 text-[12px] opacity-80 whitespace-pre-wrap break-words max-h-[200px] overflow-y-auto custom-scrollbar">
                    <div className="line-clamp-[10]">{content}</div>
                </div>
            )}
        </div>
    );
};

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
    const isUser = message.role === 'user';

    let displayContent = message.content;
    let contextText = null;
    let pageContext = null;

    if (isUser && message.content) {
        const textContextMatch = message.content.match(/^Start of Context:\n"([\s\S]*?)"\nEnd of Context\n\n([\s\S]*)$/);
        const pageContextMatch = message.content.match(/^Start of Page Context:\nTitle: (.*)\nURL: (.*)\nFavicon: (.*)\n\nContent:\n([\s\S]*?)\nEnd of Page Context\n\n([\s\S]*)$/);

        if (textContextMatch) {
            contextText = textContextMatch[1];
            displayContent = textContextMatch[2];
        } else if (pageContextMatch) {
            pageContext = {
                title: pageContextMatch[1],
                url: pageContextMatch[2],
                favicon: pageContextMatch[3],
                content: pageContextMatch[4]
            };
            displayContent = pageContextMatch[5];
        }
    }

    if (isUser) {
        return (
            <div className="flex justify-end mb-4">
                <div className="max-w-[85%] flex flex-col items-end text-left w-full">
                    {contextText && <ContextBox text={contextText} />}
                    {pageContext && <PageContextBox {...pageContext} />}
                    <div className="bg-[#f0f0f0] dark:bg-[#2f2f2f] text-black dark:text-white rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed shadow-sm self-end">
                        {/* Show screenshot image if present */}
                        {message.imageUrl && (
                            <ImagePreview src={message.imageUrl} />
                        )}
                        {displayContent && (
                            <div
                                className="msg-content break-words"
                                dangerouslySetInnerHTML={{ __html: formatContent(displayContent) }}
                            />
                        )}
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
                    <span className="text-[12px] font-medium opacity-90">AI</span>
                    <span className="text-[10px] opacity-30">{formatTime(message.timestamp)}</span>
                </div>

                <div className="text-[var(--chrome-text)] opacity-90 text-[14px] leading-relaxed">
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
