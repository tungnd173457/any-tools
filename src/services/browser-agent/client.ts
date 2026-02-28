// Browser Agent - Client Library
// Convenience wrapper for calling browser-agent tools + agent lifecycle from UI

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
} from './types';
import type { AgentConfig, AgentEvent } from './types/agent-types';

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

function sendLifecycle(action: string, data?: any): Promise<any> {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage(
            { action, ...data },
            (response: any) => {
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
    // ── Tool Methods (unchanged) ──────────────────────────────

    navigate: (url: string, newTab?: boolean): Promise<ToolResult> =>
        sendAction({ tool: 'navigate', params: { url, newTab } }),

    goBack: (): Promise<ToolResult> =>
        sendAction({ tool: 'go-back' }),

    getPageText: (options?: GetPageTextAction): Promise<ToolResult> =>
        sendAction({ tool: 'get-page-text', params: options }),

    getElements: (): Promise<ToolResult> =>
        sendAction({ tool: 'get-elements' }),

    clickElement: (params: ClickElementAction): Promise<ToolResult> =>
        sendAction({ tool: 'click-element', params }),

    click: (index: number): Promise<ToolResult> =>
        sendAction({ tool: 'click-element', params: { index } }),

    clickAt: (x: number, y: number): Promise<ToolResult> =>
        sendAction({ tool: 'click-element', params: { coordinateX: x, coordinateY: y } }),

    typeText: (params: TypeTextAction): Promise<ToolResult> =>
        sendAction({ tool: 'type-text', params }),

    type: (index: number, text: string, options?: { clear?: boolean; pressEnter?: boolean }): Promise<ToolResult> =>
        sendAction({ tool: 'type-text', params: { index, text, ...options } }),

    scroll: (params: ScrollAction): Promise<ToolResult> =>
        sendAction({ tool: 'scroll', params }),

    scrollDown: (amount?: number): Promise<ToolResult> =>
        sendAction({ tool: 'scroll', params: { direction: 'down', amount } }),

    scrollUp: (amount?: number): Promise<ToolResult> =>
        sendAction({ tool: 'scroll', params: { direction: 'up', amount } }),

    sendKeys: (keys: string): Promise<ToolResult> =>
        sendAction({ tool: 'send-keys', params: { keys } }),

    waitForElement: (selector: string, timeout?: number, visible?: boolean): Promise<ToolResult> =>
        sendAction({ tool: 'wait-for-element', params: { selector, timeout, visible } }),

    waitForNavigation: (timeout?: number): Promise<ToolResult> =>
        sendAction({ tool: 'wait-for-navigation', params: { timeout } }),

    searchPage: (pattern: string, options?: Partial<SearchPageAction>): Promise<ToolResult> =>
        sendAction({ tool: 'search-page', params: { pattern, ...options } }),

    findElements: (selector: string, options?: Partial<Omit<FindElementsAction, 'selector'>>): Promise<ToolResult> =>
        sendAction({ tool: 'find-elements', params: { selector, ...options } }),

    getDropdownOptions: (params: GetDropdownOptionsAction): Promise<ToolResult> =>
        sendAction({ tool: 'get-dropdown-options', params }),

    selectDropdownOption: (params: SelectDropdownOptionAction): Promise<ToolResult> =>
        sendAction({ tool: 'select-dropdown-option', params }),

    evaluateJS: (code: string): Promise<ToolResult> =>
        sendAction({ tool: 'evaluate-js', params: { code } }),

    captureVisibleTab: (format?: 'png' | 'jpeg', quality?: number): Promise<ToolResult> =>
        sendAction({ tool: 'capture-visible-tab', params: { format, quality } }),

    extractLinks: (filter?: string, options?: Partial<ExtractLinksAction>): Promise<ToolResult> =>
        sendAction({ tool: 'extract-links', params: { filter, ...options } }),

    getPageMetadata: (): Promise<ToolResult> =>
        sendAction({ tool: 'get-page-metadata' }),

    highlightElement: (params: HighlightElementAction): Promise<ToolResult> =>
        sendAction({ tool: 'highlight-element', params }),

    highlight: (index: number, color?: string, duration?: number): Promise<ToolResult> =>
        sendAction({ tool: 'highlight-element', params: { index, color, duration } }),

    fillForm: (fields: Record<string, string>): Promise<ToolResult> =>
        sendAction({ tool: 'fill-form', params: { fields } }),

    // ── Agent Lifecycle Methods ───────────────────────────────

    /** Start an autonomous agent task */
    startTask: (task: string, config?: Partial<Omit<AgentConfig, 'task'>>): Promise<{ success: boolean; taskId?: string; error?: string }> =>
        sendLifecycle('browserAgent:startTask', { config: { task, ...config } }),

    /** Stop a running agent */
    stopTask: (taskId: string): Promise<{ success: boolean; message?: string }> =>
        sendLifecycle('browserAgent:stopTask', { taskId }),

    /** Get agent status */
    getStatus: (taskId?: string): Promise<{ success: boolean; data?: any }> =>
        sendLifecycle('browserAgent:getStatus', { taskId }),

    /** Listen for agent events */
    onEvent: (callback: (event: AgentEvent) => void): (() => void) => {
        const listener = (message: any) => {
            if (message.action === 'browserAgentEvent' && message.event) {
                callback(message.event);
            }
        };
        chrome.runtime.onMessage.addListener(listener);
        // Return unsubscribe function
        return () => chrome.runtime.onMessage.removeListener(listener);
    },
};

export default BrowserAgent;
