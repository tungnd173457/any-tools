import React from 'react';
import { useChatContext } from '../context/ChatContext';
import {
    MessageSquare,
    Search,
    Highlighter,
    MonitorSmartphone,
    BrainCircuit,
    Cpu,
    Sparkles,
    Code
} from 'lucide-react';

const WelcomeScreen: React.FC = () => {
    const { sendMessage } = useChatContext();

    const topActions = [
        { icon: <MonitorSmartphone className="w-4 h-4" />, label: 'Full Screen Chat' },
        { icon: <BrainCircuit className="w-4 h-4" />, label: 'Deep Research' },
        { icon: <Highlighter className="w-4 h-4" />, label: 'My Highlights' },
        { icon: <Cpu className="w-4 h-4" />, label: 'AI Slides' },
    ];

    const quickActions = [
        { icon: <Sparkles className="w-4 h-4" />, label: 'Explain', prompt: 'Explain the following: ' },
        { icon: <Search className="w-4 h-4" />, label: 'Summarize', prompt: 'Summarize the following: ' },
        { icon: <MessageSquare className="w-4 h-4" />, label: 'Fix spelling & grammar', prompt: 'Fix spelling and grammar: ' },
        { icon: <Code className="w-4 h-4" />, label: 'Write code', prompt: 'Write code to: ' },
    ];

    return (
        <div className="flex flex-col h-full bg-[#0f0f10] text-white">
            {/* Header Spacer for alignment */}
            <div className="flex-1 min-h-[10%]" />

            <div className="px-6 pb-10 max-w-2xl mx-auto w-full flex flex-col items-start">

                {/* Greeting */}
                <h1 className="text-4xl font-bold mb-2 text-white/90">Hi,</h1>
                <h2 className="text-2xl font-semibold text-white/90 mb-8">How can I assist you today?</h2>

                {/* Top Actions (Mock functionality for now) */}
                <div className="flex flex-wrap gap-2 mb-10">
                    {topActions.map((action) => (
                        <button
                            key={action.label}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.1] hover:bg-white/[0.1] transition-colors text-xs font-medium text-white/80"
                        >
                            {action.icon}
                            {action.label}
                        </button>
                    ))}
                </div>

                {/* Quick Prompts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
                    {quickActions.map((action) => (
                        <button
                            key={action.label}
                            onClick={() => sendMessage(action.prompt)}
                            className="flex flex-col items-start gap-1 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.1] transition-all text-left group w-full"
                        >
                            <div className="flex items-center gap-2 text-white/50 group-hover:text-white/80 transition-colors">
                                {action.icon}
                                <span className="text-xs font-medium">{action.label}</span>
                            </div>
                            <span className="text-xs text-white/30 truncate w-full">
                                {action.prompt} ...
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1" />
        </div>
    );
};

export default WelcomeScreen;
