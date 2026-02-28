// Browser Agent - DOM Utilities
// These functions are injected into the target page context via chrome.scripting.executeScript

// ============================================================
// Element Discovery & Indexing
// ============================================================

/**
 * Build a CSS path for an element (for debugging / display).
 */
function buildCssPath(el: Element): string {
    const parts: string[] = [];
    let current: Element | null = el;
    while (current && current !== document.body && current !== document.documentElement) {
        let desc = current.tagName.toLowerCase();
        if (current.id) {
            desc += `#${current.id}`;
        } else if (current.className && typeof current.className === 'string') {
            const classes = current.className.trim().split(/\s+/).slice(0, 2).join('.');
            if (classes) desc += `.${classes}`;
        }
        parts.unshift(desc);
        current = current.parentElement;
    }
    return parts.join(' > ');
}

/**
 * Check if an element is visible in the viewport.
 */
function isElementVisible(el: Element): boolean {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
    return true;
}

/**
 * Check if the element is interactive (clickable, typeable, etc.)
 */
function isInteractive(el: Element): boolean {
    const tag = el.tagName.toLowerCase();

    // Directly interactive tags
    const interactiveTags = ['a', 'button', 'input', 'textarea', 'select', 'option', 'details', 'summary'];
    if (interactiveTags.includes(tag)) return true;

    // Has click handler or role
    const role = el.getAttribute('role');
    const interactiveRoles = ['button', 'link', 'tab', 'menuitem', 'menuitemcheckbox', 'menuitemradio',
        'option', 'radio', 'switch', 'textbox', 'combobox', 'searchbox', 'slider', 'spinbutton',
        'checkbox', 'listbox', 'treeitem', 'gridcell'];
    if (role && interactiveRoles.includes(role)) return true;

    // Has tabindex (explicitly focusable)
    if (el.hasAttribute('tabindex') && el.getAttribute('tabindex') !== '-1') return true;

    // Content editable
    if (el.getAttribute('contenteditable') === 'true') return true;

    // Has onclick attribute
    if (el.hasAttribute('onclick') || el.hasAttribute('ng-click') || el.hasAttribute('@click') || el.hasAttribute('data-action')) return true;

    // Cursor pointer indicates clickable
    const style = window.getComputedStyle(el);
    if (style.cursor === 'pointer') return true;

    return false;
}

/**
 * Get the visible text of an element, cleaned up.
 */
function getElementText(el: Element): string {
    // For inputs, use various attributes
    const tag = el.tagName.toLowerCase();
    if (tag === 'input') {
        const input = el as HTMLInputElement;
        return input.value || input.placeholder || input.getAttribute('aria-label') || input.name || '';
    }
    if (tag === 'textarea') {
        const textarea = el as HTMLTextAreaElement;
        return textarea.value || textarea.placeholder || textarea.getAttribute('aria-label') || '';
    }
    if (tag === 'select') {
        const select = el as HTMLSelectElement;
        return select.options[select.selectedIndex]?.text || select.getAttribute('aria-label') || '';
    }
    if (tag === 'img') {
        return (el as HTMLImageElement).alt || el.getAttribute('aria-label') || '';
    }

    // For other elements, get direct text content (not deeply nested)
    const directText = Array.from(el.childNodes)
        .filter(n => n.nodeType === Node.TEXT_NODE)
        .map(n => n.textContent?.trim() || '')
        .join(' ');

    if (directText) return directText.slice(0, 200);

    // Fallback to innerText but limited
    const text = (el as HTMLElement).innerText?.trim() || '';
    return text.slice(0, 200);
}

// ============================================================
// Exported functions (called via executeScript)
// ============================================================

/**
 * Get all interactive elements on the page, indexed for agent use.
 */
