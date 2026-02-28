// Browser Agent - Loop Detector
// Detects repetitive behavior and page stagnation to nudge the agent

import type { PageFingerprint, LoopDetectorState } from '../types/agent-types';

// ============================================================
// Hash Utilities
// ============================================================

/** Simple hash via DJB2 algorithm (fast, no crypto needed) */
function djb2Hash(str: string): string {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0xffffffff;
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Normalize action parameters for similarity hashing.
 * Same logic as browser-use: normalize by action type.
 */
function normalizeActionForHash(toolName: string, params: Record<string, any>): string {
    if (toolName === 'navigate') {
        return `navigate|${params.url ?? ''}`;
    }

    if (toolName === 'click-element') {
        const index = params.index;
        if (index !== undefined) return `click|${index}`;
        if (params.coordinateX !== undefined) return `click|${params.coordinateX},${params.coordinateY}`;
        return `click|${params.selector ?? ''}`;
    }

    if (toolName === 'type-text') {
        const index = params.index ?? params.selector ?? 'focused';
        const text = (params.text ?? '').trim().toLowerCase();
        return `input|${index}|${text}`;
    }

    if (toolName === 'scroll') {
        return `scroll|${params.direction ?? 'down'}|${params.index ?? 'page'}`;
    }

    if (toolName === 'search-page') {
        const tokens = (params.pattern ?? '')
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(Boolean)
            .sort()
            .join('|');
        return `search|${tokens}`;
    }

    // Default: hash by tool name + sorted params
    const filtered = Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null)
        .sort(([a], [b]) => a.localeCompare(b));
    return `${toolName}|${JSON.stringify(Object.fromEntries(filtered))}`;
}

function computeActionHash(toolName: string, params: Record<string, any>): string {
    const normalized = normalizeActionForHash(toolName, params);
    return djb2Hash(normalized);
}

function computeTextHash(text: string): string {
    return djb2Hash(text);
}

// ============================================================
// Loop Detector
// ============================================================

export class LoopDetector {
    private state: LoopDetectorState;

    constructor(windowSize: number = 20) {
        this.state = {
            windowSize,
            recentActionHashes: [],
            recentPageFingerprints: [],
            maxRepetitionCount: 0,
            mostRepeatedHash: null,
            consecutiveStagnantPages: 0,
        };
    }

    /** Record an action and update repetition statistics */
    recordAction(toolName: string, params: Record<string, any>): void {
        const hash = computeActionHash(toolName, params);
        this.state.recentActionHashes.push(hash);

        // Trim to window size
        if (this.state.recentActionHashes.length > this.state.windowSize) {
            this.state.recentActionHashes = this.state.recentActionHashes.slice(-this.state.windowSize);
        }

        this._updateRepetitionStats();
    }

    /** Record the current page fingerprint and update stagnation count */
    recordPageState(url: string, domText: string, elementCount: number): void {
        const textHash = computeTextHash(domText);
        const fp: PageFingerprint = { url, elementCount, textHash };

        const last = this.state.recentPageFingerprints[this.state.recentPageFingerprints.length - 1];
        if (last && last.url === fp.url && last.elementCount === fp.elementCount && last.textHash === fp.textHash) {
            this.state.consecutiveStagnantPages++;
        } else {
            this.state.consecutiveStagnantPages = 0;
        }

        this.state.recentPageFingerprints.push(fp);
        // Keep only last 5 fingerprints
        if (this.state.recentPageFingerprints.length > 5) {
            this.state.recentPageFingerprints = this.state.recentPageFingerprints.slice(-5);
        }
    }

    /** Return an escalating nudge message, or null if no loop detected */
    getNudgeMessage(): string | null {
        const messages: string[] = [];

        // Action repetition nudges (escalating at 5, 8, 12)
        if (this.state.maxRepetitionCount >= 12) {
            messages.push(
                `⚠️ You have repeated a similar action ${this.state.maxRepetitionCount} times ` +
                `in the last ${this.state.recentActionHashes.length} actions. ` +
                `If you are making progress with each repetition, keep going. ` +
                `If not, a different approach might get you there faster.`
            );
        } else if (this.state.maxRepetitionCount >= 8) {
            messages.push(
                `⚠️ You have repeated a similar action ${this.state.maxRepetitionCount} times ` +
                `in the last ${this.state.recentActionHashes.length} actions. ` +
                `Are you still making progress? If not, try a different approach.`
            );
        } else if (this.state.maxRepetitionCount >= 5) {
            messages.push(
                `⚠️ You have repeated a similar action ${this.state.maxRepetitionCount} times ` +
                `in the last ${this.state.recentActionHashes.length} actions. ` +
                `If this is intentional and making progress, carry on. Otherwise, reconsider your approach.`
            );
        }

        // Page stagnation nudge
        if (this.state.consecutiveStagnantPages >= 5) {
            messages.push(
                `⚠️ The page content has not changed across ${this.state.consecutiveStagnantPages} consecutive actions. ` +
                `Your actions might not be having the intended effect. Try a different element or approach.`
            );
        }

        return messages.length > 0 ? messages.join('\n\n') : null;
    }

    /** Get current repetition count (for external monitoring) */
    getRepetitionCount(): number {
        return this.state.maxRepetitionCount;
    }

    /** Get consecutive stagnant pages count */
    getStagnationCount(): number {
        return this.state.consecutiveStagnantPages;
    }

    private _updateRepetitionStats(): void {
        if (this.state.recentActionHashes.length === 0) {
            this.state.maxRepetitionCount = 0;
            this.state.mostRepeatedHash = null;
            return;
        }

        const counts = new Map<string, number>();
        for (const h of this.state.recentActionHashes) {
            counts.set(h, (counts.get(h) ?? 0) + 1);
        }

        let maxHash = '';
        let maxCount = 0;
        for (const [hash, count] of counts) {
            if (count > maxCount) {
                maxCount = count;
                maxHash = hash;
            }
        }

        this.state.mostRepeatedHash = maxHash;
        this.state.maxRepetitionCount = maxCount;
    }
}
