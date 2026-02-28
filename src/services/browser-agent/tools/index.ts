// Browser Agent - Tools Service
// Orchestrates all browser automation tools from the background script context

import type {
    ToolResult,
    NavigateAction,
    ClickElementAction,
    TypeTextAction,
    ScrollAction,
    SendKeysAction,
    WaitForElementAction,
    WaitForNavigationAction,
    SearchPageAction,
    FindElementsAction,
    GetDropdownOptionsAction,
    SelectDropdownOptionAction,
    EvaluateJSAction,
    CaptureVisibleTabAction,
    ExtractLinksAction,
    HighlightElementAction,
    FillFormAction,
    GetPageTextAction,
    BrowserAgentAction,
} from '../types';

// ============================================================
// Helper: Get Active Tab
// ============================================================

async function getActiveTab(): Promise<chrome.tabs.Tab> {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error('No active tab found');
    return tab;
}

// ============================================================
// Helper: Execute script in tab
// ============================================================

async function executeInTab<T>(
    tabId: number,
    func: (...args: any[]) => T,
    args: any[] = []
): Promise<T> {
    const results = await chrome.scripting.executeScript({
        target: { tabId },
        func,
        args,
    });

    if (!results || results.length === 0) {
        throw new Error('Script execution returned no results');
    }

    if (results[0].result === undefined) {
        // The function might return void, which is fine
        return undefined as T;
    }

    return results[0].result as T;
}

// ============================================================
// Tool: Navigate
// ============================================================

async function navigateTool(params: NavigateAction): Promise<ToolResult> {
    try {
        let url = params.url;
        // Add protocol if missing
        if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('chrome://')) {
            url = 'https://' + url;
        }

        if (params.newTab) {
            const tab = await chrome.tabs.create({ url, active: true });
            return {
                success: true,
                data: { description: `Opened new tab with URL: ${url}`, tabId: tab.id },
            };
        } else {
            const tab = await getActiveTab();
            await chrome.tabs.update(tab.id!, { url });

            // Wait for page to start loading
            await new Promise<void>((resolve) => {
                const listener = (tabId: number, changeInfo: { status?: string }) => {
                    if (tabId === tab.id && changeInfo.status === 'complete') {
                        chrome.tabs.onUpdated.removeListener(listener);
                        resolve();
                    }
                };
                chrome.tabs.onUpdated.addListener(listener);
                // Timeout after 15 seconds
                setTimeout(() => {
                    chrome.tabs.onUpdated.removeListener(listener);
                    resolve();
                }, 15000);
            });

            return {
                success: true,
                data: { description: `Navigated to ${url}` },
            };
        }
    } catch (e: any) {
        return { success: false, error: `Navigation failed: ${e.message}` };
    }
}

// ============================================================
// Tool: Go Back
// ============================================================

async function goBackTool(): Promise<ToolResult> {
    try {
        const tab = await getActiveTab();
        await chrome.tabs.goBack(tab.id!);
        return { success: true, data: { description: 'Navigated back' } };
    } catch (e: any) {
        return { success: false, error: `Go back failed: ${e.message}` };
    }
}

// ============================================================
// Tool: Get Page Text
// ============================================================

