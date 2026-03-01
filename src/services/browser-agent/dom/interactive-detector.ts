// Browser Agent - Interactive Element Detector
// Determines whether a DOM element is interactive/clickable.
// Adapted from browser-use's clickable_elements.py:ClickableElementDetector.
// Runs in page context via chrome.scripting.executeScript.

// ============================================================
// Interactive Element Detection
// ============================================================

/** Tags that are natively interactive */
const INTERACTIVE_TAGS = new Set([
    'a', 'button', 'input', 'textarea', 'select',
    'option', 'details', 'summary', 'optgroup',
]);

/** ARIA roles that indicate interactivity */
const INTERACTIVE_ROLES = new Set([
    'button', 'link', 'tab', 'menuitem', 'menuitemcheckbox', 'menuitemradio',
    'option', 'radio', 'switch', 'textbox', 'combobox', 'searchbox',
    'slider', 'spinbutton', 'checkbox', 'listbox', 'treeitem', 'gridcell',
    'row', 'cell', 'search',
]);

/** HTML attributes that indicate interactive behavior */
const INTERACTIVE_ATTRS = new Set([
    'onclick', 'onmousedown', 'onmouseup', 'onkeydown', 'onkeyup', 'ontouchstart',
    'tabindex',
    // Framework-specific click handlers
    'ng-click', 'v-on:click', '@click', 'data-action', 'data-onclick', 'jsaction',
    // Angular
    '(click)', 'data-ng-click',
    // Ember
    'data-ember-action',
]);

/** Search-related indicators for detecting search elements */
const SEARCH_INDICATORS = new Set([
    'search', 'magnify', 'glass', 'lookup', 'find', 'query',
    'search-icon', 'search-btn', 'search-button', 'searchbox',
]);

/**
 * Check if a DOM element is interactive/clickable.
 * Comprehensive detection using tags, roles, attributes, and heuristics.
 *
 * Adapted from browser-use's ClickableElementDetector.is_interactive.
 * Removed: CDP-specific checks (has_js_click_listener, ax_node properties, snapshot_node).
 * Added: Better framework attribute detection, CSS cursor check.
 */
export function isInteractiveElement(el: Element): boolean {
    const tag = el.tagName.toLowerCase();

    // Skip html and body
    if (tag === 'html' || tag === 'body') return false;

    // 1. Natively interactive tags
    if (INTERACTIVE_TAGS.has(tag)) return true;

    // 2. Label handling (adapted from browser-use)
    if (tag === 'label') {
        // Skip labels that proxy via "for" (avoid double-clicking)
        if (el.getAttribute('for')) return false;
        // Labels wrapping form controls are interactive
        if (hasFormControlDescendant(el, 2)) return true;
    }

    // 3. Span wrappers for UI components
    if (tag === 'span' && hasFormControlDescendant(el, 2)) {
        return true;
    }

    // 4. Search element detection
    if (isSearchElement(el)) return true;

    // 5. Check interactive attributes (onclick, ng-click, @click, etc.)
    for (const attr of el.attributes) {
        if (INTERACTIVE_ATTRS.has(attr.name)) return true;

        // Also check for framework event bindings in attribute names
        if (attr.name.startsWith('on') && attr.name.length > 2) return true;
        if (attr.name.startsWith('@') || attr.name.startsWith('v-on:')) return true;
    }

    // 6. ARIA role check
    const role = el.getAttribute('role');
    if (role && INTERACTIVE_ROLES.has(role)) return true;

    // 7. Contenteditable
    if (el.getAttribute('contenteditable') === 'true') return true;

    // 8. Positive tabindex (explicitly focusable)
    const tabindex = el.getAttribute('tabindex');
    if (tabindex !== null && tabindex !== '-1') return true;

    // 9. Cursor pointer check (last resort, most expensive)
    try {
        const style = window.getComputedStyle(el);
        if (style.cursor === 'pointer') return true;
    } catch { /* skip */ }

    return false;
}

/**
 * Detect nested form controls within limited depth.
 * Handles label > span > input patterns (e.g., Ant Design radio/checkbox).
 * Adapted from browser-use's ClickableElementDetector.has_form_control_descendant.
 */
function hasFormControlDescendant(el: Element, maxDepth: number = 2): boolean {
    if (maxDepth <= 0) return false;

    for (const child of el.children) {
        const childTag = child.tagName.toLowerCase();

        // Direct form control
        if (childTag === 'input' || childTag === 'select' || childTag === 'textarea') {
            return true;
        }

        // Recurse into children
        if (hasFormControlDescendant(child, maxDepth - 1)) {
            return true;
        }
    }

    return false;
}

/**
 * Check if element looks like a search component.
 * Adapted from browser-use's search element detection logic.
 */
function isSearchElement(el: Element): boolean {
    // Check class names
    const classStr = el.getAttribute('class') || '';
    const classes = classStr.toLowerCase().split(/\s+/);
    for (const indicator of SEARCH_INDICATORS) {
        if (classes.some(c => c.includes(indicator))) return true;
    }

    // Check id
    const id = (el.id || '').toLowerCase();
    for (const indicator of SEARCH_INDICATORS) {
        if (id.includes(indicator)) return true;
    }

    // Check data attributes
    for (const attr of el.attributes) {
        if (attr.name.startsWith('data-') && attr.value) {
            const val = attr.value.toLowerCase();
            for (const indicator of SEARCH_INDICATORS) {
                if (val.includes(indicator)) return true;
            }
        }
    }

    return false;
}

