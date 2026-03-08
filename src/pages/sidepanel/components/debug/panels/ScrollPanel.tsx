import React, { useState } from 'react';
import { ArrowDownUp } from 'lucide-react';
import { BrowserAgent } from '../../../../../services/browser-agent/client';
import DebugPanel from '../DebugPanel';

const DIRECTIONS = ['down', 'up', 'left', 'right'] as const;

const ScrollPanel: React.FC = () => {
    const [direction, setDirection] = useState<'up' | 'down' | 'left' | 'right'>('down');
    const [amount, setAmount] = useState('');
    const [index, setIndex] = useState('');

    return (
        <DebugPanel
            title="Scroll Page"
            description="Cuộn trang hoặc cuộn trong element cụ thể"
            icon={<ArrowDownUp className="w-4 h-4" />}
            inputArea={
                <div className="flex flex-col gap-2">
                    {/* Direction buttons */}
                    <div className="flex gap-1">
                        {DIRECTIONS.map((dir) => (
                            <button
                                key={dir}
                                className={`debug-btn ${direction === dir ? 'debug-btn-active' : ''}`}
                                style={{ flex: 1, textTransform: 'capitalize', fontSize: '11px' }}
                                onClick={() => setDirection(dir)}
                            >
                                {dir}
                            </button>
                        ))}
                    </div>
                    {/* Amount & Index */}
                    <div className="flex gap-2">
                        <input
                            className="debug-input flex-1"
                            type="number"
                            min={0}
                            placeholder="Amount (px, default=viewport)"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                        />
                        <input
                            className="debug-input flex-1"
                            type="number"
                            min={0}
                            placeholder="Element index (optional)"
                            value={index}
                            onChange={(e) => setIndex(e.target.value)}
                        />
                    </div>
                </div>
            }
            onRun={() => {
                const scrollAmount = amount ? parseInt(amount, 10) : undefined;
                const scrollIndex = index ? parseInt(index, 10) : undefined;
                return BrowserAgent.scroll({
                    direction,
                    amount: scrollAmount,
                    index: scrollIndex,
                });
            }}
            renderOutput={(data) => {
                const result = data?.data ?? data;
                if (result && typeof result === 'object') {
                    return (
                        <div className="debug-output-pre" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div><strong>Status:</strong> {result.success ? '✅ Success' : '❌ Failed'}</div>
                            {result.description && <div><strong>Action:</strong> {result.description}</div>}
                            <div><strong>Scroll Top:</strong> {result.scrollTop}px</div>
                            <div><strong>Scroll Height:</strong> {result.scrollHeight}px</div>
                            <div><strong>Viewport Height:</strong> {result.viewportHeight}px</div>
                            <div>
                                <strong>Position:</strong>{' '}
                                {result.scrollHeight > 0
                                    ? `${Math.round(((result.scrollTop + result.viewportHeight) / result.scrollHeight) * 100)}%`
                                    : 'N/A'}
                            </div>
                        </div>
                    );
                }
                return <pre className="debug-output-pre">{JSON.stringify(data, null, 2)}</pre>;
            }}
        />
    );
};

export default ScrollPanel;