export function getInteractiveElements(): {
    url: string;
    title: string;
    elements: any[];
    totalElements: number;
    scrollHeight: number;
    scrollTop: number;
    viewportHeight: number;
} {
    const allElements = document.querySelectorAll('*');
    const interactiveElements: any[] = [];
    let idx = 1; // 1-indexed

    for (const el of allElements) {
        if (!isInteractive(el)) continue;

        const visible = isElementVisible(el);
        const rect = el.getBoundingClientRect();
        const tag = el.tagName.toLowerCase();

        const elementInfo: any = {
            index: idx,
            tag,
            text: getElementText(el),
            isVisible: visible,
            rect: {
                x: Math.round(rect.x),
                y: Math.round(rect.y),
                width: Math.round(rect.width),
                height: Math.round(rect.height),
            },
            tagPath: buildCssPath(el),
        };

        // Additional attributes
        const type = el.getAttribute('type');
        if (type) elementInfo.type = type;

        const role = el.getAttribute('role');
        if (role) elementInfo.role = role;

        const placeholder = el.getAttribute('placeholder');
        if (placeholder) elementInfo.placeholder = placeholder;

        const name = el.getAttribute('name');
        if (name) elementInfo.name = name;

        const id = el.id;
        if (id) elementInfo.id = id;

        const href = el.getAttribute('href');
        if (href) elementInfo.href = href;

        const ariaLabel = el.getAttribute('aria-label');
        if (ariaLabel) elementInfo.ariaLabel = ariaLabel;

        if (tag === 'input') {
            const input = el as HTMLInputElement;
            if (input.type === 'checkbox' || input.type === 'radio') {
                elementInfo.checked = input.checked;
            }
            if (input.value) elementInfo.value = input.value;
        }

        if ((el as HTMLInputElement).disabled) elementInfo.disabled = true;

        // Store reference for clicking (via data attribute)
        el.setAttribute('data-ba-idx', String(idx));

        interactiveElements.push(elementInfo);
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
}

/**
 * Click an element by its browser-agent index.
 */
export function clickElementByIndex(index: number): { success: boolean; error?: string; description?: string } {
    try {
        const el = document.querySelector(`[data-ba-idx="${index}"]`) as HTMLElement;
        if (!el) {
            return { success: false, error: `Element with index ${index} not found. The page may have changed - try refreshing elements.` };
        }

        // Scroll into view if needed
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Small delay to let scroll settle, then click
        setTimeout(() => {
            el.focus();
            el.click();

            // Also dispatch mouse events for frameworks that rely on them
            el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
            el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
            el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        }, 100);

        const desc = `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}`;
        return { success: true, description: `Clicked ${desc}: "${getElementText(el).slice(0, 50)}"` };
    } catch (e: any) {
        return { success: false, error: `Failed to click element ${index}: ${e.message}` };
    }
}

/**
 * Click an element at specific viewport coordinates.
 */
export function clickAtCoordinates(x: number, y: number): { success: boolean; error?: string; description?: string } {
    try {
        const el = document.elementFromPoint(x, y) as HTMLElement;
        if (!el) {
            return { success: false, error: `No element found at coordinates (${x}, ${y})` };
        }

        el.focus();
        el.click();
        el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: x, clientY: y }));
        el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, clientX: x, clientY: y }));
        el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: x, clientY: y }));

        const desc = `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}`;
        return { success: true, description: `Clicked at (${x}, ${y}) on ${desc}` };
    } catch (e: any) {
        return { success: false, error: `Failed to click at (${x}, ${y}): ${e.message}` };
    }
}

/**
 * Type text into an element by index.
 */
