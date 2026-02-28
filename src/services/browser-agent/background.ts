// Browser Agent - Background Script
// Listens for browser-agent messages and dispatches to tools + agent lifecycle

import { handleBrowserAgentAction } from './tools';
import { startAgentTask, stopAgentTask, getAgentStatus, getActiveAgents } from './core/agent-service';
import type { BrowserAgentAction } from './types';
import type { AgentConfig } from './types/agent-types';

// ============================================================
// Message Handler
// ============================================================

chrome.runtime.onMessage.addListener(
    (request: any, sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) => {
        // --- Tool-level actions (single tool call) ---
        if (request.action === 'browserAgent' && request.payload) {
            const agentAction = request.payload as BrowserAgentAction;
            (async () => {
                try {
                    const result = await handleBrowserAgentAction(agentAction);
                    sendResponse(result);
                } catch (error: any) {
                    sendResponse({ success: false, error: `Internal error: ${error.message}` });
                }
            })();
            return true;
        }

        // --- Agent lifecycle: Start Task ---
        if (request.action === 'browserAgent:startTask') {
            const config = request.config as AgentConfig;
            if (!config?.task || !config?.apiKey) {
                sendResponse({ success: false, error: 'Missing task or apiKey' });
                return true;
            }
            (async () => {
                try {
                    const { taskId } = await startAgentTask(config);
                    sendResponse({ success: true, taskId });
                } catch (error: any) {
                    sendResponse({ success: false, error: error.message });
                }
            })();
            return true;
        }

        // --- Agent lifecycle: Stop Task ---
        if (request.action === 'browserAgent:stopTask') {
            const stopped = stopAgentTask(request.taskId);
            sendResponse({ success: stopped, message: stopped ? 'Agent stopped' : 'Agent not found' });
            return true;
        }

        // --- Agent lifecycle: Get Status ---
        if (request.action === 'browserAgent:getStatus') {
            const status = request.taskId
                ? getAgentStatus(request.taskId)
                : { activeAgents: getActiveAgents() };
            sendResponse({ success: true, data: status });
            return true;
        }

        return false;
    }
);

// ============================================================
// External extension messaging (optional)
// ============================================================

chrome.runtime.onMessageExternal?.addListener(
    (request: any, sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) => {
        if (request.action === 'browserAgent' && request.payload) {
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

        if (request.action === 'browserAgent:startTask') {
            (async () => {
                try {
                    const { taskId } = await startAgentTask(request.config);
                    sendResponse({ success: true, taskId });
                } catch (error: any) {
                    sendResponse({ success: false, error: error.message });
                }
            })();
            return true;
        }

        return false;
    }
);

console.log('🤖 Browser Agent Service Loaded (with Agent Loop)');
