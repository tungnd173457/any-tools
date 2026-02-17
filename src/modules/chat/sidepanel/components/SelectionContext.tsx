
import React from 'react';
import { useChatContext } from '../context/ChatContext';
import { Sparkles, FileText, HelpCircle, X } from 'lucide-react';

const SelectionContext: React.FC = () => {
    const { selectedText, setSelectedText, sendMessage } = useChatContext();

    if (!selectedText) return null;

    const handleAction = (promptPrefix: string) => {
        sendMessage(promptPrefix);
    };

    return (
        <div className="px-3 pb-2 pt-0 w-full animate-in slide-in-from-bottom-2 fade-in duration-200">
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-3 flex flex-col gap-3 shadow-lg backdrop-blur-sm">

                {/* Header with Close */}
                <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-white/50 uppercase tracking-wider">
                        Text from your selection
                    </span>
                    <button
                        onClick={() => setSelectedText('')}
                        className="text-white/30 hover:text-white/70 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Selected Text Preview */}
                <div className="text-sm text-white/80 line-clamp-3 border-l-2 border-violet-500/50 pl-2 italic">
                    {selectedText}
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-1">
                    <button
                        onClick={() => handleAction('Explain this:')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.05] rounded-lg text-xs font-medium text-white/90 transition-all hover:scale-[1.02]"
                    >
                        <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                        Explain
                    </button>

                    <button
                        onClick={() => handleAction('Summarize this:')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.05] rounded-lg text-xs font-medium text-white/90 transition-all hover:scale-[1.02]"
                    >
                        <FileText className="w-3.5 h-3.5 text-blue-400" />
                        Summarize
                    </button>

                    <button
                        onClick={() => handleAction('Answer this question:')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.05] rounded-lg text-xs font-medium text-white/90 transition-all hover:scale-[1.02]"
                    >
                        <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
                        Answer
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SelectionContext;