export function typeTextByIndex(
    index: number,
    text: string,
    clear: boolean = true,
    pressEnter: boolean = false
): { success: boolean; error?: string; description?: string } {
    try {
        let el: HTMLElement | null;

        if (index <= 0) {
            // Index 0 or negative: type into currently focused element
            el = document.activeElement as HTMLElement;
            if (!el || el === document.body) {
                return { success: false, error: 'No element is currently focused. Use an index to specify which element to type into.' };
            }
        } else {
            el = document.querySelector(`[data-ba-idx="${index}"]`) as HTMLElement;
        }

        if (!el) {
            return { success: false, error: `Element with index ${index} not found.` };
        }

        // Focus the element
        el.focus();
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });

        const isInput = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;

        if (isInput) {
            const inputEl = el as HTMLInputElement | HTMLTextAreaElement;

            if (clear) {
                inputEl.value = '';
                inputEl.dispatchEvent(new Event('input', { bubbles: true }));
                inputEl.dispatchEvent(new Event('change', { bubbles: true }));
            }

            // Set value directly
            inputEl.value = clear ? text : inputEl.value + text;

            // Dispatch all relevant events for framework compatibility
            inputEl.dispatchEvent(new Event('input', { bubbles: true }));
            inputEl.dispatchEvent(new Event('change', { bubbles: true }));

            // Also simulate keypress events for each character
            for (const char of text) {
                inputEl.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }));
                inputEl.dispatchEvent(new KeyboardEvent('keypress', { key: char, bubbles: true }));
                inputEl.dispatchEvent(new KeyboardEvent('keyup', { key: char, bubbles: true }));
            }
        } else if (el.getAttribute('contenteditable') === 'true') {
            // Content editable
            if (clear) {
                el.textContent = '';
            }
            el.textContent = (el.textContent || '') + text;
            el.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
            return { success: false, error: `Element at index ${index} is not a text input (tag: ${el.tagName.toLowerCase()})` };
        }

        // Press Enter if requested
        if (pressEnter) {
            el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
            el.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
            el.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
            if (isInput) {
                // Submit form if present
                const form = el.closest('form');
                if (form) form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
            }
        }

        return { success: true, description: `Typed "${text.slice(0, 50)}${text.length > 50 ? '...' : ''}" into element ${index}` };
    } catch (e: any) {
        return { success: false, error: `Failed to type text: ${e.message}` };
    }
}

/**
 * Get page text content as clean text.
 */
export function getPageText(includeLinks: boolean = false, maxLength: number = 100000): {
    url: string;
    title: string;
    text: string;
    length: number;
} {
    // Build clean text from the page, similar to markdown extraction
    function extractText(node: Node, depth: number = 0): string {
        if (depth > 50) return ''; // Prevent infinite recursion

        const parts: string[] = [];

        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent?.trim();
            if (text) parts.push(text);
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as Element;
            const tag = el.tagName.toLowerCase();

            // Skip invisible elements, scripts, styles
            const skipTags = ['script', 'style', 'noscript', 'svg', 'path', 'meta', 'link', 'head'];
            if (skipTags.includes(tag)) return '';

            const style = window.getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden') return '';

            // Headers
            if (/^h[1-6]$/.test(tag)) {
                const level = parseInt(tag[1]);
                const headerText = (el as HTMLElement).innerText?.trim();
                if (headerText) parts.push('\n' + '#'.repeat(level) + ' ' + headerText + '\n');
                return parts.join('');
            }

            // Links
            if (tag === 'a' && includeLinks) {
                const href = el.getAttribute('href');
                const linkText = (el as HTMLElement).innerText?.trim();
                if (linkText && href) {
                    parts.push(`[${linkText}](${href})`);
                    return parts.join('');
                }
            }

            // List items
            if (tag === 'li') {
                const liText = (el as HTMLElement).innerText?.trim();
                if (liText) parts.push('- ' + liText);
                return parts.join('');
            }

            // Block elements get newlines
            const blockTags = ['div', 'p', 'section', 'article', 'main', 'aside', 'header', 'footer', 'nav',
                'ul', 'ol', 'table', 'tr', 'blockquote', 'pre', 'hr', 'br', 'form', 'fieldset'];

            const isBlock = blockTags.includes(tag);

            if (isBlock && tag === 'br') {
                parts.push('\n');
                return parts.join('');
            }

            if (isBlock && tag === 'hr') {
                parts.push('\n---\n');
                return parts.join('');
            }

            // Recurse into children
            for (const child of node.childNodes) {
                const childText = extractText(child, depth + 1);
                if (childText) parts.push(childText);
            }

            if (isBlock && parts.length > 0) {
                return '\n' + parts.join(' ') + '\n';
            }
        }

        return parts.join(' ');
    }

    let text = extractText(document.body);

    // Clean up whitespace
    text = text.replace(/\n{3,}/g, '\n\n').trim();

    if (text.length > maxLength) {
        text = text.slice(0, maxLength) + '\n\n[...truncated]';
    }

    return {
        url: window.location.href,
        title: document.title,
        text,
        length: text.length,
    };
}

