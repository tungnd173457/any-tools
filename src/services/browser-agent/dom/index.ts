// Browser Agent - DOM Module
// Re-exports all DOM analysis utilities.
//
// Architecture Note:
// ──────────────────
// This module provides DOM analysis tools for the browser agent.
// Functions fall into two categories:
//
// 1. **Page-context functions** — Run inside the target page via chrome.scripting.executeScript.
//    These must be self-contained (no external imports at runtime).
//    Main entry: buildDOMTree() from dom-tree-builder.ts
//
// 2. **Background-context utilities** — Used in the extension's background/service worker.
//    These process results from page-context functions.
//    Examples: chunkMarkdownByStructure()

// ---- Types ----
export type {
    DOMRect,
    DOMNode,
    SimplifiedNode,
    ScrollInfo,
    PropagatingBounds,
    DOMAnalysisResult,
    MarkdownChunk,
} from './types';

export {
    DEFAULT_INCLUDE_ATTRIBUTES,
    INTERACTIVE_TAGS,
    INTERACTIVE_ROLES,
    INTERACTIVE_ATTRIBUTES,
    SKIP_TEXT_TAGS,
    SVG_ELEMENTS,
    BLOCK_TAGS,
} from './types';

// ---- Core: DOM Tree Builder (page context) ----
export { buildDOMTree } from './dom-tree-builder';

// ---- Markdown Extraction & Chunking ----
export {
    extractMarkdown,
    chunkMarkdownByStructure,
} from './markdown-extractor';

// ---- Page Query Utilities ----
export {
    searchPageText,
    findElementsBySelector,
    extractLinks,
    getPageMetadata,
} from './page-query';

export type {
    SearchMatch,
    SearchResult,
    FoundElement,
    FindResult,
    LinkInfo,
    PageMetadata,
} from './page-query';

// ---- DOM Actions (page context interactions) ----
export {
    clickElementByIndex,
    clickAtCoordinates,
    typeTextByIndex,
    scrollPage,
    sendKeyboardEvent,
    waitForElement,
    getDropdownOptions,
    selectDropdownOption,
    highlightElement,
    fillFormFields,
} from './dom-actions';

export type { DropdownOption } from './dom-actions';
