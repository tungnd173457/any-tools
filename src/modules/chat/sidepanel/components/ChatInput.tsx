import React, { useState, useRef, useEffect } from 'react';
import { useChatContext } from '../context/ChatContext';
import { Scissors, Paperclip, History, Plus, ChevronDown, BookOpen } from 'lucide-react';

interface ChatInputProps {
    onToggleHistory: () => void;
}

const ChatInput: React.FC<ChatInputProps> = ({ onToggleHistory }) => {
    const { sendMessage, isStreaming, settings, setModel, startNewConversation } = useChatContext();
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

    const handleScreenshot = () => {
        // Send message to content script to show screenshot overlay
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]?.id) {
                chrome.tabs.sendMessage(tabs[0].id, { action: 'startScreenshot' });
            }
        });
    };

    return (
        <div className="border-t border-white/[0.06] bg-[#0f0f10] p-3 shrink-0">
            {/* Toolbar above input */}
            <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-3">
                    {/* Model Selector */}
                    <div className="relative group">
                        <select
                            value={settings.chatModel}
                            onChange={(e) => setModel(e.target.value)}
                            className="appearance-none bg-white/[0.06] text-white/90 text-xs font-medium rounded-full pl-3 pr-7 py-1.5 border border-white/[0.08] hover:bg-white/[0.1] outline-none cursor-pointer transition-colors max-w-[120px] truncate"
                        >
                            <option value="gpt-4.1">GPT-4.1</option>
                            <option value="gpt-4.1-mini">GPT-4.1 mini</option>
                            <option value="gpt-4o">GPT-4o</option>
                            <option value="gpt-4o-mini">GPT-4o mini</option>
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/50 pointer-events-none" />
                    </div>

                    <div className="h-4 w-[1px] bg-white/[0.1]" />

                    {/* Scissors (Screenshot) */}
                    <button
                        onClick={handleScreenshot}
                        className="text-white/60 hover:text-white transition-colors"
                        title="Screenshot selection"
                    >
                        <Scissors className="w-4 h-4" />
                    </button>

                    {/* Attachment (Visual only for now) */}
                    <button
                        className="text-white/60 hover:text-white transition-colors"
                        title="Attach file"
                    >
                        <Paperclip className="w-4 h-4" />
                    </button>

                    {/* Library/Prompts (Visual only for now) */}
                    <button
                        className="text-white/60 hover:text-white transition-colors"
                        title="Prompts"
                    >
                        <BookOpen className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex items-center gap-3">
                    {/* History */}
                    <button
                        onClick={onToggleHistory}
                        className="text-white/60 hover:text-white transition-colors"
                        title="Chat History"
                    >
                        <History className="w-4 h-4" />
                    </button>

                    {/* New Chat */}
                    <button
                        onClick={startNewConversation}
                        className="w-6 h-6 rounded-lg bg-violet-600 hover:bg-violet-700 flex items-center justify-center text-white shadow-lg shadow-violet-500/20 transition-all"
                        title="New Chat"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Input Area */}
            <div className="relative group bg-white/[0.04] rounded-2xl border border-white/[0.08] focus-within:border-violet-500/30 focus-within:bg-white/[0.06] transition-all">
                <textarea
                    ref={textareaRef}
                    value={text}
                    onChange={e => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask anything, @ models, / prompts"
                    rows={1}
                    className="w-full bg-transparent text-white/90 text-sm resize-none outline-none placeholder:text-white/25 px-4 py-3 max-h-[120px] pr-10"
                />

                {/* Visual Bottom Actions inside input (optional, referencing the image style) */}
                <div className="flex justify-between items-center px-2 pb-2">
                    <div className="flex gap-2">
                        <button className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] text-[10px] text-white/60 hover:bg-white/[0.08] transition-colors">
                            <span className="w-2 h-2 rounded-full border border-current opacity-60"></span>
                            Think
                        </button>
                        <button className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] text-[10px] text-white/60 hover:bg-white/[0.08] transition-colors">
                            {/* Deep Research Icon */}
                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                            Deep Research
                        </button>
                    </div>

                    <button
                        onClick={handleSend}
                        disabled={!text.trim() || isStreaming}
                        className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-all active:scale-95"
                    >
                        {isStreaming ? (
                            <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                        ) : (
                            <svg className="w-4 h-4 translate-x-px" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M3.478 2.405a.75.75 0 0 0-.926.94l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.405Z" />
                            </svg>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChatInput;