/**
 * Scroll the page in a direction.
 */
export function scrollPage(
    direction: 'up' | 'down' | 'left' | 'right',
    amount?: number,
    index?: number,
    selector?: string
): { success: boolean; scrollTop: number; scrollHeight: number; viewportHeight: number; description?: string } {
    try {
        let target: Element = document.documentElement;

        if (index && index > 0) {
            const el = document.querySelector(`[data-ba-idx="${index}"]`);
            if (el) target = el;
        } else if (selector) {
            const el = document.querySelector(selector);
            if (el) target = el;
        }

        const vh = window.innerHeight;
        const pixels = amount || vh;

        const scrollOptions: ScrollToOptions = { behavior: 'smooth' };

        switch (direction) {
            case 'down':
                scrollOptions.top = (target === document.documentElement ? window.scrollY : target.scrollTop) + pixels;
                break;
            case 'up':
                scrollOptions.top = (target === document.documentElement ? window.scrollY : target.scrollTop) - pixels;
                break;
            case 'right':
                scrollOptions.left = (target === document.documentElement ? window.scrollX : target.scrollLeft) + pixels;
                break;
            case 'left':
                scrollOptions.left = (target === document.documentElement ? window.scrollX : target.scrollLeft) - pixels;
                break;
        }

        if (target === document.documentElement) {
            window.scrollTo(scrollOptions);
        } else {
            target.scrollTo(scrollOptions);
        }

        return {
            success: true,
            scrollTop: window.scrollY || document.documentElement.scrollTop,
            scrollHeight: document.documentElement.scrollHeight,
            viewportHeight: vh,
            description: `Scrolled ${direction} by ${pixels}px`,
        };
    } catch (e: any) {
        return {
            success: false,
            scrollTop: 0,
            scrollHeight: 0,
            viewportHeight: 0,
            description: `Failed to scroll: ${e.message}`,
        };
    }
}

/**
 * Send keyboard shortcuts.
 */
export function sendKeyboardEvent(keys: string): { success: boolean; description?: string; error?: string } {
    try {
        const target = document.activeElement || document.body;

        // Parse key combo: "Control+a", "Shift+Enter", "Escape"
        const parts = keys.split('+');
        const key = parts[parts.length - 1];
        const ctrlKey = parts.includes('Control') || parts.includes('Ctrl');
        const shiftKey = parts.includes('Shift');
        const altKey = parts.includes('Alt');
        const metaKey = parts.includes('Meta') || parts.includes('Command');

        // Map common key names
        const keyMap: Record<string, { key: string; code: string; keyCode: number }> = {
            'Enter': { key: 'Enter', code: 'Enter', keyCode: 13 },
            'Escape': { key: 'Escape', code: 'Escape', keyCode: 27 },
            'Tab': { key: 'Tab', code: 'Tab', keyCode: 9 },
            'Backspace': { key: 'Backspace', code: 'Backspace', keyCode: 8 },
            'Delete': { key: 'Delete', code: 'Delete', keyCode: 46 },
            'ArrowUp': { key: 'ArrowUp', code: 'ArrowUp', keyCode: 38 },
            'ArrowDown': { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40 },
            'ArrowLeft': { key: 'ArrowLeft', code: 'ArrowLeft', keyCode: 37 },
            'ArrowRight': { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39 },
            'Home': { key: 'Home', code: 'Home', keyCode: 36 },
            'End': { key: 'End', code: 'End', keyCode: 35 },
            'PageUp': { key: 'PageUp', code: 'PageUp', keyCode: 33 },
            'PageDown': { key: 'PageDown', code: 'PageDown', keyCode: 34 },
            'Space': { key: ' ', code: 'Space', keyCode: 32 },
        };

        const keyInfo = keyMap[key] || { key, code: `Key${key.toUpperCase()}`, keyCode: key.charCodeAt(0) };

        const eventInit: KeyboardEventInit = {
            key: keyInfo.key,
            code: keyInfo.code,
            keyCode: keyInfo.keyCode,
            ctrlKey,
            shiftKey,
            altKey,
            metaKey,
            bubbles: true,
            cancelable: true,
        };

        target.dispatchEvent(new KeyboardEvent('keydown', eventInit));
        target.dispatchEvent(new KeyboardEvent('keypress', eventInit));
        target.dispatchEvent(new KeyboardEvent('keyup', eventInit));

        return { success: true, description: `Sent keys: ${keys}` };
    } catch (e: any) {
        return { success: false, error: `Failed to send keys "${keys}": ${e.message}` };
    }
}

