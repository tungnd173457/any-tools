import { ChatSendMessage } from '../../services/chat/types';

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
