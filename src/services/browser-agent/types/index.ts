// Browser Agent - Type Definitions

// ============================================================
// Tool Action Types (Input)
// ============================================================

export interface NavigateAction {
    url: string;
    newTab?: boolean;
}

export interface ClickElementAction {
    index?: number;        // Element index from get-elements
    selector?: string;     // CSS selector fallback
    coordinateX?: number;  // Viewport X coordinate
    coordinateY?: number;  // Viewport Y coordinate
}

export interface TypeTextAction {
    index?: number;     // Element index from get-elements
    selector?: string;  // CSS selector fallback
    text: string;
    clear?: boolean;    // Clear field before typing (default: true)
    pressEnter?: boolean; // Press Enter after typing
}

export interface ScrollAction {
    direction: 'up' | 'down' | 'left' | 'right';
    amount?: number;      // Pixels to scroll (default: viewport height)
    index?: number;       // Element index to scroll within
    selector?: string;    // CSS selector of scrollable element
}

export interface SendKeysAction {
    keys: string;         // Key combo e.g. "Control+a", "Enter", "Escape"
}

export interface WaitForElementAction {
    selector: string;
    timeout?: number;     // ms, default 5000
    visible?: boolean;    // Wait for element to be visible (default: true)
}

export interface WaitForNavigationAction {
    timeout?: number;     // ms, default 10000
}

export interface SearchPageAction {
    pattern: string;
    regex?: boolean;
    caseSensitive?: boolean;
    contextChars?: number;  // Chars of surrounding context per match
    cssScope?: string;      // CSS selector to limit search scope
    maxResults?: number;    // Max matches to return (default: 25)
}

export interface FindElementsAction {
    selector: string;
    attributes?: string[];    // Specific attributes to extract
    maxResults?: number;      // Max elements to return (default: 50)
    includeText?: boolean;    // Include text content (default: true)
}

export interface GetDropdownOptionsAction {
    index?: number;
    selector?: string;
}

export interface SelectDropdownOptionAction {
    index?: number;
    selector?: string;
    value?: string;   // Option value
    text?: string;    // Option text (human-readable)
}

export interface EvaluateJSAction {
    code: string;
}

export interface HighlightElementAction {
    index?: number;
    selector?: string;
    color?: string;    // Highlight color (default: rgba(255,0,0,0.3))
    duration?: number; // ms to keep highlight (default: 2000)
}

export interface FillFormAction {
    fields: Record<string, string>; // selector -> value mapping
}

export interface ExtractLinksAction {
    filter?: string;     // URL pattern to filter
    includeText?: boolean;
    maxResults?: number;
}

export interface GetPageMetadataAction {
    /* no params needed */
}

export interface GetPageTextAction {
    includeLinks?: boolean;
    maxLength?: number;
}

export interface GetElementsAction {
    /* no params needed - returns all interactive elements */
}

export interface CaptureVisibleTabAction {
    format?: 'png' | 'jpeg';
    quality?: number; // 0-100 for jpeg
}

// ============================================================
// Tool Result Types (Output)
// ============================================================

export interface ToolResult {
    success: boolean;
    data?: any;
    error?: string;
}

export interface InteractiveElement {
    index: number;
    tag: string;
    type?: string;         // input type, button type, etc.
    role?: string;         // ARIA role
    text: string;          // visible text / label
    placeholder?: string;
    name?: string;
    id?: string;
    href?: string;
    value?: string;
    checked?: boolean;
    disabled?: boolean;
    ariaLabel?: string;
    isVisible: boolean;
    rect: { x: number; y: number; width: number; height: number };
    tagPath: string;       // CSS path: "div.main > form > input#email"
}

export interface PageElements {
    url: string;
    title: string;
    elements: InteractiveElement[];
    totalElements: number;
    scrollHeight: number;
    scrollTop: number;
    viewportHeight: number;
}

export interface PageText {
    url: string;
    title: string;
    text: string;
    length: number;
}

export interface SearchMatch {
    matchText: string;
    context: string;
    elementPath: string;
    charPosition: number;
}

export interface SearchResult {
    matches: SearchMatch[];
    total: number;
    hasMore: boolean;
}

export interface FoundElement {
    index: number;
    tag: string;
    text?: string;
    attrs?: Record<string, string>;
    childrenCount: number;
}

export interface FindResult {
    elements: FoundElement[];
    total: number;
    showing: number;
}

export interface LinkInfo {
    url: string;
    text: string;
    isExternal: boolean;
}

export interface PageMetadata {
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

export interface DropdownOption {
    value: string;
    text: string;
    selected: boolean;
    disabled: boolean;
}

// ============================================================
// Message Types (Background <-> Content Script)
// ============================================================

export type BrowserAgentAction =
    | { tool: 'navigate'; params: NavigateAction }
    | { tool: 'get-page-text'; params?: GetPageTextAction }
    | { tool: 'get-elements'; params?: GetElementsAction }
    | { tool: 'click-element'; params: ClickElementAction }
    | { tool: 'type-text'; params: TypeTextAction }
    | { tool: 'scroll'; params: ScrollAction }
    | { tool: 'send-keys'; params: SendKeysAction }
    | { tool: 'wait-for-element'; params: WaitForElementAction }
    | { tool: 'wait-for-navigation'; params?: WaitForNavigationAction }
    | { tool: 'search-page'; params: SearchPageAction }
    | { tool: 'find-elements'; params: FindElementsAction }
    | { tool: 'go-back' }
    | { tool: 'get-dropdown-options'; params: GetDropdownOptionsAction }
    | { tool: 'select-dropdown-option'; params: SelectDropdownOptionAction }
    | { tool: 'evaluate-js'; params: EvaluateJSAction }
    | { tool: 'capture-visible-tab'; params?: CaptureVisibleTabAction }
    | { tool: 'extract-links'; params?: ExtractLinksAction }
    | { tool: 'get-page-metadata'; params?: GetPageMetadataAction }
    | { tool: 'highlight-element'; params: HighlightElementAction }
    | { tool: 'fill-form'; params: FillFormAction };

export interface BrowserAgentMessage {
    action: 'browserAgent';
    payload: BrowserAgentAction;
}