/**
 * Wait for an element matching a CSS selector to appear.
 */
export function waitForElement(
    selector: string,
    timeout: number = 5000,
    visible: boolean = true
): Promise<{ success: boolean; found: boolean; error?: string }> {
    return new Promise((resolve) => {
        const startTime = Date.now();

        function check() {
            const el = document.querySelector(selector);
            if (el) {
                if (!visible || isElementVisible(el)) {
                    resolve({ success: true, found: true });
                    return;
                }
            }

            if (Date.now() - startTime >= timeout) {
                resolve({ success: true, found: false, error: `Element "${selector}" not found within ${timeout}ms` });
                return;
            }

            requestAnimationFrame(check);
        }

        check();
    });
}

/**
 * Search page text for a pattern (like grep).
 */
export function searchPageText(
    pattern: string,
    regex: boolean = false,
    caseSensitive: boolean = false,
    contextChars: number = 150,
    cssScope: string | null = null,
    maxResults: number = 25
): SearchResult {
    try {
        const scope = cssScope ? document.querySelector(cssScope) : document.body;
        if (!scope) {
            return { matches: [], total: 0, hasMore: false };
        }

        // Collect all text
        const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
        let fullText = '';
        const nodeOffsets: { offset: number; length: number; node: Node }[] = [];

        while (walker.nextNode()) {
            const node = walker.currentNode;
            const text = node.textContent;
            if (text && text.trim()) {
                nodeOffsets.push({ offset: fullText.length, length: text.length, node });
                fullText += text;
            }
        }

        // Build regex
        let re: RegExp;
        const flags = caseSensitive ? 'g' : 'gi';
        if (regex) {
            re = new RegExp(pattern, flags);
        } else {
            re = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
        }

        // Find matches
        const matches: SearchMatch[] = [];
        let match: RegExpExecArray | null;
        let totalFound = 0;

        while ((match = re.exec(fullText)) !== null) {
            totalFound++;

            if (matches.length < maxResults) {
                const start = Math.max(0, match.index - contextChars);
                const end = Math.min(fullText.length, match.index + match[0].length + contextChars);
                const context = fullText.slice(start, end);

                // Find element path
                let elementPath = '';
                for (const no of nodeOffsets) {
                    if (no.offset <= match.index && no.offset + no.length > match.index) {
                        elementPath = buildCssPath(no.node.parentElement!);
                        break;
                    }
                }

                matches.push({
                    matchText: match[0],
                    context: (start > 0 ? '...' : '') + context + (end < fullText.length ? '...' : ''),
                    elementPath,
                    charPosition: match.index,
                });
            }

            if (match[0].length === 0) re.lastIndex++;
        }

        return { matches, total: totalFound, hasMore: totalFound > maxResults };
    } catch (e: any) {
        return { matches: [], total: 0, hasMore: false };
    }
}

/**
 * Query DOM elements by CSS selector.
 */