async function getPageTextTool(params?: GetPageTextAction): Promise<ToolResult> {
    try {
        const tab = await getActiveTab();
        const result = await executeInTab(tab.id!, (includeLinks: boolean, maxLength: number) => {
            // Inline simplified text extraction (runs in page context)
            function extractText(node: Node, depth: number = 0): string {
                if (depth > 50) return '';
                const parts: string[] = [];
                if (node.nodeType === Node.TEXT_NODE) {
                    const text = node.textContent?.trim();
                    if (text) parts.push(text);
                } else if (node.nodeType === Node.ELEMENT_NODE) {
                    const el = node as Element;
                    const tag = el.tagName.toLowerCase();
                    const skipTags = ['script', 'style', 'noscript', 'svg', 'path', 'meta', 'link', 'head'];
                    if (skipTags.includes(tag)) return '';
                    try {
                        const style = window.getComputedStyle(el);
                        if (style.display === 'none' || style.visibility === 'hidden') return '';
                    } catch { /* skip */ }
                    if (/^h[1-6]$/.test(tag)) {
                        const headerText = (el as HTMLElement).innerText?.trim();
                        if (headerText) parts.push('\n' + '#'.repeat(parseInt(tag[1])) + ' ' + headerText + '\n');
                        return parts.join('');
                    }
                    if (tag === 'a' && includeLinks) {
                        const href = el.getAttribute('href');
                        const linkText = (el as HTMLElement).innerText?.trim();
                        if (linkText && href) { parts.push(`[${linkText}](${href})`); return parts.join(''); }
                    }
                    if (tag === 'li') {
                        const liText = (el as HTMLElement).innerText?.trim();
                        if (liText) parts.push('- ' + liText);
                        return parts.join('');
                    }
                    const blockTags = ['div', 'p', 'section', 'article', 'main', 'aside', 'header', 'footer', 'nav', 'ul', 'ol', 'table', 'tr', 'blockquote', 'pre', 'form', 'fieldset'];
                    if (tag === 'br') { parts.push('\n'); return parts.join(''); }
                    if (tag === 'hr') { parts.push('\n---\n'); return parts.join(''); }
                    for (const child of node.childNodes) {
                        const childText = extractText(child, depth + 1);
                        if (childText) parts.push(childText);
                    }
                    if (blockTags.includes(tag) && parts.length > 0) return '\n' + parts.join(' ') + '\n';
                }
                return parts.join(' ');
            }
            let text = extractText(document.body);
            text = text.replace(/\n{3,}/g, '\n\n').trim();
            if (text.length > maxLength) text = text.slice(0, maxLength) + '\n\n[...truncated]';
            return { url: window.location.href, title: document.title, text, length: text.length };
        }, [params?.includeLinks ?? false, params?.maxLength ?? 100000]);

        return { success: true, data: result };
    } catch (e: any) {
        return { success: false, error: `Failed to get page text: ${e.message}` };
    }
}

// ============================================================
// Tool: Get Elements
// ============================================================

async function getElementsTool(): Promise<ToolResult> {
    try {
        const tab = await getActiveTab();
        const result = await executeInTab(tab.id!, () => {
            // Inline element discovery (runs in page context)
            function buildCssPath(el: Element): string {
                const parts: string[] = [];
                let current: Element | null = el;
                while (current && current !== document.body && current !== document.documentElement) {
                    let desc = current.tagName.toLowerCase();
                    if (current.id) desc += `#${current.id}`;
                    else if (current.className && typeof current.className === 'string') {
                        const classes = current.className.trim().split(/\s+/).slice(0, 2).join('.');
                        if (classes) desc += `.${classes}`;
                    }
                    parts.unshift(desc);
                    current = current.parentElement;
                }
                return parts.join(' > ');
            }
            function isElementVisible(el: Element): boolean {
                const rect = el.getBoundingClientRect();
                if (rect.width === 0 && rect.height === 0) return false;
                try {
                    const style = window.getComputedStyle(el);
                    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
                } catch { return true; }
                return true;
            }
            function isInteractive(el: Element): boolean {
                const tag = el.tagName.toLowerCase();
                if (['a', 'button', 'input', 'textarea', 'select', 'option', 'details', 'summary'].includes(tag)) return true;
                const role = el.getAttribute('role');
                if (role && ['button', 'link', 'tab', 'menuitem', 'menuitemcheckbox', 'menuitemradio', 'option', 'radio', 'switch', 'textbox', 'combobox', 'searchbox', 'slider', 'spinbutton', 'checkbox', 'listbox', 'treeitem', 'gridcell'].includes(role)) return true;
                if (el.hasAttribute('tabindex') && el.getAttribute('tabindex') !== '-1') return true;
                if (el.getAttribute('contenteditable') === 'true') return true;
                if (el.hasAttribute('onclick') || el.hasAttribute('ng-click') || el.hasAttribute('@click') || el.hasAttribute('data-action')) return true;
                try { if (window.getComputedStyle(el).cursor === 'pointer') return true; } catch { /* skip */ }
                return false;
            }
            function getElementText(el: Element): string {
                const tag = el.tagName.toLowerCase();
                if (tag === 'input') { const i = el as HTMLInputElement; return i.value || i.placeholder || i.getAttribute('aria-label') || i.name || ''; }
                if (tag === 'textarea') { const t = el as HTMLTextAreaElement; return t.value || t.placeholder || t.getAttribute('aria-label') || ''; }
                if (tag === 'select') { const s = el as HTMLSelectElement; return s.options[s.selectedIndex]?.text || s.getAttribute('aria-label') || ''; }
                if (tag === 'img') return (el as HTMLImageElement).alt || el.getAttribute('aria-label') || '';
                const directText = Array.from(el.childNodes).filter(n => n.nodeType === Node.TEXT_NODE).map(n => n.textContent?.trim() || '').join(' ');
                if (directText) return directText.slice(0, 200);
                return ((el as HTMLElement).innerText?.trim() || '').slice(0, 200);
            }

            const allElements = document.querySelectorAll('*');
            const interactiveElements: any[] = [];
            let idx = 1;
            for (const el of allElements) {
                if (!isInteractive(el)) continue;
                const visible = isElementVisible(el);
                const rect = el.getBoundingClientRect();
                const tag = el.tagName.toLowerCase();
                const info: any = {
                    index: idx, tag, text: getElementText(el), isVisible: visible,
                    rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) },
                    tagPath: buildCssPath(el),
                };
                const type = el.getAttribute('type'); if (type) info.type = type;
                const role = el.getAttribute('role'); if (role) info.role = role;
                const placeholder = el.getAttribute('placeholder'); if (placeholder) info.placeholder = placeholder;
                const name = el.getAttribute('name'); if (name) info.name = name;
                const id = el.id; if (id) info.id = id;
                const href = el.getAttribute('href'); if (href) info.href = href;
                const ariaLabel = el.getAttribute('aria-label'); if (ariaLabel) info.ariaLabel = ariaLabel;
                if (tag === 'input') {
                    const input = el as HTMLInputElement;
                    if (input.type === 'checkbox' || input.type === 'radio') info.checked = input.checked;
                    if (input.value) info.value = input.value;
                }
                if ((el as HTMLInputElement).disabled) info.disabled = true;
                el.setAttribute('data-ba-idx', String(idx));
                interactiveElements.push(info);
                idx++;
            }

            return {
                url: window.location.href,
                title: document.title,
                elements: interactiveElements,
                totalElements: interactiveElements.length,
                scrollHeight: document.documentElement.scrollHeight,
                scrollTop: window.scrollY || document.documentElement.scrollTop,
                viewportHeight: window.innerHeight,
            };
        });

        return { success: true, data: result };
    } catch (e: any) {
        return { success: false, error: `Failed to get elements: ${e.message}` };
    }
}

