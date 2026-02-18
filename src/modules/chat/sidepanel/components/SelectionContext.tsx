
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
        <div className="px-3 pb-3 animate-in slide-in-from-bottom-2 fade-in duration-200">
            <div className="bg-white rounded-xl border border-white/10 shadow-lg overflow-hidden">
                {/* Header / Text Content */}
                <div className="p-3 relative">
                    <div className="flex justify-between items-start mb-1">
                        <span className="text-xs font-medium text-gray-500">Text from your selection</span>
                        <button
                            onClick={() => setSelectedText('')}
                            className="text-gray-400 hover:text-gray-600 transition-colors p-0.5 rounded-full hover:bg-gray-100"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                    <p className="text-sm text-gray-800 line-clamp-3 leading-relaxed">
                        {selectedText}
                    </p>
                </div>

                {/* Actions Toolbar */}
                <div className="px-3 pb-3 flex flex-wrap gap-2">
                    <button
                        onClick={() => handleAction('Explain this:')}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium text-gray-700 transition-colors"
                    >
                        Explain
                    </button>

                    <button
                        onClick={() => handleAction('Translate to English:')}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium text-gray-700 transition-colors flex items-center gap-1"
                    >
                        Translate
                    </button>

                    <button
                        onClick={() => handleAction('Summarize this:')}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium text-gray-700 transition-colors"
                    >
                        Summarize
                    </button>

                    <button
                        onClick={() => handleAction('Improve writing of this:')}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium text-gray-700 transition-colors"
                    >
                        Improve writing
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SelectionContext;
