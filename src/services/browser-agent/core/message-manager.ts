// Browser Agent - Message Manager
// Manages conversation history and compaction for LLM calls

import type {
    HistoryItem,
    LLMMessage,
    AgentBrain,
    AgentActionResult,
    AgentStepInfo,
    BrowserStateSummary,
    LLMTextContent,
    LLMImageContent,
} from '../types/agent-types';
import { historyItemToString } from '../types/agent-types';
import { buildSystemPrompt, buildStateMessage, buildBudgetWarning } from '../utils/agent-prompt';

// ============================================================
// Message Manager
// ============================================================

export class MessageManager {
    private task: string;
    private systemPromptText: string;
    private historyItems: HistoryItem[] = [];
    private compactedMemory: string | null = null;
    private compactionCount: number = 0;
    private lastCompactionStep: number | null = null;
    private maxActionsPerStep: number;

    constructor(task: string, maxActionsPerStep: number = 5) {
        this.task = task;
        this.maxActionsPerStep = maxActionsPerStep;
        this.systemPromptText = buildSystemPrompt(maxActionsPerStep);
        // Initialize with a step-0 item
        this.historyItems.push({
            stepNumber: 0,
            systemMessage: 'Agent initialized',
        });
    }

    /**
     * Add a history item from the latest step's LLM output + action results
     */
    addStepResult(
        stepNumber: number,
        modelOutput: AgentBrain | null,
        results: AgentActionResult[],
    ): void {
        if (!modelOutput) {
            // Model failed to produce output
            this.historyItems.push({
                stepNumber,
                error: 'Agent failed to output valid JSON.',
            });
            return;
        }

        // Build action results description
        let actionResultsStr = '';
        const imageUrls: string[] = [];
        for (const result of results) {
            if (result.error) {
                const errorText = result.error.length > 200
                    ? result.error.slice(0, 100) + '...' + result.error.slice(-100)
                    : result.error;
                actionResultsStr += `[${result.toolName}] Error: ${errorText}\n`;
            } else if (result.isDone) {
                actionResultsStr += `[done] Task completed. Success: ${result.success}\n`;
                if (result.extractedContent) {
                    actionResultsStr += `Result: ${result.extractedContent.slice(0, 500)}\n`;
                }
            } else if (result.extractedImage) {
                actionResultsStr += `[${result.toolName}] ${result.description || 'Captured image'}\n`;
                imageUrls.push(result.extractedImage);
            } else if (result.description) {
                actionResultsStr += `[${result.toolName}] ${result.description}\n`;
            } else if (result.extractedContent) {
                actionResultsStr += `[${result.toolName}] ${result.extractedContent.slice(0, 300)}\n`;
            } else {
                actionResultsStr += `[${result.toolName}] OK\n`;
            }
        }

        this.historyItems.push({
            stepNumber,
            evaluation: modelOutput.evaluation_previous_goal,
            memory: modelOutput.memory,
            nextGoal: modelOutput.next_goal,
            actionResults: actionResultsStr.trim() ? `Result:\n${actionResultsStr.trim()}` : undefined,
            imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
        });
    }

    /**
     * Get the agent history description content for the LLM
     */
    getAgentHistoryContent(): (LLMTextContent | LLMImageContent)[] {
        const content: (LLMTextContent | LLMImageContent)[] = [];
        if (this.compactedMemory) {
            content.push({ type: 'text', text: `<compacted_memory>\n${this.compactedMemory}\n</compacted_memory>\n` });
        }

        for (const item of this.historyItems) {
            content.push({ type: 'text', text: historyItemToString(item) });
            if (item.imageUrls) {
                for (const url of item.imageUrls) {
                    content.push({
                        type: 'image_url',
                        image_url: { url, detail: 'auto' },
                    });
                }
            }
        }
        return content;
    }

    /**
     * Build the final messages array for the LLM call
     */
    buildMessages(
        browserState: BrowserStateSummary,
        stepInfo: AgentStepInfo,
        nudgeMessages: string[] = [],
    ): LLMMessage[] {
        // Add budget warning if applicable
        const budgetWarning = buildBudgetWarning(stepInfo);
        const allNudges = [...nudgeMessages];
        if (budgetWarning) allNudges.push(budgetWarning);

        // System message
        const systemMsg: LLMMessage = {
            role: 'system',
            content: this.systemPromptText,
        };

        // User message with all state
        const userMsg = buildStateMessage(
            browserState,
            this.getAgentHistoryContent(),
            this.task,
            stepInfo,
            allNudges,
        );

        return [systemMsg, userMsg];
    }

    /**
     * Compact history if it's too long.
     * Uses the LLM to summarize old history items.
     */
    async maybeCompact(
        apiKey: string,
        model: string,
        stepNumber: number,
        compactEveryNSteps: number,
        triggerChars: number,
    ): Promise<boolean> {
        // Step cadence gate
        const stepsSince = stepNumber - (this.lastCompactionStep ?? 0);
        if (stepsSince < compactEveryNSteps) return false;

        // Char floor gate
        const fullText = this.historyItems.map(i => historyItemToString(i)).join('\n');
        if (fullText.length < triggerChars) return false;

        console.log(`🗜️ Compacting history (items=${this.historyItems.length}, chars=${fullText.length})`);

        // Build compaction input
        let compactionInput = '';
        if (this.compactedMemory) {
            compactionInput += `<previous_compacted_memory>\n${this.compactedMemory}\n</previous_compacted_memory>\n\n`;
        }
        compactionInput += `<agent_history>\n${fullText}\n</agent_history>`;

        const compactionSystemPrompt =
            'You are summarizing an agent run for prompt compaction.\n' +
            'Capture task requirements, key facts, decisions, partial progress, errors, and next steps.\n' +
            'Preserve important entities, values, URLs, and file paths.\n' +
            'Return plain text only. Do not include tool calls or JSON. Keep under 6000 characters.';

        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model,
                    messages: [
                        { role: 'system', content: compactionSystemPrompt },
                        { role: 'user', content: compactionInput },
                    ],
                    temperature: 0.3,
                    max_tokens: 2000,
                }),
            });

            if (!response.ok) {
                console.warn('Compaction LLM call failed:', response.status);
                return false;
            }

            const data = await response.json();
            const summary = data.choices?.[0]?.message?.content?.trim();
            if (!summary) return false;

            this.compactedMemory = summary.length > 6000
                ? summary.slice(0, 6000) + '…'
                : summary;
            this.compactionCount++;
            this.lastCompactionStep = stepNumber;

            // Keep first item + last 6 items
            const keepLast = 6;
            if (this.historyItems.length > keepLast + 1) {
                this.historyItems = [this.historyItems[0], ...this.historyItems.slice(-keepLast)];
            }

            console.log(`🗜️ Compaction complete (summary=${this.compactedMemory?.length ?? 0} chars, items=${this.historyItems.length})`);
            return true;
        } catch (e: any) {
            console.warn('Compaction failed:', e.message);
            return false;
        }
    }
}