// ============================================================
// Tool: Click Element
// ============================================================

async function clickElementTool(params: ClickElementAction): Promise<ToolResult> {
    try {
        const tab = await getActiveTab();

        if (params.coordinateX !== undefined && params.coordinateY !== undefined) {
            // Click by coordinates
            const result = await executeInTab(tab.id!, (x: number, y: number) => {
                const el = document.elementFromPoint(x, y) as HTMLElement;
                if (!el) return { success: false, error: `No element found at (${x}, ${y})` };
                el.focus(); el.click();
                el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: x, clientY: y }));
                return { success: true, description: `Clicked at (${x}, ${y}) on ${el.tagName.toLowerCase()}` };
            }, [params.coordinateX, params.coordinateY]);
            return { success: result.success, data: result, error: result.error };
        }

        if (params.index !== undefined) {
            // Click by index
            const result = await executeInTab(tab.id!, (index: number) => {
                const el = document.querySelector(`[data-ba-idx="${index}"]`) as HTMLElement;
                if (!el) return { success: false, error: `Element with index ${index} not found. The page may have changed.` };
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el.focus(); el.click();
                el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
                el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
                el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                const desc = `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}`;
                const text = ((el as HTMLElement).innerText?.trim() || '').slice(0, 50);
                return { success: true, description: `Clicked ${desc}: "${text}"` };
            }, [params.index]);
            return { success: result.success, data: result, error: result.error };
        }

        if (params.selector) {
            // Click by CSS selector
            const result = await executeInTab(tab.id!, (sel: string) => {
                const el = document.querySelector(sel) as HTMLElement;
                if (!el) return { success: false, error: `Element not found: ${sel}` };
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el.focus(); el.click();
                el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                return { success: true, description: `Clicked element: ${sel}` };
            }, [params.selector]);
            return { success: result.success, data: result, error: result.error };
        }

        return { success: false, error: 'Must provide index, selector, or coordinates to click' };
    } catch (e: any) {
        return { success: false, error: `Click failed: ${e.message}` };
    }
}

// ============================================================
// Tool: Type Text
// ============================================================

