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
    content: string | any[];
}

// Stream chat response, sending token chunks back via runtime messages
async function handleChatStreamRequest(
    messages: OpenAIMessage[],
    model: string,
    apiKey: string,
    streamId: string
): Promise<void> {
    if (!apiKey) {
        chrome.runtime.sendMessage({
            action: 'chatStreamError',
            streamId,
            error: 'OpenAI API key not configured. Please set it in extension options.',
        });
        return;
    }

    const url = 'https://api.openai.com/v1/chat/completions';

    const body = {
        model,
        messages,
        temperature: 0.7,
        max_tokens: 4096,
        stream: true,
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
            chrome.runtime.sendMessage({ action: 'chatStreamError', streamId, error: errorMessage });
            return;
        }

        if (!response.body) {
            chrome.runtime.sendMessage({ action: 'chatStreamError', streamId, error: 'No response body' });
            return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';
        let finalModel = model;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // Process complete SSE lines
            const lines = buffer.split('\n');
            // Keep the last (possibly incomplete) line in the buffer
            buffer = lines.pop() ?? '';

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed === 'data: [DONE]') {
                    if (trimmed === 'data: [DONE]') {
                        // Stream fully complete
                        chrome.runtime.sendMessage({ action: 'chatStreamDone', streamId, model: finalModel });
                        return;
                    }
                    continue;
                }

                if (trimmed.startsWith('data: ')) {
                    const jsonStr = trimmed.slice(6);
                    try {
                        const parsed = JSON.parse(jsonStr);
                        if (parsed.model) finalModel = parsed.model;
                        const delta = parsed.choices?.[0]?.delta;
                        if (delta?.content) {
                            chrome.runtime.sendMessage({
                                action: 'chatStreamToken',
                                streamId,
                                token: delta.content,
                            });
                        }
                        // Check finish_reason
                        if (parsed.choices?.[0]?.finish_reason === 'stop') {
                            chrome.runtime.sendMessage({ action: 'chatStreamDone', streamId, model: finalModel });
                            return;
                        }
                    } catch {
                        // Ignore malformed JSON chunks
                    }
                }
            }
        }

        // If we exit the loop without a [DONE] signal, still mark done
        chrome.runtime.sendMessage({ action: 'chatStreamDone', streamId, model: finalModel });

    } catch (error: any) {
        const msg = error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')
            ? 'Network error. Please check your internet connection.'
            : error.message || 'Unknown error';
        chrome.runtime.sendMessage({ action: 'chatStreamError', streamId, error: msg });
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
    if (request.action === 'chatSendStream') {
        // Fire-and-forget: kicks off the streaming fetch independently
        handleChatStreamRequest(request.messages, request.model, request.apiKey, request.streamId);
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
