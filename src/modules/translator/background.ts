// Background service worker for handling translation requests
import { Settings, TranslationResult, RuntimeMessage } from '../../shared/types';

const API_URL = "https://translate-pa.googleapis.com/v1/translate";

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request: RuntimeMessage, sender, sendResponse) => {
    if (request.action === 'translate') {
        handleTranslation(request.text, request.sourceLang, request.targetLang)
            .then(result => sendResponse({ success: true, data: result }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // Keep the message channel open for async response
    }

    if (request.action === 'getSettings') {
        chrome.storage.sync.get({
            sourceLang: 'auto',
            targetLang: 'vi',
            popupMode: 'button',
            googleApiKey: ''
        }, (settings) => {
            sendResponse({ success: true, data: settings as unknown as Settings });
        });
        return true;
    }
});

async function handleTranslation(text: string, sourceLang: string, targetLang: string): Promise<TranslationResult> {
    try {
        const settings = await chrome.storage.sync.get({ googleApiKey: '' }) as any;
        const apiKey = settings.googleApiKey;

        if (!apiKey) {
            throw new Error('Google Translate API Key is not configured. Please set it in the options page.');
        }

        const url = new URL(API_URL);

        // Add query parameters
        url.searchParams.append("params.client", "gtx");
        url.searchParams.append("query.source_language", sourceLang);
        url.searchParams.append("query.target_language", targetLang);
        url.searchParams.append("query.display_language", "en-US");
        url.searchParams.append("query.text", text);
        url.searchParams.append("key", apiKey);

        // Add data types
        const dataTypes = [
            "TRANSLATION",
            "SENTENCE_SPLITS",
            "BILINGUAL_DICTIONARY_FULL"
        ];
        dataTypes.forEach(type => {
            url.searchParams.append("data_types", type);
        });

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Translation failed: ${response.status}`);
        }

        const data = await response.json();
        return parseTranslationResponse(data);
    } catch (error) {
        console.error('Translation error:', error);
        throw error;
    }
}

function parseTranslationResponse(data: any): TranslationResult {
    const result: TranslationResult = {
        translation: '',
        originalText: '',
        detectedLanguage: ''
    };

    // Parse the response structure
    // The actual structure may vary, adjust based on API response
    if (data.translation) {
        result.translation = data.translation;
    } else if (data[0] && Array.isArray(data[0])) {
        // Alternative response format
        result.translation = data[0].map((item: any) => item[0]).join('');
    }

    if (data.src) {
        result.detectedLanguage = data.src;
    }

    return result;
}

// Initialize default settings on installation
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.set({
        sourceLang: 'auto',
        targetLang: 'vi',
        popupMode: 'button',
        googleApiKey: ''
    });
});
