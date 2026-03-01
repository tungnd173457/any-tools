import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { BrowserAgent } from '../../../services/browser-agent/client';
import type { AgentEvent } from '../../../services/browser-agent/types/agent-types';

// ============================================================
// UI Types
// ============================================================

export interface AgentStepAction {
    toolName: string;
    params?: Record<string, any>;
    description?: string;
    error?: string;
    status: 'executing' | 'done' | 'error';
}

export interface AgentStep {
    stepNumber: number;
    thinking?: string;
    evaluation?: string;
    memory?: string;
    nextGoal?: string;
    actions: AgentStepAction[];
    status: 'thinking' | 'acting' | 'complete' | 'error';
}

export interface AgentConversation {
    id: string;
    title: string;
    taskDescription: string;
    steps: AgentStep[];
    model: string;
    createdAt: number;
    updatedAt: number;
    doneResult?: { success: boolean; result?: string };
}

// ============================================================
// Context Type
// ============================================================

interface AgentContextType {
    // State
    conversations: AgentConversation[];
    currentConversation: AgentConversation | null;
    steps: AgentStep[];
    isRunning: boolean;
    taskId: string | null;
    taskDescription: string | null;
    error: string | null;
    doneResult: { success: boolean; result?: string } | null;
    agentModel: string;

    // Actions
    startAgent: (task: string) => void;
    stopAgent: () => void;
    startNewTask: () => void;
    loadConversation: (id: string) => void;
    deleteConversation: (id: string) => void;
    setAgentModel: (model: string) => void;
    clearError: () => void;
}

const AgentContext = createContext<AgentContextType | undefined>(undefined);

export const useAgentContext = () => {
    const ctx = useContext(AgentContext);
    if (!ctx) throw new Error('useAgentContext must be used within AgentProvider');
    return ctx;
};

function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function generateTitle(text: string): string {
    const cleaned = text.replace(/\n/g, ' ').trim();
    return cleaned.length > 40 ? cleaned.substring(0, 40) + '…' : cleaned;
}

// ============================================================
// Provider
// ============================================================

