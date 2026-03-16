/**
 * Prompt configuration for sentiment classification.
 * THIS IS THE FILE THE AGENT EDITS.
 *
 * The agent can modify anything here: the system prompt, few-shot examples,
 * output format, classification strategy, chain-of-thought instructions, etc.
 *
 * The eval dataset is rotten_tomatoes (real critic reviews — terse and nuanced).
 */

export interface PromptConfig {
  systemPrompt: string;
  buildUserMessage: (text: string) => string;
  parseResponse: (response: string) => "positive" | "negative" | null;
}

const examples = [
  { text: "a stirring , funny and finally transporting re-imagining of beauty and the beast and 1930s horror films", label: "positive" },
  { text: "petter næss achieves the near-impossible feat of making a film about mental illness that is hopeful , even funny .", label: "positive" },
  { text: "bad . very very bad .", label: "negative" },
  { text: "a loud , dumb and irritating movie", label: "negative" },
];

function formatExamples(): string {
  return examples
    .map((ex) => `Review: "${ex.text}"\nSentiment: ${ex.label}`)
    .join("\n\n");
}

export const promptConfig: PromptConfig = {
  systemPrompt: `Classify movie reviews as "positive" or "negative".

Examples:

${formatExamples()}

Respond with exactly one word: "positive" or "negative".`,

  buildUserMessage(text: string): string {
    return `Review: "${text}"\nSentiment:`;
  },

  parseResponse(response: string): "positive" | "negative" | null {
    const lower = response.trim().toLowerCase();
    if (lower.includes("positive")) return "positive";
    if (lower.includes("negative")) return "negative";
    return null;
  },
};
