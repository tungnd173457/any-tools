// Chat module background script
// Handles OpenAI API communication and sidePanel toggle

// Toggle sidePanel when extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
    if (tab.id) {
        chrome.sidePanel.open({ tabId: tab.id });
    }
});

import { handleOpenAIStreamRequest } from './OpenAIService';
import { handleChatGPTStreamRequest } from './ChatGPTReversedService';


// Crop screenshot using OffscreenCanvas (works in service worker)
async function cropScreenshot(dataUrl: string, rect: { x: number; y: number; width: number; height: number }, devicePixelRatio: number): Promise<string> {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);

    // Account for device pixel ratio
    const sx = Math.round(rect.x * devicePixelRatio);
    const sy = Math.round(rect.y * devicePixelRatio);
    const sw = Math.round(rect.width * devicePixelRatio);
    const sh = Math.round(rect.height * devicePixelRatio);

    // Clamp to bitmap bounds
    const clampedW = Math.min(sw, bitmap.width - sx);
    const clampedH = Math.min(sh, bitmap.height - sy);

    const canvas = new OffscreenCanvas(clampedW, clampedH);
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(bitmap, sx, sy, clampedW, clampedH, 0, 0, clampedW, clampedH);
    bitmap.close();

    const resultBlob = await canvas.convertToBlob({ type: 'image/png' });
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(resultBlob);
    });
}

// Listen for chat messages from sidePanel
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'chatSendStream') {
        const isWebApp = request.provider === 'webapp';

        if (isWebApp) {
            handleChatGPTStreamRequest(
                request.lastMessage,
                request.model,
                request.streamId,
                request.apiConversationId
            );
        } else {
            handleOpenAIStreamRequest(
                request.messages,
                request.model,
                request.apiKey,
                request.streamId
            );
        }

        // Acknowledge immediately so the port doesn't time out
        sendResponse({ success: true });
        return true;
    }

    if (request.action === 'screenshotAreaSelected') {
        const rect = request.rect;
        const devicePixelRatio = request.devicePixelRatio || 1;

        // Validate rect
        if (!rect || rect.width < 5 || rect.height < 5) {
            return false;
        }

        // Capture the visible tab
        chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
            try {
                const dataUrl = await chrome.tabs.captureVisibleTab(
                    undefined as any,
                    { format: 'png' }
                );

                const croppedDataUrl = await cropScreenshot(dataUrl, rect, devicePixelRatio);

                // Send the cropped screenshot to the sidepanel
                chrome.runtime.sendMessage({
                    action: 'screenshotCaptured',
                    imageUrl: croppedDataUrl,
                });
            } catch (err: any) {
                console.error('Screenshot capture failed:', err);
                chrome.runtime.sendMessage({
                    action: 'screenshotError',
                    error: err.message || 'Failed to capture screenshot',
                });
            }
        });

        return true;
    }
});

// Initialize default chat settings on install
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.get(['openaiApiKey', 'chatModel'], (data) => {
        const defaults: Record<string, string> = {};
        if (!data.openaiApiKey) defaults.openaiApiKey = '';
        if (!data.chatModel) defaults.chatModel = 'gpt-4.1-mini';

        if (Object.keys(defaults).length > 0) {
            chrome.storage.sync.set(defaults);
        }
    });

    // Enable sidePanel for all tabs
    chrome.sidePanel.setOptions({
        enabled: true,
    });
});
