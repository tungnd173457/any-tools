// Browser Agent - State Extractor
// Extracts current browser state for the agent's LLM context

import type { BrowserStateSummary, PageStats, ScrollInfo } from '../types/agent-types';

// ============================================================
// Helper: Execute script in tab
// ============================================================

async function executeInTab<T>(tabId: number, func: (...args: any[]) => T, args: any[] = []): Promise<T> {
    const results = await chrome.scripting.executeScript({
        target: { tabId },
        func,
        args,
    });
    if (!results || results.length === 0) throw new Error('Script execution returned no results');
    return results[0].result as T;
}

// ============================================================
// State Extractor
// ============================================================

export async function extractBrowserState(
    maxElementsLength: number = 40000,
    useVision: boolean = true
): Promise<BrowserStateSummary> {
    // Get active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error('No active tab found');

    // Execute DOM analysis in the page context
    const domData = await executeInTab(tab.id, (maxLen: number) => {
        // --- Page Statistics ---
        const allEls = document.querySelectorAll('*');
        const stats = { links: 0, interactive: 0, iframes: 0, images: 0, totalElements: allEls.length };
        for (const el of allEls) {
            const tag = el.tagName.toLowerCase();
            if (tag === 'a') stats.links++;
            else if (tag === 'iframe' || tag === 'frame') stats.iframes++;
            else if (tag === 'img') stats.images++;
        }

        // --- Scroll Info ---
        const scrollY = window.scrollY || document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight;
        const viewportHeight = window.innerHeight;
        const pagesAbove = viewportHeight > 0 ? scrollY / viewportHeight : 0;
        const pagesBelow = viewportHeight > 0 ? Math.max(0, scrollHeight - scrollY - viewportHeight) / viewportHeight : 0;

        // --- Interactive Elements (indexed, formatted as text) ---
        function isVisible(el: Element): boolean {
            const rect = el.getBoundingClientRect();
            if (rect.width === 0 && rect.height === 0) return false;
            try {
                const s = window.getComputedStyle(el);
                if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return false;
            } catch { return true; }
            return true;
        }

        function isInteractive(el: Element): boolean {
            const tag = el.tagName.toLowerCase();
            if (['a', 'button', 'input', 'textarea', 'select', 'option', 'details', 'summary'].includes(tag)) return true;
            const role = el.getAttribute('role');
            if (role && ['button', 'link', 'tab', 'menuitem', 'menuitemcheckbox', 'menuitemradio', 'option',
                'radio', 'switch', 'textbox', 'combobox', 'searchbox', 'slider', 'spinbutton', 'checkbox',
                'listbox', 'treeitem', 'gridcell'].includes(role)) return true;
            if (el.hasAttribute('tabindex') && el.getAttribute('tabindex') !== '-1') return true;
            if (el.getAttribute('contenteditable') === 'true') return true;
            if (el.hasAttribute('onclick') || el.hasAttribute('ng-click') || el.hasAttribute('@click')) return true;
            try { if (window.getComputedStyle(el).cursor === 'pointer') return true; } catch { /* skip */ }
            return false;
        }

        function getElText(el: Element): string {
            const tag = el.tagName.toLowerCase();
            if (tag === 'input') {
                const i = el as HTMLInputElement;
                return i.value || i.placeholder || i.getAttribute('aria-label') || i.name || '';
            }
            if (tag === 'textarea') {
                const t = el as HTMLTextAreaElement;
                return t.value || t.placeholder || t.getAttribute('aria-label') || '';
            }
            if (tag === 'select') {
                const s = el as HTMLSelectElement;
                return s.options[s.selectedIndex]?.text || s.getAttribute('aria-label') || '';
            }
            if (tag === 'img') return (el as HTMLImageElement).alt || el.getAttribute('aria-label') || '';
            const direct = Array.from(el.childNodes)
                .filter(n => n.nodeType === Node.TEXT_NODE)
                .map(n => n.textContent?.trim() || '')
                .join(' ');
            if (direct) return direct.slice(0, 200);
            return ((el as HTMLElement).innerText?.trim() || '').slice(0, 200);
        }

        // Build formatted elements text
        const lines: string[] = [];
        let idx = 1;
        let interactiveCount = 0;

        for (const el of allEls) {
            if (!isInteractive(el)) continue;
            interactiveCount++;
            const tag = el.tagName.toLowerCase();
            const vis = isVisible(el);
            if (!vis) continue; // Only show visible elements

            const text = getElText(el);
            const attrs: string[] = [];
            const ariaLabel = el.getAttribute('aria-label');
            if (ariaLabel) attrs.push(`aria-label='${ariaLabel}'`);
            const type = el.getAttribute('type');
            if (type) attrs.push(`type='${type}'`);
            const href = el.getAttribute('href');
            if (href && tag === 'a') attrs.push(`href='${href.slice(0, 80)}'`);
            const role = el.getAttribute('role');
            if (role) attrs.push(`role='${role}'`);
            const name = el.getAttribute('name');
            if (name) attrs.push(`name='${name}'`);
            const placeholder = el.getAttribute('placeholder');
            if (placeholder) attrs.push(`placeholder='${placeholder}'`);

            const attrStr = attrs.length > 0 ? ' ' + attrs.join(' ') : '';
            const textContent = text ? text.slice(0, 150) : '';

            lines.push(`[${idx}]<${tag}${attrStr}>${textContent}</${tag}>`);
            el.setAttribute('data-ba-idx', String(idx));
            idx++;
        }

        stats.interactive = interactiveCount;

        // Truncate if needed
        let elementsText = lines.join('\n');
        const wasTruncated = elementsText.length > maxLen;
        if (wasTruncated) {
            elementsText = elementsText.slice(0, maxLen) + '\n... [truncated]';
        }

        return {
            url: window.location.href,
            title: document.title,
            pageStats: stats,
            scrollInfo: {
                scrollY: Math.round(scrollY),
                scrollHeight: Math.round(scrollHeight),
                viewportHeight: Math.round(viewportHeight),
                pagesAbove: Math.round(pagesAbove * 10) / 10,
                pagesBelow: Math.round(pagesBelow * 10) / 10,
            },
            elementsText,
            elementCount: idx - 1,
            // For fingerprinting: raw elements text hash
            rawTextForHash: elementsText.slice(0, 5000),
        };
    }, [maxElementsLength]);

    // Capture screenshot if vision is enabled
    let screenshot: string | undefined;
    if (useVision) {
        try {
            screenshot = await chrome.tabs.captureVisibleTab(undefined as any, { format: 'png' });
        } catch {
            // Screenshot may fail (e.g., chrome:// pages)
        }
    }

    return {
        url: domData.url,
        title: domData.title,
        pageStats: domData.pageStats as PageStats,
        scrollInfo: domData.scrollInfo as ScrollInfo,
        elementsText: domData.elementsText,
        elementCount: domData.elementCount,
        screenshot,
    };
}

/**
 * Get raw text from elements for fingerprinting (used by loop detector)
 */
export async function getRawPageText(): Promise<string> {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return '';

    try {
        return await executeInTab(tab.id, () => {
            const body = document.body;
            if (!body) return '';
            return (body.innerText || '').slice(0, 5000);
        });
    } catch {
        return '';
    }
}