export function findElementsBySelector(
    selector: string,
    attributes: string[] | null = null,
    maxResults: number = 50,
    includeText: boolean = true
): FindResult {
    try {
        const elements = document.querySelectorAll(selector);
        const total = elements.length;
        const limit = Math.min(total, maxResults);
        const results: FoundElement[] = [];

        for (let i = 0; i < limit; i++) {
            const el = elements[i];
            const item: FoundElement = {
                index: i,
                tag: el.tagName.toLowerCase(),
                childrenCount: el.children.length,
            };

            if (includeText) {
                const text = (el as HTMLElement).textContent?.trim() || '';
                item.text = text.length > 300 ? text.slice(0, 300) + '...' : text;
            }

            if (attributes && attributes.length > 0) {
                item.attrs = {};
                for (const attr of attributes) {
                    const val = el.getAttribute(attr);
                    if (val !== null) {
                        item.attrs[attr] = val.length > 500 ? val.slice(0, 500) + '...' : val;
                    }
                }
            }

            results.push(item);
        }

        return { elements: results, total, showing: limit };
    } catch (e: any) {
        return { elements: [], total: 0, showing: 0 };
    }
}

/**
 * Get all options from a <select> dropdown.
 */
export function getDropdownOptions(index?: number, selector?: string): {
    success: boolean;
    options?: DropdownOption[];
    error?: string;
} {
    try {
        let el: Element | null = null;

        if (index && index > 0) {
            el = document.querySelector(`[data-ba-idx="${index}"]`);
        } else if (selector) {
            el = document.querySelector(selector);
        }

        if (!el || el.tagName.toLowerCase() !== 'select') {
            return { success: false, error: 'Element is not a <select> dropdown' };
        }

        const selectEl = el as HTMLSelectElement;
        const options: DropdownOption[] = Array.from(selectEl.options).map(opt => ({
            value: opt.value,
            text: opt.text,
            selected: opt.selected,
            disabled: opt.disabled,
        }));

        return { success: true, options };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/**
 * Select an option in a <select> dropdown.
 */
export function selectDropdownOption(
    index: number | undefined,
    selector: string | undefined,
    value: string | undefined,
    text: string | undefined
): { success: boolean; error?: string; description?: string } {
    try {
        let el: Element | null = null;

        if (index && index > 0) {
            el = document.querySelector(`[data-ba-idx="${index}"]`);
        } else if (selector) {
            el = document.querySelector(selector);
        }

        if (!el || el.tagName.toLowerCase() !== 'select') {
            return { success: false, error: 'Element is not a <select> dropdown' };
        }

        const selectEl = el as HTMLSelectElement;

        // Find option by value or text
        let found = false;
        for (const opt of selectEl.options) {
            if ((value !== undefined && opt.value === value) || (text !== undefined && opt.text === text)) {
                opt.selected = true;
                found = true;
                break;
            }
        }

        if (!found) {
            return { success: false, error: `Option with ${value ? 'value="' + value + '"' : 'text="' + text + '"'} not found` };
        }

        selectEl.dispatchEvent(new Event('change', { bubbles: true }));
        selectEl.dispatchEvent(new Event('input', { bubbles: true }));

        return { success: true, description: `Selected option: ${text || value}` };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/**
 * Extract all links from the page.
 */
export function extractLinks(
    filter?: string,
    includeText: boolean = true,
    maxResults: number = 100
): { links: LinkInfo[]; total: number } {
    const anchors = document.querySelectorAll('a[href]');
    const links: LinkInfo[] = [];
    let filterRegex: RegExp | null = null;

    if (filter) {
        try {
            filterRegex = new RegExp(filter, 'i');
        } catch {
            filterRegex = new RegExp(filter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        }
    }

    for (const a of anchors) {
        const href = a.getAttribute('href');
        if (!href || href.startsWith('#') || href.startsWith('javascript:')) continue;

        let fullUrl: string;
        try {
            fullUrl = new URL(href, window.location.origin).href;
        } catch {
            fullUrl = href;
        }

        if (filterRegex && !filterRegex.test(fullUrl)) continue;

        const isExternal = !fullUrl.startsWith(window.location.origin);

        links.push({
            url: fullUrl,
            text: includeText ? ((a as HTMLElement).innerText?.trim() || '').slice(0, 200) : '',
            isExternal,
        });

        if (links.length >= maxResults) break;
    }

    return { links, total: anchors.length };
}

/**
 * Get page metadata (title, description, OG tags, etc.).
 */
export function getPageMetadata(): PageMetadata {
    const getMeta = (name: string): string | undefined => {
        const el = document.querySelector(
            `meta[name="${name}"], meta[property="${name}"], meta[name="${name.toLowerCase()}"]`
        );
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
}

/**
 * Highlight an element visually.
 */
export function highlightElement(
    index: number | undefined,
    selector: string | undefined,
    color: string = 'rgba(255, 100, 0, 0.35)',
    duration: number = 2000
): { success: boolean; error?: string } {
    try {
        let el: Element | null = null;

        if (index && index > 0) {
            el = document.querySelector(`[data-ba-idx="${index}"]`);
        } else if (selector) {
            el = document.querySelector(selector);
        }

        if (!el) {
            return { success: false, error: 'Element not found' };
        }

        const rect = el.getBoundingClientRect();
        const highlight = document.createElement('div');
        highlight.style.cssText = `
      position: fixed;
      left: ${rect.left}px;
      top: ${rect.top}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      background: ${color};
      border: 2px solid rgba(255, 100, 0, 0.8);
      border-radius: 4px;
      z-index: 2147483646;
      pointer-events: none;
      transition: opacity 0.3s ease;
    `;

        document.body.appendChild(highlight);

        setTimeout(() => {
            highlight.style.opacity = '0';
            setTimeout(() => highlight.remove(), 300);
        }, duration);

        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/**
 * Fill multiple form fields at once.
 */
export function fillFormFields(fields: Record<string, string>): {
    success: boolean;
    filled: number;
    failed: string[];
} {
    const failed: string[] = [];
    let filled = 0;

    for (const [selector, value] of Object.entries(fields)) {
        try {
            const el = document.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
            if (!el) {
                failed.push(`${selector}: not found`);
                continue;
            }

            const tag = el.tagName.toLowerCase();

            if (tag === 'select') {
                // Find matching option
                const selectEl = el as HTMLSelectElement;
                let optFound = false;
                for (const opt of selectEl.options) {
                    if (opt.value === value || opt.text === value) {
                        opt.selected = true;
                        optFound = true;
                        break;
                    }
                }
                if (!optFound) {
                    failed.push(`${selector}: option "${value}" not found`);
                    continue;
                }
            } else if (tag === 'input' && ((el as HTMLInputElement).type === 'checkbox' || (el as HTMLInputElement).type === 'radio')) {
                (el as HTMLInputElement).checked = value === 'true' || value === '1';
            } else {
                (el as HTMLInputElement).value = value;
            }

            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            filled++;
        } catch (e: any) {
            failed.push(`${selector}: ${e.message}`);
        }
    }

    return { success: failed.length === 0, filled, failed };
}

// Type imports used in return types
interface SearchMatch {
    matchText: string;
    context: string;
    elementPath: string;
    charPosition: number;
}

interface SearchResult {
    matches: SearchMatch[];
    total: number;
    hasMore: boolean;
}

interface FoundElement {
    index: number;
    tag: string;
    text?: string;
    attrs?: Record<string, string>;
    childrenCount: number;
}

interface FindResult {
    elements: FoundElement[];
    total: number;
    showing: number;
}

interface LinkInfo {
    url: string;
    text: string;
    isExternal: boolean;
}

interface PageMetadata {
    url: string;
    title: string;
    description?: string;
    keywords?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    canonical?: string;
    lang?: string;
    favicon?: string;
}

interface DropdownOption {
    value: string;
    text: string;
    selected: boolean;
    disabled: boolean;
}
