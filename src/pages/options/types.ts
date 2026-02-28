export type Tab = 'general' | 'sidebar' | 'context' | 'translate' | 'assistant' | 'prompts' | 'keyboard';

export interface StatusMessage {
    message: string;
    type: string;
}
