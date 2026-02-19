// Chat module background script
// Handles OpenAI API communication and sidePanel toggle

// Toggle sidePanel when extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
    if (tab.id) {
        chrome.sidePanel.open({ tabId: tab.id });
    }
});

interface OpenAIMessage {
    role: string;
    content: string;
}

interface ChatResult {
    content: string;
    model: string;
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

async function handleChatRequest(
    messages: OpenAIMessage[],
    model: string,
    apiKey: string
): Promise<ChatResult> {
    if (!apiKey) {
        throw new Error('OpenAI API key not configured. Please set it in extension options.');
    }

    const url = 'https://api.openai.com/v1/chat/completions';

    const body = {
        model: model,
        messages: messages,
        temperature: 0.7,
        max_tokens: 4096,
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData?.error?.message || `API request failed with status ${response.status}`;
            throw new Error(errorMessage);
        }

        const data = await response.json();

        if (!data.choices || data.choices.length === 0) {
            throw new Error('No response from AI model');
        }

        return {
            content: data.choices[0].message.content,
            model: data.model,
            usage: data.usage,
        };
    } catch (error: any) {
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            throw new Error('Network error. Please check your internet connection.');
        }
        throw error;
    }
}

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
    if (request.action === 'chatSend') {
        handleChatRequest(request.messages, request.model, request.apiKey)
            .then(result => sendResponse({ success: true, data: result }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // Keep message channel open for async
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
