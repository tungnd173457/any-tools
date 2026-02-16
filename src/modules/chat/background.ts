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

// Listen for chat messages from sidePanel
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'chatSend') {
        handleChatRequest(request.messages, request.model, request.apiKey)
            .then(result => sendResponse({ success: true, data: result }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // Keep message channel open for async
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
