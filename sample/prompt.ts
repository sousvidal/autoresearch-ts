/**
 * Prompt configuration for sentiment classification.
 * THIS IS THE FILE THE AGENT EDITS.
 *
 * The agent can modify anything here: the system prompt, few-shot examples,
 * output format, classification strategy, chain-of-thought instructions, etc.
 */

import { fewShotExamples, type Example } from "./dataset.js";

export interface PromptConfig {
  systemPrompt: string;
  buildUserMessage: (text: string) => string;
  parseResponse: (response: string) => "positive" | "negative" | null;
}

const selectedExamples: Example[] = fewShotExamples.slice(0, 4);

function formatExamples(): string {
  return selectedExamples
    .map((ex) => `Text: "${ex.text}"\nSentiment: ${ex.label}`)
    .join("\n\n");
}

export const promptConfig: PromptConfig = {
  systemPrompt: `You are a sentiment classifier. Given a movie review, classify it as "positive" or "negative".

Here are some examples:

${formatExamples()}

Respond with exactly one word: "positive" or "negative".`,

  buildUserMessage(text: string): string {
    return `Text: "${text}"\nSentiment:`;
  },

  parseResponse(response: string): "positive" | "negative" | null {
    const lower = response.trim().toLowerCase();
    if (lower.includes("positive")) return "positive";
    if (lower.includes("negative")) return "negative";
    return null;
  },
};