async function typeTextTool(params: TypeTextAction): Promise<ToolResult> {
    try {
        const tab = await getActiveTab();
        const result = await executeInTab(tab.id!, (index: number, selector: string, text: string, clear: boolean, pressEnter: boolean) => {
            let el: HTMLElement | null = null;

            if (index > 0) {
                el = document.querySelector(`[data-ba-idx="${index}"]`) as HTMLElement;
            } else if (selector) {
                el = document.querySelector(selector) as HTMLElement;
            } else {
                el = document.activeElement as HTMLElement;
                if (!el || el === document.body) {
                    return { success: false, error: 'No element focused. Provide an index or selector.' };
                }
            }

            if (!el) return { success: false, error: `Element not found` };

            el.focus();
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });

            const isInput = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;

            if (isInput) {
                const inputEl = el as HTMLInputElement | HTMLTextAreaElement;
                if (clear) {
                    inputEl.value = '';
                    inputEl.dispatchEvent(new Event('input', { bubbles: true }));
                }
                // Use native setter for React compatibility
                const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                    el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, 'value'
                )?.set;
                if (nativeInputValueSetter) {
                    nativeInputValueSetter.call(inputEl, clear ? text : inputEl.value + text);
                } else {
                    inputEl.value = clear ? text : inputEl.value + text;
                }
                inputEl.dispatchEvent(new Event('input', { bubbles: true }));
                inputEl.dispatchEvent(new Event('change', { bubbles: true }));
            } else if (el.getAttribute('contenteditable') === 'true') {
                if (clear) el.textContent = '';
                el.textContent = (el.textContent || '') + text;
                el.dispatchEvent(new Event('input', { bubbles: true }));
            } else {
                return { success: false, error: `Element is not a text input (tag: ${el.tagName.toLowerCase()})` };
            }

            if (pressEnter) {
                el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true } as any));
                el.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true } as any));
                const form = el.closest('form');
                if (form) form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
            }

            return { success: true, description: `Typed "${text.slice(0, 50)}${text.length > 50 ? '...' : ''}"` };
        }, [
            params.index ?? 0,
            params.selector ?? '',
            params.text,
            params.clear ?? true,
            params.pressEnter ?? false,
        ]);

        return { success: result.success, data: result, error: result.error };
    } catch (e: any) {
        return { success: false, error: `Type text failed: ${e.message}` };
    }
}

// ============================================================
// Tool: Scroll
// ============================================================

async function scrollTool(params: ScrollAction): Promise<ToolResult> {
    try {
        const tab = await getActiveTab();
        const result = await executeInTab(tab.id!, (dir: string, amt: number, idx: number, sel: string) => {
            let target: Element = document.documentElement;
            if (idx > 0) { const el = document.querySelector(`[data-ba-idx="${idx}"]`); if (el) target = el; }
            else if (sel) { const el = document.querySelector(sel); if (el) target = el; }
            const vh = window.innerHeight;
            const pixels = amt || vh;
            const opts: ScrollToOptions = { behavior: 'smooth' };
            switch (dir) {
                case 'down': opts.top = (target === document.documentElement ? window.scrollY : target.scrollTop) + pixels; break;
                case 'up': opts.top = (target === document.documentElement ? window.scrollY : target.scrollTop) - pixels; break;
                case 'right': opts.left = (target === document.documentElement ? window.scrollX : target.scrollLeft) + pixels; break;
                case 'left': opts.left = (target === document.documentElement ? window.scrollX : target.scrollLeft) - pixels; break;
            }
            if (target === document.documentElement) window.scrollTo(opts); else target.scrollTo(opts);
            return {
                success: true,
                scrollTop: window.scrollY,
                scrollHeight: document.documentElement.scrollHeight,
                viewportHeight: vh,
                description: `Scrolled ${dir} by ${pixels}px`,
            };
        }, [params.direction, params.amount ?? 0, params.index ?? 0, params.selector ?? '']);

        return { success: result.success, data: result };
    } catch (e: any) {
        return { success: false, error: `Scroll failed: ${e.message}` };
    }
}

// ============================================================
// Tool: Send Keys
// ============================================================

