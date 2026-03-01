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

// ============================================================
// Context Type
// ============================================================

interface AgentContextType {
    // State
    steps: AgentStep[];
    isRunning: boolean;
    taskId: string | null;
    taskDescription: string | null;
    error: string | null;
    doneResult: { success: boolean; result?: string } | null;

    // Actions
    startAgent: (task: string) => void;
    stopAgent: () => void;
    clearSteps: () => void;
    clearError: () => void;
}

const AgentContext = createContext<AgentContextType | undefined>(undefined);

export const useAgentContext = () => {
    const ctx = useContext(AgentContext);
    if (!ctx) throw new Error('useAgentContext must be used within AgentProvider');
    return ctx;
};

// ============================================================
// Provider
// ============================================================

export const AgentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [steps, setSteps] = useState<AgentStep[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const [taskId, setTaskId] = useState<string | null>(null);
    const [taskDescription, setTaskDescription] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [doneResult, setDoneResult] = useState<{ success: boolean; result?: string } | null>(null);

    const taskIdRef = useRef(taskId);
    taskIdRef.current = taskId;

    // Subscribe to agent events
    useEffect(() => {
        const unsubscribe = BrowserAgent.onEvent((event: AgentEvent) => {
            // Ignore events from other tasks
            if (taskIdRef.current && event.taskId !== taskIdRef.current) return;

            switch (event.type) {
                case 'agent:step-start': {
                    const stepNum = event.data?.step ?? event.stepNumber ?? 0;
                    setSteps(prev => {
                        // Only add if this step doesn't exist yet
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
                    setSteps(prev => prev.map(s =>
                        s.stepNumber === stepNum
                            ? {
                                ...s,
                                status: 'complete',
                                actions: s.actions.map(a =>
                                    a.status === 'executing' ? { ...a, status: 'done' as const } : a
                                ),
                            }
                            : s
                    ));
                    break;
                }

                case 'agent:done': {
                    setIsRunning(false);
                    setDoneResult({
                        success: event.data?.success ?? false,
                        result: event.data?.result,
                    });
                    // Mark all pending actions as done
                    setSteps(prev => prev.map(s =>
                        s.status !== 'complete' && s.status !== 'error'
                            ? {
                                ...s,
                                status: 'complete',
                                actions: s.actions.map(a =>
                                    a.status === 'executing' ? { ...a, status: 'done' as const } : a
                                ),
                            }
                            : s
                    ));
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
                            s.stepNumber === stepNum
                                ? { ...s, status: 'error' }
                                : s
                        ));
                    }
                    break;
                }

                case 'agent:stopped': {
                    setIsRunning(false);
                    break;
                }
            }
        });

        return unsubscribe;
    }, []);

    const startAgent = useCallback((task: string) => {
        if (isRunning) return;

        setSteps([]);
        setError(null);
        setDoneResult(null);
        setTaskDescription(task);
        setIsRunning(true);

        // Get API key and start
        chrome.storage.sync.get({ openaiApiKey: '' }, (data) => {
            const apiKey = data.openaiApiKey as string;
            if (!apiKey) {
                setError('Please set your OpenAI API key in extension options.');
                setIsRunning(false);
                return;
            }

            BrowserAgent.startTask(task, { apiKey }).then(res => {
                if (res.success && res.taskId) {
                    setTaskId(res.taskId);
                } else {
                    setError(res.error || 'Failed to start agent');
                    setIsRunning(false);
                }
            });
        });
    }, [isRunning]);

    const stopAgent = useCallback(() => {
        if (taskId) {
            BrowserAgent.stopTask(taskId);
        }
        setIsRunning(false);
    }, [taskId]);

    const clearSteps = useCallback(() => {
        setSteps([]);
        setTaskId(null);
        setTaskDescription(null);
        setError(null);
        setDoneResult(null);
    }, []);

    const clearError = useCallback(() => setError(null), []);

    return (
        <AgentContext.Provider value={{
            steps,
            isRunning,
            taskId,
            taskDescription,
            error,
            doneResult,
            startAgent,
            stopAgent,
            clearSteps,
            clearError,
        }}>
            {children}
        </AgentContext.Provider>
    );
};
