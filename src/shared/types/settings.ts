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