async function sendKeysTool(params: SendKeysAction): Promise<ToolResult> {
    try {
        const tab = await getActiveTab();
        const result = await executeInTab(tab.id!, (keys: string) => {
            const target = document.activeElement || document.body;
            const parts = keys.split('+');
            const key = parts[parts.length - 1];
            const ctrlKey = parts.includes('Control') || parts.includes('Ctrl');
            const shiftKey = parts.includes('Shift');
            const altKey = parts.includes('Alt');
            const metaKey = parts.includes('Meta') || parts.includes('Command');
            const keyMap: Record<string, any> = {
                'Enter': { key: 'Enter', code: 'Enter', keyCode: 13 },
                'Escape': { key: 'Escape', code: 'Escape', keyCode: 27 },
                'Tab': { key: 'Tab', code: 'Tab', keyCode: 9 },
                'Backspace': { key: 'Backspace', code: 'Backspace', keyCode: 8 },
                'Delete': { key: 'Delete', code: 'Delete', keyCode: 46 },
                'ArrowUp': { key: 'ArrowUp', code: 'ArrowUp', keyCode: 38 },
                'ArrowDown': { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40 },
                'ArrowLeft': { key: 'ArrowLeft', code: 'ArrowLeft', keyCode: 37 },
                'ArrowRight': { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39 },
                'Space': { key: ' ', code: 'Space', keyCode: 32 },
            };
            const ki = keyMap[key] || { key, code: `Key${key.toUpperCase()}`, keyCode: key.charCodeAt(0) };
            const init: any = { key: ki.key, code: ki.code, keyCode: ki.keyCode, ctrlKey, shiftKey, altKey, metaKey, bubbles: true };
            target.dispatchEvent(new KeyboardEvent('keydown', init));
            target.dispatchEvent(new KeyboardEvent('keyup', init));
            return { success: true, description: `Sent keys: ${keys}` };
        }, [params.keys]);

        return { success: result.success, data: result };
    } catch (e: any) {
        return { success: false, error: `Send keys failed: ${e.message}` };
    }
}

// ============================================================
// Tool: Wait for Element
// ============================================================

async function waitForElementTool(params: WaitForElementAction): Promise<ToolResult> {
    try {
        const tab = await getActiveTab();
        const result = await executeInTab(tab.id!, (sel: string, timeout: number, visible: boolean) => {
            return new Promise((resolve) => {
                const start = Date.now();
                function check() {
                    const el = document.querySelector(sel);
                    if (el) {
                        if (!visible) { resolve({ success: true, found: true }); return; }
                        const rect = el.getBoundingClientRect();
                        const style = window.getComputedStyle(el);
                        if (rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden') {
                            resolve({ success: true, found: true });
                            return;
                        }
                    }
                    if (Date.now() - start >= timeout) {
                        resolve({ success: true, found: false, error: `Element "${sel}" not found within ${timeout}ms` });
                        return;
                    }
                    setTimeout(check, 100);
                }
                check();
            });
        }, [params.selector, params.timeout ?? 5000, params.visible ?? true]);

        return { success: true, data: result };
    } catch (e: any) {
        return { success: false, error: `Wait for element failed: ${e.message}` };
    }
}

// ============================================================
// Tool: Wait for Navigation
// ============================================================

async function waitForNavigationTool(params?: WaitForNavigationAction): Promise<ToolResult> {
    try {
        const tab = await getActiveTab();
        const timeout = params?.timeout ?? 10000;

        return new Promise((resolve) => {
            let resolved = false;
            const listener = (tabId: number, changeInfo: { status?: string }) => {
                if (tabId === tab.id && changeInfo.status === 'complete' && !resolved) {
                    resolved = true;
                    chrome.tabs.onUpdated.removeListener(listener);
                    resolve({ success: true, data: { description: 'Navigation completed' } });
                }
            };
            chrome.tabs.onUpdated.addListener(listener);
            setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    chrome.tabs.onUpdated.removeListener(listener);
                    resolve({ success: true, data: { description: 'Navigation wait timed out', timedOut: true } });
                }
            }, timeout);
        });
    } catch (e: any) {
        return { success: false, error: `Wait for navigation failed: ${e.message}` };
    }
}

// ============================================================
// Tool: Search Page
// ============================================================

async function searchPageTool(params: SearchPageAction): Promise<ToolResult> {
    try {
        const tab = await getActiveTab();
        const result = await executeInTab(tab.id!, (
            pattern: string, regex: boolean, caseSensitive: boolean,
            contextChars: number, cssScope: string | null, maxResults: number
        ) => {
            const scope = cssScope ? document.querySelector(cssScope) : document.body;
            if (!scope) return { matches: [], total: 0, hasMore: false };
            const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
            let fullText = '';
            const nodeOffsets: { offset: number; length: number; parentTag: string }[] = [];
            while (walker.nextNode()) {
                const text = walker.currentNode.textContent;
                if (text && text.trim()) {
                    const parent = walker.currentNode.parentElement;
                    nodeOffsets.push({ offset: fullText.length, length: text.length, parentTag: parent?.tagName?.toLowerCase() || '' });
                    fullText += text;
                }
            }
            let re: RegExp;
            const flags = caseSensitive ? 'g' : 'gi';
            if (regex) { re = new RegExp(pattern, flags); }
            else { re = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags); }
            const matches: any[] = [];
            let match: RegExpExecArray | null;
            let totalFound = 0;
            while ((match = re.exec(fullText)) !== null) {
                totalFound++;
                if (matches.length < maxResults) {
                    const start = Math.max(0, match.index - contextChars);
                    const end = Math.min(fullText.length, match.index + match[0].length + contextChars);
                    matches.push({
                        matchText: match[0],
                        context: (start > 0 ? '...' : '') + fullText.slice(start, end) + (end < fullText.length ? '...' : ''),
                        charPosition: match.index,
                    });
                }
                if (match[0].length === 0) re.lastIndex++;
            }
            return { matches, total: totalFound, hasMore: totalFound > maxResults };
        }, [
            params.pattern, params.regex ?? false, params.caseSensitive ?? false,
            params.contextChars ?? 150, params.cssScope ?? null, params.maxResults ?? 25,
        ]);

        return { success: true, data: result };
    } catch (e: any) {
        return { success: false, error: `Search page failed: ${e.message}` };
    }
}

