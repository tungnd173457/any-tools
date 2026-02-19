import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { ChatMessage, ChatConversation, ChatSettings } from '../types';

interface ChatContextType {
    // State
    conversations: ChatConversation[];
    currentConversation: ChatConversation | null;
    messages: ChatMessage[];
    isStreaming: boolean;
    settings: ChatSettings;
    error: string | null;

    selectedText: string;
    setSelectedText: (text: string) => void;

    screenshotImage: string | null;
    setScreenshotImage: (url: string | null) => void;

    // Actions
    sendMessage: (text: string) => void;
    startNewConversation: () => void;
    loadConversation: (id: string) => void;
    deleteConversation: (id: string) => void;
    setModel: (model: string) => void;
    clearError: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChatContext = () => {
    const ctx = useContext(ChatContext);
    if (!ctx) throw new Error('useChatContext must be used within ChatProvider');
    return ctx;
};

function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function generateTitle(text: string): string {
    const cleaned = text.replace(/\n/g, ' ').trim();
    return cleaned.length > 40 ? cleaned.substring(0, 40) + '…' : cleaned;
}

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [conversations, setConversations] = useState<ChatConversation[]>([]);
    const [currentConversation, setCurrentConversation] = useState<ChatConversation | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isStreaming, setIsStreaming] = useState(false);
    const [settings, setSettings] = useState<ChatSettings>({ openaiApiKey: '', chatModel: 'gpt-4.1-mini' });
    const [error, setError] = useState<string | null>(null);
    const [selectedText, setSelectedText] = useState<string>('');
    const [screenshotImage, setScreenshotImage] = useState<string | null>(null);

    // Refs to keep latest state in callbacks
    const messagesRef = useRef(messages);
    const conversationsRef = useRef(conversations);
    const currentConvoRef = useRef(currentConversation);
    const screenshotRef = useRef(screenshotImage);
    messagesRef.current = messages;
    conversationsRef.current = conversations;
    currentConvoRef.current = currentConversation;
    screenshotRef.current = screenshotImage;

    // Listen for text selection and screenshot from content script / background
    useEffect(() => {
        const handleMessage = (request: any, sender: any, sendResponse: any) => {
            if (request.action === 'textSelected') {
                setSelectedText(request.text || '');
            }
            if (request.action === 'screenshotCaptured') {
                setScreenshotImage(request.imageUrl || null);
            }
            if (request.action === 'screenshotError') {
                setError(request.error || 'Screenshot capture failed');
            }
        };
        chrome.runtime.onMessage.addListener(handleMessage);
        return () => chrome.runtime.onMessage.removeListener(handleMessage);
    }, []);

    // Load settings
    useEffect(() => {
        chrome.storage.sync.get({ openaiApiKey: '', chatModel: 'gpt-4.1-mini' }, (data) => {
            setSettings({
                openaiApiKey: (data.openaiApiKey as string) || '',
                chatModel: (data.chatModel as string) || 'gpt-4.1-mini'
            });
        });

        const listener = (changes: { [key: string]: chrome.storage.StorageChange }, namespace: string) => {
            if (namespace === 'sync') {
                if (changes.openaiApiKey) {
                    setSettings(prev => ({ ...prev, openaiApiKey: (changes.openaiApiKey.newValue as string) || '' }));
                }
                if (changes.chatModel) {
                    setSettings(prev => ({ ...prev, chatModel: (changes.chatModel.newValue as string) || 'gpt-4.1-mini' }));
                }
            }
        };
        chrome.storage.onChanged.addListener(listener);
        return () => chrome.storage.onChanged.removeListener(listener);
    }, []);

    // Load conversations
    useEffect(() => {
        chrome.storage.local.get({ chatConversations: [] }, (data) => {
            setConversations((data.chatConversations as ChatConversation[]) || []);
        });
    }, []);

    // Persist conversations
    const persistConversations = useCallback((convos: ChatConversation[]) => {
        chrome.storage.local.set({ chatConversations: convos });
    }, []);

    const clearError = useCallback(() => setError(null), []);

    const startNewConversation = useCallback(() => {
        setCurrentConversation(null);
        setMessages([]);
        setError(null);
    }, []);

    const loadConversation = useCallback((id: string) => {
        const convo = conversationsRef.current.find(c => c.id === id);
        if (!convo) return;
        setCurrentConversation(convo);
        setMessages([...convo.messages]);
        setError(null);
    }, []);

    const deleteConversation = useCallback((id: string) => {
        const updated = conversationsRef.current.filter(c => c.id !== id);
        setConversations(updated);
        persistConversations(updated);
        if (currentConvoRef.current?.id === id) {
            startNewConversation();
        }
    }, [persistConversations, startNewConversation]);

    const setModel = useCallback((model: string) => {
        setSettings(prev => ({ ...prev, chatModel: model }));
        chrome.storage.sync.set({ chatModel: model });
    }, []);

    const sendMessage = useCallback((text: string) => {
        if (!text.trim() || isStreaming) return;

        if (!settings.openaiApiKey) {
            setError('Please set your OpenAI API key in extension options.');
            return;
        }

        setError(null);

        let finalContent = text.trim();
        if (selectedText) {
            finalContent = `Start of Context:\n"${selectedText}"\nEnd of Context\n\n${text.trim()}`;
            setSelectedText('');
        }

        // Capture current screenshot before clearing
        const currentScreenshot = screenshotRef.current;
        if (currentScreenshot) {
            setScreenshotImage(null);
        }

        const userMsg: ChatMessage = {
            id: generateId(),
            role: 'user',
            content: finalContent,
            timestamp: Date.now(),
            imageUrl: currentScreenshot || undefined,
        };

        const newMessages = [...messagesRef.current, userMsg];
        setMessages(newMessages);

        // Create or update conversation
        let convoId = currentConvoRef.current?.id;
        let updatedConvos = [...conversationsRef.current];

        if (!convoId) {
            convoId = generateId();
            const newConvo: ChatConversation = {
                id: convoId,
                title: generateTitle(text),
                messages: newMessages,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            };
            updatedConvos.push(newConvo);
            setCurrentConversation(newConvo);
        } else {
            updatedConvos = updatedConvos.map(c =>
                c.id === convoId ? { ...c, messages: newMessages, updatedAt: Date.now() } : c
            );
            setCurrentConversation(prev => prev ? { ...prev, messages: newMessages, updatedAt: Date.now() } : prev);
        }

        setConversations(updatedConvos);
        persistConversations(updatedConvos);

        // Send to background
        setIsStreaming(true);

        // Build API messages - use OpenAI Vision format if any message has an image
        const apiMessages = newMessages.map(m => {
            if (m.imageUrl) {
                // Vision API format: content is an array of parts
                return {
                    role: m.role,
                    content: [
                        ...(m.content ? [{ type: 'text', text: m.content }] : []),
                        {
                            type: 'image_url',
                            image_url: { url: m.imageUrl, detail: 'auto' }
                        }
                    ]
                };
            }
            return { role: m.role, content: m.content };
        });

        chrome.runtime.sendMessage(
            {
                action: 'chatSend',
                messages: apiMessages,
                model: settings.chatModel,
                apiKey: settings.openaiApiKey,
            },
            (response) => {
                setIsStreaming(false);

                if (chrome.runtime.lastError) {
                    setError('Connection error: ' + chrome.runtime.lastError.message);
                    return;
                }

                if (response?.success) {
                    const assistantMsg: ChatMessage = {
                        id: generateId(),
                        role: 'assistant',
                        content: response.data.content,
                        timestamp: Date.now(),
                    };

                    setMessages(prev => {
                        const withAssistant = [...prev, assistantMsg];

                        // Persist
                        const latestConvos = conversationsRef.current.map(c =>
                            c.id === convoId ? { ...c, messages: withAssistant, updatedAt: Date.now() } : c
                        );
                        setConversations(latestConvos);
                        persistConversations(latestConvos);
                        setCurrentConversation(prev2 => prev2 ? { ...prev2, messages: withAssistant, updatedAt: Date.now() } : prev2);

                        return withAssistant;
                    });
                } else {
                    setError(response?.error || 'Unknown error occurred');
                }
            }
        );
    }, [isStreaming, settings, persistConversations, selectedText]);

    return (
        <ChatContext.Provider value={{
            conversations,
            currentConversation,
            messages,
            isStreaming,
            settings,
            error,
            selectedText,
            setSelectedText,
            screenshotImage,
            setScreenshotImage,
            sendMessage,
            startNewConversation,
            loadConversation,
            deleteConversation,
            setModel,
            clearError,
        }}>
            {children}
        </ChatContext.Provider>
    );
};
