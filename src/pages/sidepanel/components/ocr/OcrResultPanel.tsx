import React from 'react';

interface OcrResultPanelProps {
    text: string;
    loading: boolean;
    onTextChange: (text: string) => void;
}

const OcrResultPanel: React.FC<OcrResultPanelProps> = ({ text, loading, onTextChange }) => {
    return (
        <div className="ocr-result-panel">
            <div className="ocr-result-header">
                <span className="text-sm font-semibold">Result:</span>
                {loading && (
                    <div className="ocr-result-loading">
                        <div className="ocr-spinner-sm" />
                        <span className="text-xs text-[var(--chrome-text-secondary)]">Extracting...</span>
                    </div>
                )}
            </div>
            <textarea
                className="ocr-result-textarea"
                value={text}
                onChange={(e) => onTextChange(e.target.value)}
                placeholder={loading ? 'Extracting text from image...' : 'Extracted text will appear here...'}
                readOnly={loading}
            />
        </div>
    );
};

export default OcrResultPanel;