// ============================================================
// Tool: Find Elements by CSS Selector
// ============================================================

async function findElementsTool(params: FindElementsAction): Promise<ToolResult> {
    try {
        const tab = await getActiveTab();
        const result = await executeInTab(tab.id!, (
            sel: string, attrs: string[] | null, maxRes: number, inclText: boolean
        ) => {
            try {
                const elements = document.querySelectorAll(sel);
                const total = elements.length;
                const limit = Math.min(total, maxRes);
                const results: any[] = [];
                for (let i = 0; i < limit; i++) {
                    const el = elements[i];
                    const item: any = { index: i, tag: el.tagName.toLowerCase(), childrenCount: el.children.length };
                    if (inclText) {
                        const text = (el as HTMLElement).textContent?.trim() || '';
                        item.text = text.length > 300 ? text.slice(0, 300) + '...' : text;
                    }
                    if (attrs && attrs.length > 0) {
                        item.attrs = {} as any;
                        for (const attr of attrs) {
                            const val = el.getAttribute(attr);
                            if (val !== null) item.attrs[attr] = val.length > 500 ? val.slice(0, 500) + '...' : val;
                        }
                    }
                    results.push(item);
                }
                return { elements: results, total, showing: limit };
            } catch (e: any) {
                return { elements: [], total: 0, showing: 0, error: e.message };
            }
        }, [params.selector, params.attributes ?? null, params.maxResults ?? 50, params.includeText ?? true]);

        return { success: true, data: result };
    } catch (e: any) {
        return { success: false, error: `Find elements failed: ${e.message}` };
    }
}

// ============================================================
// Tool: Get Dropdown Options
// ============================================================

async function getDropdownOptionsTool(params: GetDropdownOptionsAction): Promise<ToolResult> {
    try {
        const tab = await getActiveTab();
        const result = await executeInTab(tab.id!, (idx: number, sel: string) => {
            let el: Element | null = null;
            if (idx > 0) el = document.querySelector(`[data-ba-idx="${idx}"]`);
            else if (sel) el = document.querySelector(sel);
            if (!el || el.tagName.toLowerCase() !== 'select') return { success: false, error: 'Not a <select> element' };
            const s = el as HTMLSelectElement;
            return {
                success: true,
                options: Array.from(s.options).map(o => ({
                    value: o.value, text: o.text, selected: o.selected, disabled: o.disabled,
                })),
            };
        }, [params.index ?? 0, params.selector ?? '']);

        return { success: result.success, data: result, error: result.error };
    } catch (e: any) {
        return { success: false, error: `Get dropdown options failed: ${e.message}` };
    }
}

// ============================================================
// Tool: Select Dropdown Option
// ============================================================

async function selectDropdownOptionTool(params: SelectDropdownOptionAction): Promise<ToolResult> {
    try {
        const tab = await getActiveTab();
        const result = await executeInTab(tab.id!, (idx: number, sel: string, val: string, txt: string) => {
            let el: Element | null = null;
            if (idx > 0) el = document.querySelector(`[data-ba-idx="${idx}"]`);
            else if (sel) el = document.querySelector(sel);
            if (!el || el.tagName.toLowerCase() !== 'select') return { success: false, error: 'Not a <select> element' };
            const s = el as HTMLSelectElement;
            let found = false;
            for (const opt of s.options) {
                if ((val && opt.value === val) || (txt && opt.text === txt)) { opt.selected = true; found = true; break; }
            }
            if (!found) return { success: false, error: `Option not found: ${txt || val}` };
            s.dispatchEvent(new Event('change', { bubbles: true }));
            return { success: true, description: `Selected: ${txt || val}` };
        }, [params.index ?? 0, params.selector ?? '', params.value ?? '', params.text ?? '']);

        return { success: result.success, data: result, error: result.error };
    } catch (e: any) {
        return { success: false, error: `Select dropdown failed: ${e.message}` };
    }
}

