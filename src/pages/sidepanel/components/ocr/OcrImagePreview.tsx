import React, { useRef, useState, useCallback, useEffect } from 'react';

interface OcrImagePreviewProps {
    imageUrl: string;
    onDelete: () => void;
    onExtract: () => void;
    onCrop: () => void;
    extracting: boolean;
}

const OcrImagePreview: React.FC<OcrImagePreviewProps> = ({
    imageUrl,
    onDelete,
    onExtract,
    onCrop,
    extracting,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [dragging, setDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const posStart = useRef({ x: 0, y: 0 });

    // Reset zoom/pan when image changes
    useEffect(() => {
        setScale(1);
        setPosition({ x: 0, y: 0 });
    }, [imageUrl]);

    const handleZoomIn = useCallback(() => {
        setScale((s) => Math.min(s + 0.25, 5));
    }, []);

    const handleZoomOut = useCallback(() => {
        setScale((s) => {
            const next = Math.max(s - 0.25, 0.25);
            if (next <= 1) setPosition({ x: 0, y: 0 });
            return next;
        });
    }, []);

    const handleFit = useCallback(() => {
        setScale(1);
        setPosition({ x: 0, y: 0 });
    }, []);

    const handleMouseDown = useCallback(
        (e: React.MouseEvent) => {
            if (scale <= 1) return;
            e.preventDefault();
            setDragging(true);
            dragStart.current = { x: e.clientX, y: e.clientY };
            posStart.current = { ...position };
        },
        [scale, position]
    );

    const handleMouseMove = useCallback(
        (e: React.MouseEvent) => {
            if (!dragging) return;
            setPosition({
                x: posStart.current.x + (e.clientX - dragStart.current.x),
                y: posStart.current.y + (e.clientY - dragStart.current.y),
            });
        },
        [dragging]
    );

    const handleMouseUp = useCallback(() => {
        setDragging(false);
    }, []);

    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.stopPropagation();
        const delta = e.deltaY > 0 ? -0.15 : 0.15;
        setScale((s) => {
            const next = Math.max(0.25, Math.min(5, s + delta));
            if (next <= 1) setPosition({ x: 0, y: 0 });
            return next;
        });
    }, []);

    return (
        <div className="ocr-preview-container">
            {/* Image area */}
            <div
                ref={containerRef}
                className="ocr-preview-image-area"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
                style={{ cursor: scale > 1 ? (dragging ? 'grabbing' : 'grab') : 'default' }}
            >
                <img
                    src={imageUrl}
                    alt="OCR preview"
                    className="ocr-preview-img"
                    style={{
                        transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                    }}
                    draggable={false}
                />

                {/* Zoom controls */}
                <div className="ocr-zoom-controls">
                    <button onClick={handleFit} className="ocr-zoom-btn" title="Fit to view">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                    </button>
                    <button onClick={handleZoomIn} className="ocr-zoom-btn" title="Zoom in">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                    </button>
                    <button onClick={handleZoomOut} className="ocr-zoom-btn" title="Zoom out">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                    </button>
                </div>

                {/* Extracting overlay */}
                {extracting && (
                    <div className="ocr-extracting-overlay">
                        <div className="ocr-spinner" />
                        <span className="text-xs font-medium mt-2">Extracting text...</span>
                    </div>
                )}
            </div>

            {/* Action bar */}
            <div className="ocr-preview-actions">
                <button onClick={onDelete} className="ocr-action-btn ocr-action-delete" title="Remove image">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                </button>
                <div className="flex gap-1">
                    <button
                        onClick={onExtract}
                        disabled={extracting}
                        className="ocr-action-btn ocr-action-extract"
                        title="Extract text (OCR)"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <path d="M7 7h.01" />
                            <path d="M17 7h.01" />
                            <path d="M7 17h.01" />
                            <path d="M17 17h.01" />
                        </svg>
                    </button>
                    <button onClick={onCrop} className="ocr-action-btn" title="Crop / Re-capture">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M6 2v4h12v12h4" />
                            <path d="M18 22v-4H6V6H2" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OcrImagePreview;
