export interface Settings {
    sourceLang: string;
    targetLang: string;
    popupMode: 'button' | 'auto' | 'disabled';
    googleApiKey?: string;
    openaiApiKey?: string;
    chatModel?: string;
    serviceProvider?: 'custom' | 'webapp';
}

export interface TranslationResult {
    translation: string;
    originalText: string;
    detectedLanguage: string;
}

export interface TranslationResponse {
    success: boolean;
    data?: TranslationResult | Settings;
    error?: string;
}

export type MessageAction = 'translate' | 'getSettings';

export interface TranslationMessage {
    action: 'translate';
    text: string;
    sourceLang: string;
    targetLang: string;
}

export interface SettingsMessage {
    action: 'getSettings';
}

export type RuntimeMessage = TranslationMessage | SettingsMessage | ChatSendMessage;

// ========= Chat Module Types =========

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
}

export interface ChatConversation {
    id: string;
    title: string;
    messages: ChatMessage[];
    createdAt: number;
    updatedAt: number;
}

export interface ChatSettings {
    openaiApiKey: string;
    chatModel: string;
    serviceProvider?: 'custom' | 'webapp';
}

export interface ChatSendMessage {
    action: 'chatSend';
    messages: { role: string; content: string }[];
    model: string;
    apiKey: string;
}