// ============================================================
// Tool: Evaluate JS
// ============================================================

async function evaluateJSTool(params: EvaluateJSAction): Promise<ToolResult> {
    try {
        const tab = await getActiveTab();
        const result = await executeInTab(tab.id!, (code: string) => {
            try {
                const fn = new Function(code);
                const result = fn();
                // Handle promises
                if (result && typeof result.then === 'function') {
                    return result.then((v: any) => ({ success: true, result: v }))
                        .catch((e: any) => ({ success: false, error: e.message }));
                }
                return { success: true, result };
            } catch (e: any) {
                return { success: false, error: e.message };
            }
        }, [params.code]);

        return { success: true, data: result };
    } catch (e: any) {
        return { success: false, error: `Evaluate JS failed: ${e.message}` };
    }
}

// ============================================================
// Tool: Capture Visible Tab
// ============================================================

async function captureVisibleTabTool(params?: CaptureVisibleTabAction): Promise<ToolResult> {
    try {
        const format = params?.format ?? 'png';
        const quality = params?.quality ?? 90;

        const dataUrl = await chrome.tabs.captureVisibleTab(undefined as any, {
            format,
            quality: format === 'jpeg' ? quality : undefined,
        });

        return {
            success: true,
            data: { imageUrl: dataUrl, format, description: 'Captured visible tab screenshot' },
        };
    } catch (e: any) {
        return { success: false, error: `Capture failed: ${e.message}` };
    }
}

// ============================================================
// Tool: Extract Links
// ============================================================

