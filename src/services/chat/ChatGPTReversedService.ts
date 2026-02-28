import { ChatGPTReversed } from './ChatGPTReversed/index';

let chatGPTInstance: ChatGPTReversed | null = null;

export async function handleChatGPTStreamRequest(
    lastMessage: string,
    model: string,
    streamId: string,
    apiConversationId?: string
): Promise<void> {
    try {
        if (!chatGPTInstance) {
            chatGPTInstance = new ChatGPTReversed();
        }

        const stream = await chatGPTInstance.complete(lastMessage, { stream: true }, apiConversationId);

        let realConversationId: string | undefined = apiConversationId;

        for await (const chunk of stream) {
            if (!realConversationId && chunk.metadata?.conversation_id) {
                realConversationId = chunk.metadata.conversation_id;
            }

            chrome.runtime.sendMessage({
                action: 'chatStreamToken',
                streamId,
                token: chunk.text,
            });
        }

        // Stream completed
        chrome.runtime.sendMessage({
            action: 'chatStreamDone',
            streamId,
            model, // Keep original model or use the actual model from chatgpt
            apiConversationId: realConversationId,
        });

    } catch (error: any) {
        console.error('ChatGPTReversed Stream Error:', error);
        chrome.runtime.sendMessage({
            action: 'chatStreamError',
            streamId,
            error: error.message || 'Error occurred while communicating with ChatGPT',
        });
    }
}
