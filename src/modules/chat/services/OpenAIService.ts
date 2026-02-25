interface OpenAIMessage {
    role: string;
    content: string | any[];
}

export async function handleOpenAIStreamRequest(
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