export const AgentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [conversations, setConversations] = useState<AgentConversation[]>([]);
    const [currentConversation, setCurrentConversation] = useState<AgentConversation | null>(null);
    const [steps, setSteps] = useState<AgentStep[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const [taskId, setTaskId] = useState<string | null>(null);
    const [taskDescription, setTaskDescription] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [doneResult, setDoneResult] = useState<{ success: boolean; result?: string } | null>(null);
    const [agentModel, setAgentModelState] = useState('gpt-4.1-mini');

    const taskIdRef = useRef(taskId);
    const conversationsRef = useRef(conversations);
    const currentConvoRef = useRef(currentConversation);
    const stepsRef = useRef(steps);
    const doneResultRef = useRef(doneResult);
    taskIdRef.current = taskId;
    conversationsRef.current = conversations;
    currentConvoRef.current = currentConversation;
    stepsRef.current = steps;
    doneResultRef.current = doneResult;

    // Load saved conversations and model from storage
    useEffect(() => {
        chrome.storage.local.get({ agentConversations: [] }, (data) => {
            setConversations((data.agentConversations as AgentConversation[]) || []);
        });
        chrome.storage.sync.get({ agentModel: 'gpt-4.1-mini' }, (data) => {
            setAgentModelState((data.agentModel as string) || 'gpt-4.1-mini');
        });
    }, []);

    // Persist conversations helper
    const persistConversations = useCallback((convos: AgentConversation[]) => {
        chrome.storage.local.set({ agentConversations: convos });
    }, []);

    // Persist current conversation state
    const persistCurrentState = useCallback(() => {
        const convoId = currentConvoRef.current?.id;
        if (!convoId) return;

        const updated = conversationsRef.current.map(c =>
            c.id === convoId
                ? {
                    ...c,
                    steps: stepsRef.current,
                    updatedAt: Date.now(),
                    doneResult: doneResultRef.current || undefined,
                }
                : c
        );
        setConversations(updated);
        persistConversations(updated);
        setCurrentConversation(prev =>
            prev ? { ...prev, steps: stepsRef.current, updatedAt: Date.now(), doneResult: doneResultRef.current || undefined } : prev
        );
    }, [persistConversations]);

    // Subscribe to agent events
    useEffect(() => {
        const unsubscribe = BrowserAgent.onEvent((event: AgentEvent) => {
            if (taskIdRef.current && event.taskId !== taskIdRef.current) return;

            switch (event.type) {
                case 'agent:step-start': {
                    const stepNum = event.data?.step ?? event.stepNumber ?? 0;
                    setSteps(prev => {
                        if (prev.some(s => s.stepNumber === stepNum)) return prev;
                        return [...prev, {
                            stepNumber: stepNum,
                            actions: [],
                            status: 'thinking',
                        }];
                    });
                    break;
                }

                case 'agent:thinking': {
                    const stepNum = event.data?.step ?? event.stepNumber ?? 0;
                    setSteps(prev => prev.map(s =>
                        s.stepNumber === stepNum
                            ? {
                                ...s,
                                thinking: event.data?.thinking,
                                evaluation: event.data?.evaluation,
                                memory: event.data?.memory,
                                nextGoal: event.data?.nextGoal,
                                status: 'acting',
                            }
                            : s
                    ));
                    break;
                }

                case 'agent:action-executed': {
                    const stepNum = event.data?.step ?? event.stepNumber ?? 0;
                    const newAction: AgentStepAction = {
                        toolName: event.data?.toolName || 'unknown',
                        params: event.data?.params,
                        status: 'executing',
                    };
                    setSteps(prev => prev.map(s =>
                        s.stepNumber === stepNum
                            ? { ...s, actions: [...s.actions, newAction], status: 'acting' }
                            : s
                    ));
                    break;
                }

                case 'agent:step-complete': {
                    const stepNum = event.data?.step ?? event.stepNumber ?? 0;
                    setSteps(prev => {
                        const updated = prev.map(s =>
                            s.stepNumber === stepNum
                                ? {
                                    ...s,
                                    status: 'complete' as const,
                                    actions: s.actions.map(a =>
                                        a.status === 'executing' ? { ...a, status: 'done' as const } : a
                                    ),
                                }
                                : s
                        );
                        return updated;
                    });
                    // Persist after step complete
                    setTimeout(() => persistCurrentState(), 100);
                    break;
                }

                case 'agent:done': {
                    const result = {
                        success: event.data?.success ?? false,
                        result: event.data?.result,
                    };
                    setIsRunning(false);
                    setDoneResult(result);
                    setSteps(prev => prev.map(s =>
                        s.status !== 'complete' && s.status !== 'error'
                            ? {
                                ...s,
                                status: 'complete' as const,
                                actions: s.actions.map(a =>
                                    a.status === 'executing' ? { ...a, status: 'done' as const } : a
                                ),
                            }
                            : s
                    ));
                    // Persist final state
                    setTimeout(() => persistCurrentState(), 200);
                    break;
                }

                case 'agent:error': {
                    const stepNum = event.data?.step ?? event.stepNumber;
                    setError(event.data?.error || 'Unknown error');
                    if (event.data?.fatal) {
                        setIsRunning(false);
                    }
                    if (stepNum !== undefined) {
                        setSteps(prev => prev.map(s =>
                            s.stepNumber === stepNum ? { ...s, status: 'error' as const } : s
                        ));
                    }
                    break;
                }

                case 'agent:stopped': {
                    setIsRunning(false);
                    setTimeout(() => persistCurrentState(), 100);
                    break;
                }
            }
        });

        return unsubscribe;
    }, [persistCurrentState]);

    const startAgent = useCallback((task: string) => {
        if (isRunning) return;

        setSteps([]);
        setError(null);
        setDoneResult(null);
        setTaskDescription(task);
        setIsRunning(true);

        // Create new conversation
        const convoId = generateId();
        const newConvo: AgentConversation = {
            id: convoId,
            title: generateTitle(task),
            taskDescription: task,
            steps: [],
            model: agentModel,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
        const updatedConvos = [...conversationsRef.current, newConvo];
        setConversations(updatedConvos);
        setCurrentConversation(newConvo);
        persistConversations(updatedConvos);

        // Get API key and start
        chrome.storage.sync.get({ openaiApiKey: '' }, (data) => {
            const apiKey = data.openaiApiKey as string;
            if (!apiKey) {
                setError('Please set your OpenAI API key in extension options.');
                setIsRunning(false);
                return;
            }

            BrowserAgent.startTask(task, { apiKey, model: agentModel }).then(res => {
                if (res.success && res.taskId) {
                    setTaskId(res.taskId);
                } else {
                    setError(res.error || 'Failed to start agent');
                    setIsRunning(false);
                }
            });
        });
    }, [isRunning, agentModel, persistConversations]);

    const stopAgent = useCallback(() => {
        if (taskId) {
            BrowserAgent.stopTask(taskId);
        }
        setIsRunning(false);
    }, [taskId]);

    const startNewTask = useCallback(() => {
        setSteps([]);
        setTaskId(null);
        setTaskDescription(null);
        setCurrentConversation(null);
        setError(null);
        setDoneResult(null);
    }, []);

    const loadConversation = useCallback((id: string) => {
        const convo = conversationsRef.current.find(c => c.id === id);
        if (!convo) return;
        setCurrentConversation(convo);
        setSteps([...convo.steps]);
        setTaskDescription(convo.taskDescription);
        setDoneResult(convo.doneResult || null);
        setError(null);
        setTaskId(null);
        setIsRunning(false);
    }, []);

    const deleteConversation = useCallback((id: string) => {
        const updated = conversationsRef.current.filter(c => c.id !== id);
        setConversations(updated);
        persistConversations(updated);
        if (currentConvoRef.current?.id === id) {
            startNewTask();
        }
    }, [persistConversations, startNewTask]);

    const setAgentModel = useCallback((model: string) => {
        setAgentModelState(model);
        chrome.storage.sync.set({ agentModel: model });
    }, []);

    const clearError = useCallback(() => setError(null), []);

    return (
        <AgentContext.Provider value={{
            conversations,
            currentConversation,
            steps,
            isRunning,
            taskId,
            taskDescription,
            error,
            doneResult,
            agentModel,
            startAgent,
            stopAgent,
            startNewTask,
            loadConversation,
            deleteConversation,
            setAgentModel,
            clearError,
        }}>
            {children}
        </AgentContext.Provider>
    );
};
