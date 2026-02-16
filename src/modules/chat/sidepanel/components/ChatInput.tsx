import React, { useState, useRef, useEffect } from 'react';
import { useChatContext } from '../context/ChatContext';

const ChatInput: React.FC = () => {
    const { sendMessage, isStreaming } = useChatContext();
    const [text, setText] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleSend = () => {
        if (!text.trim() || isStreaming) return;
        sendMessage(text);
        setText('');
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Auto-resize
    useEffect(() => {
        const ta = textareaRef.current;
        if (ta) {
            ta.style.height = 'auto';
            ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
        }
    }, [text]);

    return (
        <div className="border-t border-white/[0.06] bg-[#0f0f10] p-3 shrink-0">
            <div className="flex items-end gap-2 bg-white/[0.04] rounded-xl border border-white/[0.08] p-2 focus-within:border-violet-500/30 transition-colors">
                <textarea
                    ref={textareaRef}
                    value={text}
                    onChange={e => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask anything…"
                    rows={1}
                    className="flex-1 bg-transparent text-white/90 text-sm resize-none outline-none placeholder:text-white/25 px-2 py-1 max-h-[120px]"
                />
                <button
                    onClick={handleSend}
                    disabled={!text.trim() || isStreaming}
                    className="shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-violet-500/20 transition-all active:scale-95"
                >
                    {isStreaming ? (
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M12 2v4m0 12v4m-6.93-2.93l2.83-2.83m8.2-8.2l2.83-2.83M2 12h4m12 0h4M4.93 4.93l2.83 2.83m8.2 8.2l2.83 2.83" />
                        </svg>
                    ) : (
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M3.478 2.405a.75.75 0 0 0-.926.94l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.405Z" />
                        </svg>
                    )}
                </button>
            </div>
        </div>
    );
};

export default ChatInput;
