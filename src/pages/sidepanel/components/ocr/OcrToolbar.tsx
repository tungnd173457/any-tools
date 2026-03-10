import React, { useCallback, useState } from 'react';

interface OcrToolbarProps {
    text: string;
    onReExtract: () => void;
    onCrop: () => void;
    onClear: () => void;
}

const OcrToolbar: React.FC<OcrToolbarProps> = ({ text, onReExtract, onCrop, onClear }) => {
    const [copied, setCopied] = useState(false);
    const [speaking, setSpeaking] = useState(false);

    const handleCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback
            const ta = document.createElement('textarea');
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    }, [text]);

    const handleSpeak = useCallback(() => {
        if (speaking) {
            speechSynthesis.cancel();
            setSpeaking(false);
            return;
        }
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.onend = () => setSpeaking(false);
        utterance.onerror = () => setSpeaking(false);
        speechSynthesis.speak(utterance);
        setSpeaking(true);
    }, [text, speaking]);

    return (
        <div className="ocr-toolbar">
            <div className="flex items-center gap-1">
                {/* Copy */}
                <button onClick={handleCopy} className="ocr-toolbar-btn" title={copied ? 'Copied!' : 'Copy to clipboard'}>
                    {copied ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                    ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                    )}
                </button>

                {/* Re-crop */}
                <button onClick={onCrop} className="ocr-toolbar-btn" title="Re-capture screenshot">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 2v4h12v12h4" />
                        <path d="M18 22v-4H6V6H2" />
                    </svg>
                </button>

                {/* Re-extract */}
                <button onClick={onReExtract} className="ocr-toolbar-btn" title="Re-extract text">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="23 4 23 10 17 10" />
                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                    </svg>
                </button>

                {/* Edit (visual indicator that text is editable) */}
                <button className="ocr-toolbar-btn" title="Edit text (click in result area)">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                </button>

                {/* Speak */}
                <button onClick={handleSpeak} className={`ocr-toolbar-btn ${speaking ? 'ocr-toolbar-btn-active' : ''}`} title={speaking ? 'Stop speaking' : 'Read aloud'}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                    </svg>
                </button>
            </div>

            {/* Clear / New */}
            <button onClick={onClear} className="ocr-toolbar-chat-btn" title="Clear and start new">
                Chat
            </button>
        </div>
    );
};

export default OcrToolbar;