async function extractLinksTool(params?: ExtractLinksAction): Promise<ToolResult> {
    try {
        const tab = await getActiveTab();
        const result = await executeInTab(tab.id!, (filter: string, inclText: boolean, maxRes: number) => {
            const anchors = document.querySelectorAll('a[href]');
            const links: any[] = [];
            let filterRegex: RegExp | null = null;
            if (filter) {
                try { filterRegex = new RegExp(filter, 'i'); }
                catch { filterRegex = new RegExp(filter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'); }
            }
            for (const a of anchors) {
                const href = a.getAttribute('href');
                if (!href || href.startsWith('#') || href.startsWith('javascript:')) continue;
                let fullUrl: string;
                try { fullUrl = new URL(href, window.location.origin).href; } catch { fullUrl = href; }
                if (filterRegex && !filterRegex.test(fullUrl)) continue;
                links.push({
                    url: fullUrl,
                    text: inclText ? ((a as HTMLElement).innerText?.trim() || '').slice(0, 200) : '',
                    isExternal: !fullUrl.startsWith(window.location.origin),
                });
                if (links.length >= maxRes) break;
            }
            return { links, total: anchors.length };
        }, [params?.filter ?? '', params?.includeText ?? true, params?.maxResults ?? 100]);

        return { success: true, data: result };
    } catch (e: any) {
        return { success: false, error: `Extract links failed: ${e.message}` };
    }
}

// ============================================================
// Tool: Get Page Metadata
// ============================================================

async function getPageMetadataTool(): Promise<ToolResult> {
    try {
        const tab = await getActiveTab();
        const result = await executeInTab(tab.id!, () => {
            const getMeta = (name: string) => {
                const el = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
                return el?.getAttribute('content') || undefined;
            };
            return {
                url: window.location.href,
                title: document.title,
                description: getMeta('description'),
                keywords: getMeta('keywords'),
                ogTitle: getMeta('og:title'),
                ogDescription: getMeta('og:description'),
                ogImage: getMeta('og:image'),
                canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') || undefined,
                lang: document.documentElement.lang || undefined,
                favicon: (document.querySelector('link[rel="icon"], link[rel="shortcut icon"]') as HTMLLinkElement)?.href || undefined,
            };
        });

        return { success: true, data: result };
    } catch (e: any) {
        return { success: false, error: `Get metadata failed: ${e.message}` };
    }
}

// ============================================================
// Tool: Highlight Element
// ============================================================

async function highlightElementTool(params: HighlightElementAction): Promise<ToolResult> {
    try {
        const tab = await getActiveTab();
        const result = await executeInTab(tab.id!, (idx: number, sel: string, color: string, duration: number) => {
            let el: Element | null = null;
            if (idx > 0) el = document.querySelector(`[data-ba-idx="${idx}"]`);
            else if (sel) el = document.querySelector(sel);
            if (!el) return { success: false, error: 'Element not found' };
            const rect = el.getBoundingClientRect();
            const hl = document.createElement('div');
            hl.style.cssText = `
        position:fixed; left:${rect.left}px; top:${rect.top}px; width:${rect.width}px; height:${rect.height}px;
        background:${color}; border:2px solid rgba(255,100,0,0.8); border-radius:4px;
        z-index:2147483646; pointer-events:none; transition:opacity 0.3s;
      `;
            document.body.appendChild(hl);
            setTimeout(() => { hl.style.opacity = '0'; setTimeout(() => hl.remove(), 300); }, duration);
            return { success: true };
        }, [params.index ?? 0, params.selector ?? '', params.color ?? 'rgba(255,100,0,0.35)', params.duration ?? 2000]);

        return { success: result.success, data: result };
    } catch (e: any) {
        return { success: false, error: `Highlight failed: ${e.message}` };
    }
}

// ============================================================
// Tool: Fill Form
// ============================================================

async function fillFormTool(params: FillFormAction): Promise<ToolResult> {
    try {
        const tab = await getActiveTab();
        const result = await executeInTab(tab.id!, (fields: Record<string, string>) => {
            const failed: string[] = [];
            let filled = 0;
            for (const [selector, value] of Object.entries(fields)) {
                try {
                    const el = document.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
                    if (!el) { failed.push(`${selector}: not found`); continue; }
                    const tag = el.tagName.toLowerCase();
                    if (tag === 'select') {
                        const s = el as HTMLSelectElement;
                        let f = false;
                        for (const opt of s.options) { if (opt.value === value || opt.text === value) { opt.selected = true; f = true; break; } }
                        if (!f) { failed.push(`${selector}: option not found`); continue; }
                    } else if (tag === 'input' && ((el as HTMLInputElement).type === 'checkbox' || (el as HTMLInputElement).type === 'radio')) {
                        (el as HTMLInputElement).checked = value === 'true' || value === '1';
                    } else {
                        // Use native setter for React compatibility
                        const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
                        const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
                        if (setter) setter.call(el, value); else (el as HTMLInputElement).value = value;
                    }
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                    filled++;
                } catch (e: any) { failed.push(`${selector}: ${e.message}`); }
            }
            return { success: failed.length === 0, filled, failed };
        }, [params.fields]);

        return { success: result.success, data: result };
    } catch (e: any) {
        return { success: false, error: `Fill form failed: ${e.message}` };
    }
}


// ============================================================
// Main Dispatcher
// ============================================================

export async function handleBrowserAgentAction(action: BrowserAgentAction): Promise<ToolResult> {
    console.log(`🤖 Browser Agent: ${action.tool}`, 'params' in action ? (action as any).params : '');

    try {
        switch (action.tool) {
            case 'navigate':
                return await navigateTool(action.params);
            case 'go-back':
                return await goBackTool();
            case 'get-page-text':
                return await getPageTextTool(action.params);
            case 'get-elements':
                return await getElementsTool();
            case 'click-element':
                return await clickElementTool(action.params);
            case 'type-text':
                return await typeTextTool(action.params);
            case 'scroll':
                return await scrollTool(action.params);
            case 'send-keys':
                return await sendKeysTool(action.params);
            case 'wait-for-element':
                return await waitForElementTool(action.params);
            case 'wait-for-navigation':
                return await waitForNavigationTool(action.params);
            case 'search-page':
                return await searchPageTool(action.params);
            case 'find-elements':
                return await findElementsTool(action.params);
            case 'get-dropdown-options':
                return await getDropdownOptionsTool(action.params);
            case 'select-dropdown-option':
                return await selectDropdownOptionTool(action.params);
            case 'evaluate-js':
                return await evaluateJSTool(action.params);
            case 'capture-visible-tab':
                return await captureVisibleTabTool(action.params);
            case 'extract-links':
                return await extractLinksTool(action.params);
            case 'get-page-metadata':
                return await getPageMetadataTool();
            case 'highlight-element':
                return await highlightElementTool(action.params);
            case 'fill-form':
                return await fillFormTool(action.params);
            default:
                return { success: false, error: `Unknown tool: ${(action as any).tool}` };
        }
    } catch (e: any) {
        return { success: false, error: `Browser Agent error: ${e.message}` };
    }
}
