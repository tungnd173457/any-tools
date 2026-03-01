// Browser Agent - CSS Selector Generator
// Generate robust CSS selectors and XPaths for DOM elements.
// Adapted from browser-use's utils.py:generate_css_selector_for_element.

// ============================================================
// CSS Selector Generation
// ============================================================

/**
 * Generate a robust CSS selector for an element.
 * Priority: #id > tag.class > tag[attr="val"] > tag path
 *
 * Adapted from browser-use's generate_css_selector_for_element.
 */
export function generateCssSelector(el: Element): string {
    const tagName = el.tagName.toLowerCase();
    if (!tagName || !/^[a-zA-Z][a-zA-Z0-9-]*$/.test(tagName)) {
        return '';
    }

    // 1. ID-based selector (most specific)
    if (el.id) {
        const id = el.id.trim();
        if (/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(id)) {
            return `#${id}`;
        } else {
            // For IDs with special characters, use attribute selector
            const escapedId = id.replace(/"/g, '\\"');
            return `${tagName}[id="${escapedId}"]`;
        }
    }

    let css = tagName;

    // 2. Add class names (filtering out dynamic classes)
    if (el.className && typeof el.className === 'string') {
        const classes = el.className.trim().split(/\s+/);
        const validClassPattern = /^[a-zA-Z_][a-zA-Z0-9_-]*$/;

        // Filter out dynamic/state classes
        const dynamicPatterns = [
            'focus', 'hover', 'active', 'selected', 'disabled',
            'animation', 'transition', 'loading', 'open', 'closed',
            'expanded', 'collapsed', 'visible', 'hidden', 'pressed',
            'checked', 'highlighted', 'current', 'entering', 'leaving',
        ];

        for (const cls of classes) {
            if (!cls.trim()) continue;
            if (!validClassPattern.test(cls)) continue;
            // Skip dynamic classes
            if (dynamicPatterns.some(p => cls.toLowerCase().includes(p))) continue;
            css += `.${cls}`;
        }
    }

    // 3. Add safe attributes
    const SAFE_ATTRIBUTES = new Set([
        'name', 'type', 'placeholder', 'aria-label', 'aria-labelledby',
        'aria-describedby', 'role', 'for', 'autocomplete', 'alt', 'title',
        'href', 'target', 'data-id', 'data-qa', 'data-cy', 'data-testid',
        'data-test', 'data-selenium',
    ]);

    for (const attr of el.attributes) {
        if (attr.name === 'class' || attr.name === 'id') continue;
        if (!SAFE_ATTRIBUTES.has(attr.name)) continue;

        const value = attr.value;
        if (!value) {
            css += `[${attr.name}]`;
        } else if (/["'<>`\n\r\t]/.test(value)) {
            // Use contains for values with special characters
            const safeValue = value
                .split('\n')[0]         // Only first line
                .replace(/\s+/g, ' ')   // Collapse whitespace
                .trim()
                .replace(/"/g, '\\"');   // Escape quotes
            css += `[${attr.name}*="${safeValue}"]`;
        } else {
            css += `[${attr.name}="${value}"]`;
        }
    }

    return css;
}

/**
 * Build a simple CSS path showing element hierarchy (for debugging/display).
 * Existing approach from dom-utils.ts, enhanced.
 */
export function buildCssPath(el: Element): string {
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

// ============================================================
// XPath Generation
// ============================================================

/**
 * Generate an XPath for a DOM element.
 * Adapted from browser-use's EnhancedDOMTreeNode.xpath.
 */
export function generateXPath(el: Element): string {
    const segments: string[] = [];
    let current: Element | null = el;

    while (current && current !== document.documentElement) {
        const tagName = current.tagName.toLowerCase();

        // Get position among siblings with same tag
        const parent: Element | null = current.parentElement;
        if (parent) {
            const siblings = Array.from(parent.children).filter(
                (c: Element) => c.tagName.toLowerCase() === tagName
            );

            if (siblings.length > 1) {
                const position = siblings.indexOf(current) + 1;
                segments.unshift(`${tagName}[${position}]`);
            } else {
                segments.unshift(tagName);
            }
        } else {
            segments.unshift(tagName);
        }

        current = parent;
    }

    return '/' + segments.join('/');
}

/**
 * Try to find a unique, minimal selector for an element.
 * Falls back to increasingly complex selectors until unique.
 */
export function findUniqueSelector(el: Element): string {
    // Try ID first
    if (el.id) {
        const sel = `#${CSS.escape(el.id)}`;
        try {
            if (document.querySelectorAll(sel).length === 1) return sel;
        } catch { /* invalid selector */ }
    }

    // Try generated CSS selector
    const cssSelector = generateCssSelector(el);
    if (cssSelector) {
        try {
            if (document.querySelectorAll(cssSelector).length === 1) return cssSelector;
        } catch { /* invalid selector */ }
    }

    // Try data-ba-idx (our own indexing)
    const baIdx = el.getAttribute('data-ba-idx');
    if (baIdx) return `[data-ba-idx="${baIdx}"]`;

    // Fallback to nth-child path
    return buildNthChildPath(el);
}

/**
 * Build a path using nth-child selectors (guaranteed unique but brittle).
 */
function buildNthChildPath(el: Element): string {
    const parts: string[] = [];
    let current: Element | null = el;

    while (current && current !== document.body) {
        const parent: Element | null = current.parentElement;
        if (parent) {
            const index = Array.from(parent.children).indexOf(current) + 1;
            parts.unshift(`${current.tagName.toLowerCase()}:nth-child(${index})`);
        } else {
            parts.unshift(current.tagName.toLowerCase());
        }
        current = parent;
    }

    return parts.join(' > ');
}
