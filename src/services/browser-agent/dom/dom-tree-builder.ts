// Browser Agent - DOM Tree Builder
// Builds an enhanced DOM tree from the live page DOM.
// Adapted from browser-use's service.py:get_dom_tree and _construct_enhanced_node.
// Runs in page context via chrome.scripting.executeScript.

// ============================================================
// DOM Tree Building
// ============================================================

/**
 * Build a complete DOM tree from the page.
 * This is the main DOM analysis function — designed to run in page context.
 *
 * It walks the entire DOM, identifies interactive elements, builds a simplified tree,
 * and serializes it into text format for LLM consumption.
 *
 * Adapted from browser-use's DomService.get_dom_tree + DOMTreeSerializer.
 */
export function buildDOMTree(options: {
    maxDepth?: number;
    includeAttributes?: string[];
    viewportExpansion?: number;
} = {}): {
    url: string;
    title: string;
    domTreeText: string;
    interactiveCount: number;
    scrollInfo: {
        scrollTop: number;
        scrollHeight: number;
        viewportHeight: number;
        pagesAbove: number;
        pagesBelow: number;
    };
} {
    const maxDepth = options.maxDepth ?? 100;
    const viewportExpansion = options.viewportExpansion ?? 1000; // px beyond viewport to include

    // ---- Constants (inlined for page context) ----

    const INTERACTIVE_TAGS_SET = new Set([
        'a', 'button', 'input', 'textarea', 'select',
        'option', 'details', 'summary', 'optgroup',
    ]);

    const INTERACTIVE_ROLES_SET = new Set([
        'button', 'link', 'tab', 'menuitem', 'menuitemcheckbox', 'menuitemradio',
        'option', 'radio', 'switch', 'textbox', 'combobox', 'searchbox',
        'slider', 'spinbutton', 'checkbox', 'listbox', 'treeitem', 'gridcell',
        'row', 'cell', 'search',
    ]);

    const INTERACTIVE_ATTRS_SET = new Set([
        'onclick', 'onmousedown', 'onmouseup', 'onkeydown', 'onkeyup', 'ontouchstart',
        'tabindex', 'ng-click', 'v-on:click', '@click', 'data-action',
        'data-onclick', 'jsaction', '(click)', 'data-ng-click', 'data-ember-action',
    ]);

    const SKIP_TAGS = new Set([
        'script', 'style', 'noscript', 'template',
    ]);

    const SVG_CHILD_TAGS = new Set([
        'path', 'rect', 'g', 'circle', 'ellipse', 'line', 'polyline',
        'polygon', 'use', 'defs', 'clipPath', 'mask', 'pattern', 'image',
        'text', 'tspan',
    ]);

    const INCLUDE_ATTRIBUTES = options.includeAttributes ?? [
        'title', 'type', 'checked', 'id', 'name', 'role', 'value',
        'placeholder', 'alt', 'aria-label', 'aria-expanded', 'aria-checked',
        'aria-selected', 'data-state', 'disabled', 'readonly', 'required',
        'selected', 'href', 'src', 'for', 'action', 'method',
        'pattern', 'min', 'max', 'minlength', 'maxlength', 'step',
        'accept', 'multiple', 'inputmode', 'autocomplete', 'contenteditable',
    ];

    const PROPAGATING_TAGS = new Set(['a', 'button']);

    // ---- Helper functions ----

    function isVisible(el: Element): boolean {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return false;
        try {
            const s = window.getComputedStyle(el);
            if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return false;
        } catch { return true; }
        return true;
    }

    function isInExpandedViewport(el: Element): boolean {
        const rect = el.getBoundingClientRect();
        return (
            rect.bottom > -viewportExpansion &&
            rect.top < window.innerHeight + viewportExpansion &&
            rect.right > -viewportExpansion &&
            rect.left < window.innerWidth + viewportExpansion
        );
    }

    function isInteractive(el: Element): boolean {
        const tag = el.tagName.toLowerCase();
        if (tag === 'html' || tag === 'body') return false;
        if (INTERACTIVE_TAGS_SET.has(tag)) return true;

        // Label wrapping form controls
        if (tag === 'label') {
            if (el.getAttribute('for')) return false;
            if (hasFormControl(el, 2)) return true;
        }
        // Span wrapping form controls
        if (tag === 'span' && hasFormControl(el, 2)) return true;

        // Attribute checks
        for (const attr of el.attributes) {
            if (INTERACTIVE_ATTRS_SET.has(attr.name)) return true;
            if (attr.name.startsWith('on') && attr.name.length > 2) return true;
            if (attr.name.startsWith('@') || attr.name.startsWith('v-on:')) return true;
        }

        const role = el.getAttribute('role');
        if (role && INTERACTIVE_ROLES_SET.has(role)) return true;
        if (el.getAttribute('contenteditable') === 'true') return true;

        const tabindex = el.getAttribute('tabindex');
        if (tabindex !== null && tabindex !== '-1') return true;

        try {
            if (window.getComputedStyle(el).cursor === 'pointer') return true;
        } catch { /* skip */ }

        return false;
    }

    function hasFormControl(el: Element, depth: number): boolean {
        if (depth <= 0) return false;
        for (const child of el.children) {
            const t = child.tagName.toLowerCase();
            if (t === 'input' || t === 'select' || t === 'textarea') return true;
            if (hasFormControl(child, depth - 1)) return true;
        }
        return false;
    }

    function getElText(el: Element): string {
        const tag = el.tagName.toLowerCase();
        if (tag === 'input') {
            const i = el as HTMLInputElement;
            return i.value || i.placeholder || el.getAttribute('aria-label') || i.name || '';
        }
        if (tag === 'textarea') {
            const t = el as HTMLTextAreaElement;
            return t.value || t.placeholder || el.getAttribute('aria-label') || '';
        }
        if (tag === 'select') {
            const s = el as HTMLSelectElement;
            return s.options[s.selectedIndex]?.text || el.getAttribute('aria-label') || '';
        }
        if (tag === 'img') return (el as HTMLImageElement).alt || el.getAttribute('aria-label') || '';

        const direct = Array.from(el.childNodes)
            .filter(n => n.nodeType === Node.TEXT_NODE)
            .map(n => n.textContent?.trim() || '')
            .filter(t => t.length > 0)
            .join(' ');
        if (direct) return direct.slice(0, 150);

        return ((el as HTMLElement).innerText?.trim() || '').slice(0, 150);
    }

    function isScrollable(el: Element): boolean {
        if (el.scrollHeight <= el.clientHeight && el.scrollWidth <= el.clientWidth) return false;
        try {
            const s = window.getComputedStyle(el);
            const vals = [s.overflow, s.overflowX, s.overflowY];
            return vals.some(v => v === 'auto' || v === 'scroll' || v === 'overlay');
        } catch { return false; }
    }

    function buildAttrString(el: Element): string {
        const parts: string[] = [];
        for (const attrName of INCLUDE_ATTRIBUTES) {
            let value: string | null = null;

            // For 'value', get live value from input elements
            if (attrName === 'value') {
                const tag = el.tagName.toLowerCase();
                if (tag === 'input' || tag === 'textarea') {
                    value = (el as HTMLInputElement).value || null;
                } else if (tag === 'select') {
                    value = (el as HTMLSelectElement).value || null;
                } else {
                    value = el.getAttribute(attrName);
                }
            } else if (attrName === 'checked') {
                if ((el as HTMLInputElement).checked) {
                    value = 'true';
                } else {
                    continue;
                }
            } else {
                value = el.getAttribute(attrName);
            }

            if (value !== null && value.trim() !== '') {
                // Cap value length
                const capped = value.length > 100 ? value.slice(0, 100) + '...' : value;
                parts.push(`${attrName}=${capped}`);
            }
        }

        // Remove duplicates (same value with different attribute names)
        const seen = new Map<string, string>();
        const result: string[] = [];
        const protectedAttrs = new Set(['value', 'aria-label', 'placeholder', 'title', 'alt']);

        for (const part of parts) {
            const eqIdx = part.indexOf('=');
            const key = part.slice(0, eqIdx);
            const val = part.slice(eqIdx + 1);
            if (val.length > 5 && seen.has(val) && !protectedAttrs.has(key)) {
                continue;
            }
            seen.set(val, key);
            result.push(part);
        }

        return result.join(' ');
    }

    // ---- Tree walk and serialization ----

    interface NodeInfo {
        el: Element;
        tag: string;
        isInteractive: boolean;
        isVisible: boolean;
        isScrollable: boolean;
        children: NodeInfo[];
        textNodes: string[];
        isSvg: boolean;
    }

    let interactiveIdx = 1;
    const interactiveCount = { value: 0 };

    function walkDOM(node: Node, depth: number): NodeInfo | null {
        if (depth > maxDepth) return null;

        if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as Element;
            const tag = el.tagName.toLowerCase();

            // Skip certain tags entirely
            if (SKIP_TAGS.has(tag)) return null;

            // Check if SVG child (decorative)
            const isSvg = tag === 'svg';
            if (SVG_CHILD_TAGS.has(tag)) return null;

            const vis = isVisible(el);
            const scroll = isScrollable(el);
            const interactive = isInteractive(el);

            // EXCEPTION: file inputs are often hidden but functional
            const isFileInput = tag === 'input' && el.getAttribute('type') === 'file';

            // Skip completely invisible elements (unless file input or has children)
            if (!vis && !scroll && !interactive && !isFileInput) {
                // But still check children — some invisible wrappers have visible content
                const childResults: NodeInfo[] = [];
                for (const child of node.childNodes) {
                    const r = walkDOM(child, depth + 1);
                    if (r) childResults.push(r);
                }
                if (childResults.length === 0) return null;

                // Invisible wrapper — pass children through
                return {
                    el, tag, isInteractive: false, isVisible: false,
                    isScrollable: false, children: childResults, textNodes: [],
                    isSvg: false,
                };
            }

            // Collect text nodes and child elements
            const children: NodeInfo[] = [];
            const textNodes: string[] = [];

            if (!isSvg) {
                for (const child of node.childNodes) {
                    if (child.nodeType === Node.TEXT_NODE) {
                        const text = child.textContent?.trim();
                        if (text && text.length > 0) {
                            textNodes.push(text.slice(0, 200));
                        }
                    } else {
                        const r = walkDOM(child, depth + 1);
                        if (r) children.push(r);
                    }
                }
            }

            // Also check shadow DOM (open only)
            if (el.shadowRoot) {
                for (const child of el.shadowRoot.childNodes) {
                    const r = walkDOM(child, depth + 1);
                    if (r) children.push(r);
                }
            }

            return {
                el, tag, isInteractive: interactive,
                isVisible: vis || isFileInput, isScrollable: scroll,
                children, textNodes, isSvg,
            };
        }

        return null;
    }

    function serializeNode(info: NodeInfo, depth: number): string {
        const lines: string[] = [];
        const indent = '\t'.repeat(depth);

        // Handle SVG — collapsed
        if (info.isSvg) {
            if (info.isInteractive) {
                const idx = interactiveIdx++;
                interactiveCount.value++;
                info.el.setAttribute('data-ba-idx', String(idx));
                const attrStr = buildAttrString(info.el);
                lines.push(`${indent}[${idx}]<svg${attrStr ? ' ' + attrStr : ''} /> <!-- SVG -->`);
            }
            return lines.join('\n');
        }

        // Determine if this node needs to be rendered
        const shouldRender =
            info.isInteractive ||
            info.isScrollable ||
            info.isVisible ||
            info.children.length > 0 ||
            info.textNodes.length > 0;

        if (!shouldRender) return '';

        let nodeRendered = false;

        // Render interactive elements
        if (info.isInteractive && info.isVisible) {
            const idx = interactiveIdx++;
            interactiveCount.value++;
            info.el.setAttribute('data-ba-idx', String(idx));

            const attrStr = buildAttrString(info.el);
            const scrollPrefix = info.isScrollable ? '|scroll|' : '';

            let line = `${indent}${scrollPrefix}[${idx}]<${info.tag}`;
            if (attrStr) line += ` ${attrStr}`;
            line += ' />';

            // Add scroll info
            if (info.isScrollable) {
                const scrollEl = info.el;
                const pagesBelow = scrollEl.clientHeight > 0
                    ? Math.round((scrollEl.scrollHeight - scrollEl.clientHeight - scrollEl.scrollTop) / scrollEl.clientHeight * 10) / 10
                    : 0;
                const pagesAbove = scrollEl.clientHeight > 0
                    ? Math.round(scrollEl.scrollTop / scrollEl.clientHeight * 10) / 10
                    : 0;
                if (pagesBelow > 0 || pagesAbove > 0) {
                    line += ` (scroll: ${pagesAbove}↑ ${pagesBelow}↓)`;
                }
            }

            lines.push(line);
            nodeRendered = true;
        } else if (info.isScrollable && info.isVisible) {
            // Non-interactive scrollable container
            const attrStr = buildAttrString(info.el);
            let line = `${indent}|scroll element|<${info.tag}`;
            if (attrStr) line += ` ${attrStr}`;
            line += ' />';

            const scrollEl = info.el;
            const pagesBelow = scrollEl.clientHeight > 0
                ? Math.round((scrollEl.scrollHeight - scrollEl.clientHeight - scrollEl.scrollTop) / scrollEl.clientHeight * 10) / 10
                : 0;
            const pagesAbove = scrollEl.clientHeight > 0
                ? Math.round(scrollEl.scrollTop / scrollEl.clientHeight * 10) / 10
                : 0;
            if (pagesBelow > 0 || pagesAbove > 0) {
                line += ` (${pagesAbove}↑ ${pagesBelow}↓)`;
            }

            lines.push(line);
            nodeRendered = true;
        }

        // Render text nodes
        for (const text of info.textNodes) {
            if (text.length > 1) {
                const textDepth = nodeRendered ? depth + 1 : depth;
                lines.push(`${'\t'.repeat(textDepth)}${text}`);
            }
        }

        // Render children
        const childDepth = nodeRendered ? depth + 1 : depth;
        for (const child of info.children) {
            const childText = serializeNode(child, childDepth);
            if (childText) lines.push(childText);
        }

        return lines.join('\n');
    }

    // ---- Execute ----

    // Walk the DOM
    const rootInfo = walkDOM(document.body, 0);

    // Scroll info
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight;
    const viewportHeight = window.innerHeight;
    const pagesAbove = viewportHeight > 0 ? Math.round(scrollY / viewportHeight * 10) / 10 : 0;
    const pagesBelow = viewportHeight > 0
        ? Math.round(Math.max(0, scrollHeight - scrollY - viewportHeight) / viewportHeight * 10) / 10
        : 0;

    // Serialize
    let domTreeText = '';
    if (rootInfo) {
        domTreeText = serializeNode(rootInfo, 0);
    }

    return {
        url: window.location.href,
        title: document.title,
        domTreeText,
        interactiveCount: interactiveCount.value,
        scrollInfo: {
            scrollTop: Math.round(scrollY),
            scrollHeight: Math.round(scrollHeight),
            viewportHeight: Math.round(viewportHeight),
            pagesAbove,
            pagesBelow,
        },
    };
}