/**
 * Get the meaningful text content of an element for display.
 * Prioritizes input values, labels, and direct text content.
 */
export function getElementText(el: Element): string {
    const tag = el.tagName.toLowerCase();

    // Input elements: use value/placeholder/aria-label
    if (tag === 'input') {
        const input = el as HTMLInputElement;
        return input.value || input.placeholder || el.getAttribute('aria-label') || input.name || '';
    }
    if (tag === 'textarea') {
        const textarea = el as HTMLTextAreaElement;
        return textarea.value || textarea.placeholder || el.getAttribute('aria-label') || '';
    }
    if (tag === 'select') {
        const select = el as HTMLSelectElement;
        const selectedText = select.options[select.selectedIndex]?.text;
        return selectedText || el.getAttribute('aria-label') || '';
    }
    if (tag === 'img') {
        return (el as HTMLImageElement).alt || el.getAttribute('aria-label') || '';
    }

    // For other elements: try direct text content first
    const directText = Array.from(el.childNodes)
        .filter(n => n.nodeType === Node.TEXT_NODE)
        .map(n => n.textContent?.trim() || '')
        .filter(t => t.length > 0)
        .join(' ');

    if (directText) return directText.slice(0, 200);

    // Fallback to innerText (limited)
    const innerText = (el as HTMLElement).innerText?.trim() || '';
    return innerText.slice(0, 200);
}

/**
 * Check if element is a form element that should always be kept during filtering.
 * These need individual interaction and shouldn't be excluded by parent bounds.
 */
export function isFormElement(el: Element): boolean {
    const tag = el.tagName.toLowerCase();
    return tag === 'input' || tag === 'select' || tag === 'textarea' || tag === 'label';
}

// ============================================================
// Pagination Detection
// ============================================================

/** Pagination button patterns for next/prev/first/last detection */
const NEXT_PATTERNS = ['next', '>', '»', '→', 'siguiente', 'suivant', 'weiter', 'volgende', 'tiếp'];
const PREV_PATTERNS = ['prev', 'previous', '<', '«', '←', 'anterior', 'précédent', 'zurück', 'vorige', 'trước'];
const FIRST_PATTERNS = ['first', '⇤', '«', 'primera', 'première', 'erste', 'eerste', 'đầu'];
const LAST_PATTERNS = ['last', '⇥', '»', 'última', 'dernier', 'letzte', 'laatste', 'cuối'];

/**
 * Detected pagination button info.
 */
export interface PaginationButton {
    /** Type of pagination button */
    buttonType: 'next' | 'prev' | 'first' | 'last' | 'page_number';
    /** Index from data-ba-idx (for clicking) */
    index: number;
    /** Button text/label */
    text: string;
    /** CSS selector */
    selector: string;
    /** Whether button appears disabled */
    isDisabled: boolean;
}

/**
 * Detect pagination buttons on the page.
 * Adapted from browser-use's DomService.detect_pagination_buttons.
 *
 * Scans indexed interactive elements for common pagination patterns:
 * - "Next" / "Previous" buttons (multilingual)
 * - "First" / "Last" buttons
 * - Numeric page buttons (1, 2, 3...)
 *
 * @returns Array of detected pagination button info
 */
export function detectPaginationButtons(): PaginationButton[] {
    const buttons: PaginationButton[] = [];

    // Find all indexed interactive elements
    const indexedElements = document.querySelectorAll('[data-ba-idx]');

    for (const el of indexedElements) {
        const tag = el.tagName.toLowerCase();
        const idx = parseInt(el.getAttribute('data-ba-idx') || '0', 10);
        if (idx <= 0) continue;

        // Only consider likely clickable elements
        if (!['a', 'button', 'li', 'span', 'div', 'input'].includes(tag)) continue;

        // Gather text from various sources
        const innerText = ((el as HTMLElement).innerText?.trim() || '').toLowerCase();
        const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
        const title = (el.getAttribute('title') || '').toLowerCase();
        const className = (el.getAttribute('class') || '').toLowerCase();
        const role = (el.getAttribute('role') || '').toLowerCase();

        // Combine all text for pattern matching
        const allText = `${innerText} ${ariaLabel} ${title} ${className}`.trim();

        if (!allText) continue;

        // Check disabled state
        const isDisabled = (
            el.getAttribute('disabled') !== null ||
            el.getAttribute('aria-disabled') === 'true' ||
            className.includes('disabled') ||
            el.classList.contains('disabled')
        );

        // Determine button type
        let buttonType: PaginationButton['buttonType'] | null = null;

        if (NEXT_PATTERNS.some(p => allText.includes(p))) {
            buttonType = 'next';
        } else if (PREV_PATTERNS.some(p => allText.includes(p))) {
            buttonType = 'prev';
        } else if (FIRST_PATTERNS.some(p => allText.includes(p))) {
            buttonType = 'first';
        } else if (LAST_PATTERNS.some(p => allText.includes(p))) {
            buttonType = 'last';
        } else if (
            // Numeric page buttons: single or double digit
            /^\d{1,2}$/.test(innerText) &&
            (role === 'button' || role === 'link' || role === '' || tag === 'a' || tag === 'button')
        ) {
            buttonType = 'page_number';
        }

        if (buttonType) {
            // Build a simple selector
            let selector = `[data-ba-idx="${idx}"]`;
            if (el.id) {
                selector = `#${el.id}`;
            }

            buttons.push({
                buttonType,
                index: idx,
                text: (el as HTMLElement).innerText?.trim() || ariaLabel || title || '',
                selector,
                isDisabled,
            });
        }
    }

    return buttons;
}
