// Browser Agent - Background Script
// Listens for browser-agent messages and dispatches to tools

import { handleBrowserAgentAction } from './tools';
import type { BrowserAgentMessage, ToolResult, BrowserAgentAction } from './types';

// ============================================================
// Message Handler
// ============================================================

chrome.runtime.onMessage.addListener(
    (request: any, sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) => {
        if (request.action !== 'browserAgent' || !request.payload) {
            return false;
        }

        const agentAction = request.payload as BrowserAgentAction;

        // Handle async tool execution
        (async () => {
            try {
                const result: ToolResult = await handleBrowserAgentAction(agentAction);
                sendResponse(result);
            } catch (error: any) {
                sendResponse({
                    success: false,
                    error: `Browser Agent internal error: ${error.message}`,
                });
            }
        })();

        // Return true to indicate that the response will be sent asynchronously
        return true;
    }
);

// ============================================================
// Convenience: External extension messaging (optional)
// ============================================================

chrome.runtime.onMessageExternal?.addListener(
    (request: any, sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) => {
        if (request.action !== 'browserAgent' || !request.payload) {
            sendResponse({ success: false, error: 'Invalid request. Expected action: "browserAgent" with payload.' });
            return true;
        }

        (async () => {
            try {
                const result = await handleBrowserAgentAction(request.payload);
                sendResponse(result);
            } catch (error: any) {
                sendResponse({ success: false, error: error.message });
            }
        })();

        return true;
    }
);

console.log('🤖 Browser Agent Service Loaded');
