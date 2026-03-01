// Browser Agent - DOM Module Types
// Data models for DOM analysis, adapted from browser-use's views.py
// These types are used in both background script and page context.

// ============================================================
// Core Data Types
// ============================================================

/**
 * Bounding rectangle of a DOM element.
 * Equivalent to browser-use's DOMRect.
 */
export interface DOMRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

/**
 * DOM Node types (matches DOM specification).
 * Equivalent to browser-use's NodeType enum.
 */
export const enum NodeType {
    ELEMENT_NODE = 1,
    TEXT_NODE = 3,
    COMMENT_NODE = 8,
    DOCUMENT_NODE = 9,
    DOCUMENT_TYPE_NODE = 10,
    DOCUMENT_FRAGMENT_NODE = 11,
}

// ============================================================
// DOM Tree Node
// ============================================================

/**
 * Enhanced DOM tree node — adapted from browser-use's EnhancedDOMTreeNode.
 * Stripped of CDP-specific fields (AX tree, DOMSnapshot, backend_node_id).
 * All data is obtained from live DOM APIs.
 */
export interface DOMNode {
    /** Internal index for this node (1-based, used for agent interaction) */
    index: number;

    /** DOM node type */
    nodeType: NodeType;

    /** Tag name (lowercase for elements, e.g. 'div', 'input') */
    tagName: string;

    /** Text content for TEXT_NODE */
    nodeValue: string;

    /** HTML attributes as key-value pairs */
    attributes: Record<string, string>;

    /** Whether the element is visible (computed via style + rect) */
    isVisible: boolean;

    /** Whether the element is scrollable */
    isScrollable: boolean;

    /** Bounding rect (viewport-relative, from getBoundingClientRect) */
    rect: DOMRect | null;

    /** Computed cursor style (for interactivity detection) */
    cursorStyle: string | null;

    /** Parent node reference (null for root) */
    parent: DOMNode | null;

    /** Child nodes */
    children: DOMNode[];

    /** Whether this node is interactive/clickable */
    isInteractive: boolean;

    /** CSS selector for this element */
    cssSelector: string;

    /** Shadow root children (open shadow DOM only) */
    shadowRoots: DOMNode[];
}

// ============================================================
// Simplified Node (for serialization/optimization)
// ============================================================

/**
 * Simplified tree node for optimization before serialization.
 * Equivalent to browser-use's SimplifiedNode.
 */
export interface SimplifiedNode {
    /** Reference to the original DOMNode */
    originalNode: DOMNode;

    /** Optimized children */
    children: SimplifiedNode[];

    /** Whether to include this node in output */
    shouldDisplay: boolean;

    /** Whether this element has an interactive index */
    isInteractive: boolean;

    /** Whether this is a new element (not in previous state) */
    isNew: boolean;

    /** Whether excluded by parent bound box filtering */
    excludedByParent: boolean;

    /** Whether this is a shadow DOM host */
    isShadowHost: boolean;
}

// ============================================================
// Serialization Configuration
// ============================================================

/**
 * Attributes to include when serializing DOM tree for LLM.
 * Adapted from browser-use's DEFAULT_INCLUDE_ATTRIBUTES.
 * Removed AX-tree specific attributes (ax_name, valuenow, etc.)
 */
export const DEFAULT_INCLUDE_ATTRIBUTES: string[] = [
    'title',
    'type',
    'checked',
    'id',
    'name',
    'role',
    'value',
    'placeholder',
    'alt',
    'aria-label',
    'aria-expanded',
    'aria-checked',
    'aria-selected',
    'aria-required',
    'aria-disabled',
    'aria-hidden',
    'data-state',
    // Validation attributes
    'pattern',
    'min',
    'max',
    'minlength',
    'maxlength',
    'step',
    'accept',
    'multiple',
    'inputmode',
    'autocomplete',
    'contenteditable',
    // State
    'disabled',
    'readonly',
    'required',
    'selected',
    'href',
    'src',
    'for',
    'action',
    'method',
];

/**
 * Interactive HTML tags that are natively clickable/interactable.
 */
export const INTERACTIVE_TAGS = new Set([
    'a', 'button', 'input', 'textarea', 'select',
    'option', 'details', 'summary', 'optgroup',
]);

/**
 * Interactive ARIA roles.
 */
export const INTERACTIVE_ROLES = new Set([
    'button', 'link', 'tab', 'menuitem', 'menuitemcheckbox', 'menuitemradio',
    'option', 'radio', 'switch', 'textbox', 'combobox', 'searchbox',
    'slider', 'spinbutton', 'checkbox', 'listbox', 'treeitem', 'gridcell',
    'row', 'cell', 'search',
]);

/**
 * Interactive HTML attributes that indicate clickability.
 */
export const INTERACTIVE_ATTRIBUTES = new Set([
    'onclick', 'onmousedown', 'onmouseup', 'onkeydown', 'onkeyup',
    'tabindex', 'ng-click', '@click', 'v-on:click', 'data-action',
    'data-onclick', 'jsaction',
]);

/**
 * Tags to skip when extracting text content.
 */
export const SKIP_TEXT_TAGS = new Set([
    'script', 'style', 'noscript', 'svg', 'path', 'meta', 'link', 'head',
    'template',
]);

/**
 * SVG child elements to skip (decorative only).
 * Equivalent to browser-use's SVG_ELEMENTS.
 */
export const SVG_ELEMENTS = new Set([
    'path', 'rect', 'g', 'circle', 'ellipse', 'line', 'polyline',
    'polygon', 'use', 'defs', 'clipPath', 'mask', 'pattern', 'image',
    'text', 'tspan',
]);

/**
 * Block-level elements that get newlines in text extraction.
 */
export const BLOCK_TAGS = new Set([
    'div', 'p', 'section', 'article', 'main', 'aside', 'header', 'footer',
    'nav', 'ul', 'ol', 'table', 'tr', 'blockquote', 'pre', 'form',
    'fieldset', 'figure', 'figcaption', 'address',
]);

// ============================================================
// Scroll Info
// ============================================================

/**
 * Scroll information for a scrollable element or the page.
 */
export interface ScrollInfo {
    scrollTop: number;
    scrollLeft: number;
    scrollHeight: number;
    scrollWidth: number;
    clientHeight: number;
    clientWidth: number;
    pagesAbove: number;
    pagesBelow: number;
    canScrollUp: boolean;
    canScrollDown: boolean;
    canScrollLeft: boolean;
    canScrollRight: boolean;
}

// ============================================================
// Bounding Box Filtering
// ============================================================

/**
 * Propagating bounds from parent interactive element.
 * Equivalent to browser-use's PropagatingBounds.
 */
export interface PropagatingBounds {
    tag: string;
    bounds: DOMRect;
    nodeIndex: number;
    depth: number;
}

// ============================================================
// DOM Analysis Result
// ============================================================

/**
 * Result of analyzing the page DOM.
 * This is the main output of the DOM module.
 */
export interface DOMAnalysisResult {
    /** Page URL */
    url: string;

    /** Page title */
    title: string;

    /** Serialized DOM tree text for LLM consumption */
    domTreeText: string;

    /** Total number of interactive elements found */
    interactiveCount: number;

    /** Page scroll info */
    scrollInfo: ScrollInfo;

    /** Truncated flag */
    wasTruncated: boolean;
}

/**
 * Markdown chunk for structured page content.
 * Equivalent to browser-use's MarkdownChunk.
 */
export interface MarkdownChunk {
    content: string;
    chunkIndex: number;
    totalChunks: number;
    charOffsetStart: number;
    charOffsetEnd: number;
    hasMore: boolean;
}
