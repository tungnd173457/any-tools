export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
    imageUrl?: string; // base64 data URL for screenshot images
    isStreaming?: boolean; // true while the message is still being streamed
    model?: string; // the model that generated this response (e.g. 'gpt-4.1-mini')
}

export interface ChatConversation {
    id: string;
    title: string;
    messages: ChatMessage[];
    createdAt: number;
    updatedAt: number;
    apiConversationId?: string; // the actual conversation ID on ChatGPT backend
}

export interface ChatSettings {
    openaiApiKey: string;
    chatModel: string;
    serviceProvider?: 'custom' | 'webapp';
}

export interface ChatResult {
    content: string;
    model: string;
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}
