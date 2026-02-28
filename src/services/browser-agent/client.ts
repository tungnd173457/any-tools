// Browser Agent - Client Library
// Convenience wrapper for calling browser-agent tools from UI/content scripts

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
    PageElements,
    PageText,
    SearchResult,
    FindResult,
    PageMetadata,
} from './types';

// ============================================================
// Core message sender
// ============================================================

function sendAction(action: BrowserAgentAction): Promise<ToolResult> {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage(
            { action: 'browserAgent', payload: action },
            (response: ToolResult) => {
                if (chrome.runtime.lastError) {
                    resolve({ success: false, error: chrome.runtime.lastError.message });
                } else {
                    resolve(response);
                }
            }
        );
    });
}

// ============================================================
// Typed API Methods
// ============================================================

export const BrowserAgent = {
    /** Navigate to a URL */
    navigate: (url: string, newTab?: boolean): Promise<ToolResult> =>
        sendAction({ tool: 'navigate', params: { url, newTab } }),

    /** Go back in history */
    goBack: (): Promise<ToolResult> =>
        sendAction({ tool: 'go-back' }),

    /** Get page text content as clean markdown */
    getPageText: (options?: GetPageTextAction): Promise<ToolResult> =>
        sendAction({ tool: 'get-page-text', params: options }),

    /** Get all interactive elements on the current page */
    getElements: (): Promise<ToolResult> =>
        sendAction({ tool: 'get-elements' }),

    /** Click an element by index, selector, or coordinates */
    clickElement: (params: ClickElementAction): Promise<ToolResult> =>
        sendAction({ tool: 'click-element', params }),

    /** Click by index (shorthand) */
    click: (index: number): Promise<ToolResult> =>
        sendAction({ tool: 'click-element', params: { index } }),

    /** Click by coordinates (shorthand) */
    clickAt: (x: number, y: number): Promise<ToolResult> =>
        sendAction({ tool: 'click-element', params: { coordinateX: x, coordinateY: y } }),

    /** Type text into an element */
    typeText: (params: TypeTextAction): Promise<ToolResult> =>
        sendAction({ tool: 'type-text', params }),

    /** Type into an element by index (shorthand) */
    type: (index: number, text: string, options?: { clear?: boolean; pressEnter?: boolean }): Promise<ToolResult> =>
        sendAction({ tool: 'type-text', params: { index, text, ...options } }),

    /** Scroll the page */
    scroll: (params: ScrollAction): Promise<ToolResult> =>
        sendAction({ tool: 'scroll', params }),

    /** Scroll down (shorthand) */
    scrollDown: (amount?: number): Promise<ToolResult> =>
        sendAction({ tool: 'scroll', params: { direction: 'down', amount } }),

    /** Scroll up (shorthand) */
    scrollUp: (amount?: number): Promise<ToolResult> =>
        sendAction({ tool: 'scroll', params: { direction: 'up', amount } }),

    /** Send keyboard shortcuts */
    sendKeys: (keys: string): Promise<ToolResult> =>
        sendAction({ tool: 'send-keys', params: { keys } }),

    /** Wait for an element to appear */
    waitForElement: (selector: string, timeout?: number, visible?: boolean): Promise<ToolResult> =>
        sendAction({ tool: 'wait-for-element', params: { selector, timeout, visible } }),

    /** Wait for navigation to complete */
    waitForNavigation: (timeout?: number): Promise<ToolResult> =>
        sendAction({ tool: 'wait-for-navigation', params: { timeout } }),

    /** Search page text for a pattern */
    searchPage: (pattern: string, options?: Partial<SearchPageAction>): Promise<ToolResult> =>
        sendAction({ tool: 'search-page', params: { pattern, ...options } }),

    /** Find elements by CSS selector */
    findElements: (selector: string, options?: Partial<Omit<FindElementsAction, 'selector'>>): Promise<ToolResult> =>
        sendAction({ tool: 'find-elements', params: { selector, ...options } }),

    /** Get dropdown options */
    getDropdownOptions: (params: GetDropdownOptionsAction): Promise<ToolResult> =>
        sendAction({ tool: 'get-dropdown-options', params }),

    /** Select dropdown option */
    selectDropdownOption: (params: SelectDropdownOptionAction): Promise<ToolResult> =>
        sendAction({ tool: 'select-dropdown-option', params }),

    /** Execute JavaScript in the page context */
    evaluateJS: (code: string): Promise<ToolResult> =>
        sendAction({ tool: 'evaluate-js', params: { code } }),

    /** Capture screenshot of the visible tab */
    captureVisibleTab: (format?: 'png' | 'jpeg', quality?: number): Promise<ToolResult> =>
        sendAction({ tool: 'capture-visible-tab', params: { format, quality } }),

    /** Extract all links from the page */
    extractLinks: (filter?: string, options?: Partial<ExtractLinksAction>): Promise<ToolResult> =>
        sendAction({ tool: 'extract-links', params: { filter, ...options } }),

    /** Get page metadata (title, description, OG tags, etc.) */
    getPageMetadata: (): Promise<ToolResult> =>
        sendAction({ tool: 'get-page-metadata' }),

    /** Highlight an element visually */
    highlightElement: (params: HighlightElementAction): Promise<ToolResult> =>
        sendAction({ tool: 'highlight-element', params }),

    /** Highlight by index (shorthand) */
    highlight: (index: number, color?: string, duration?: number): Promise<ToolResult> =>
        sendAction({ tool: 'highlight-element', params: { index, color, duration } }),

    /** Fill form fields */
    fillForm: (fields: Record<string, string>): Promise<ToolResult> =>
        sendAction({ tool: 'fill-form', params: { fields } }),
};

export default BrowserAgent;
