import React, { useState, useRef, useEffect } from 'react';
import { useAgentContext } from '../../context/AgentContext';
import { Bot, Plus, Square } from 'lucide-react';

const AgentInput: React.FC = () => {
    const { startAgent, stopAgent, isRunning, clearSteps, steps } = useAgentContext();
    const [text, setText] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleSend = () => {
        if (!text.trim() || isRunning) return;
        startAgent(text.trim());
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

    // Auto-resize textarea
    useEffect(() => {
        const ta = textareaRef.current;
        if (ta) {
            ta.style.height = 'auto';
            ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
        }
    }, [text]);

    const hasContent = steps.length > 0;

    return (
        <div className="border-t border-[var(--chrome-border)] bg-[var(--chrome-bg)] p-3 shrink-0">
            {/* Stop button when running */}
            {isRunning && (
                <div className="flex justify-center mb-3">
                    <button
                        onClick={stopAgent}
                        className="agent-stop-btn"
                    >
                        <Square className="w-3 h-3 fill-current" />
                        <span>Stop Agent</span>
                    </button>
                </div>
            )}

            {/* Input area */}
            <div className="relative bg-[var(--chrome-input-bg)] rounded-2xl border border-[var(--chrome-border)] focus-within:border-[var(--chrome-text)]/20 transition-all">
                <textarea
                    ref={textareaRef}
                    value={text}
                    onChange={e => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="What can the agent help with?"
                    rows={1}
                    disabled={isRunning}
                    className="w-full bg-transparent text-[var(--chrome-text)] text-sm resize-none outline-none placeholder:opacity-30 px-4 pt-3 pb-2 min-h-[44px] max-h-[120px] pr-10 disabled:opacity-50"
                />

                {/* Send button */}
                {!isRunning && (
                    <button
                        onClick={handleSend}
                        disabled={!text.trim()}
                        className="absolute right-2 bottom-2 w-7 h-7 rounded-full bg-[var(--chrome-text)] text-[var(--chrome-bg)] flex items-center justify-center disabled:opacity-20 disabled:cursor-not-allowed hover:opacity-90 transition-all active:scale-95"
                    >
                        <svg className="w-3.5 h-3.5 translate-x-px" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M3.478 2.405a.75.75 0 0 0-.926.94l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.405Z" />
                        </svg>
                    </button>
                )}
            </div>

            {/* Bottom bar: branding + new task */}
            <div className="flex items-center justify-between mt-2 px-1">
                <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                        <Bot className="w-2.5 h-2.5 text-white" />
                    </div>
                    <span className="text-[10px] font-medium text-[var(--chrome-text-secondary)]">Browser Agent</span>
                </div>

                {hasContent && !isRunning && (
                    <button
                        onClick={clearSteps}
                        className="w-5 h-5 rounded-md bg-emerald-500 flex items-center justify-center hover:bg-emerald-400 transition-colors"
                        title="New Task"
                    >
                        <Plus className="w-3 h-3 text-white" />
                    </button>
                )}
            </div>
        </div>
    );
};

export default AgentInput;
