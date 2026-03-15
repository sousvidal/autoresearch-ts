import { query } from "@anthropic-ai/claude-agent-sdk";
import type {
  SDKResultSuccess,
  SDKMessage,
  SDKAssistantMessage,
} from "@anthropic-ai/claude-agent-sdk";
import fs from "node:fs/promises";
import path from "node:path";
import chalk from "chalk";
import type { AutoresearchConfig, ExperimentResult } from "../types.js";

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthenticationError";
  }
}

export interface AgentResult {
  description: string;
  totalCostUsd: number;
  inputTokens: number;
  outputTokens: number;
}

export async function proposeChange(
  config: AutoresearchConfig,
  results: ExperimentResult[],
  abortController?: AbortController,
): Promise<AgentResult> {
  const systemPrompt = await buildSystemPrompt(config, results);

  const contextFilesList = config.readonlyContext
    .map((f) => `- ${f}`)
    .join("\n");

  const prompt = [
    `Your task: propose and apply ONE experimental change to improve the "${config.metric.name}" metric.`,
    ``,
    `Target file (the ONLY file you may edit): ${config.targetFile}`,
    contextFilesList
      ? `\nContext files (read-only, for reference):\n${contextFilesList}`
      : "",
    ``,
    `Steps:`,
    `1. Read the target file${config.readonlyContext.length > 0 ? " and context files" : ""} to understand the current state`,
    `2. Decide on ONE specific change to try`,
    `3. Apply the edit to ${config.targetFile}`,
    `4. Respond with a brief one-line description of what you changed and why`,
    ``,
    `IMPORTANT: Only edit ${config.targetFile}. Do NOT edit any other files. Do NOT run any commands.`,
  ]
    .filter(Boolean)
    .join("\n");

  let description = "unknown change";
  let resultMsg: SDKResultSuccess | null = null;

  for await (const message of query({
    prompt,
    options: {
      allowedTools: ["Read", "Edit", "Glob"],
      permissionMode: "acceptEdits",
      systemPrompt,
      model: config.model,
      maxTurns: 15,
      abortController,
    },
  })) {
    checkAuthError(message);
    logStreamMessage(message);

    if (message.type === "result" && message.subtype === "success") {
      resultMsg = message;
      if (message.result) {
        description = extractDescription(message.result);
      }
    }

    if (message.type === "result" && message.subtype !== "success") {
      const errors = "errors" in message ? (message.errors as string[]) : [];
      throw new Error(
        `Agent failed: ${message.subtype}${errors.length > 0 ? ` — ${errors.join(", ")}` : ""}`,
      );
    }
  }

  return {
    description,
    totalCostUsd: resultMsg?.total_cost_usd ?? 0,
    inputTokens: resultMsg?.usage.input_tokens ?? 0,
    outputTokens: resultMsg?.usage.output_tokens ?? 0,
  };
}

export async function attemptCrashFix(
  config: AutoresearchConfig,
  errorOutput: string,
  abortController?: AbortController,
): Promise<AgentResult> {
  const prompt = [
    `The previous experiment crashed with the following error:`,
    "```",
    errorOutput.slice(-2000),
    "```",
    ``,
    `Please fix the issue in ${config.targetFile}. Read the file, diagnose the problem, and apply a fix.`,
    `Only edit ${config.targetFile}. Do NOT run any commands.`,
    `Respond with a brief description of what you fixed.`,
  ].join("\n");

  let description = "crash fix attempt";
  let resultMsg: SDKResultSuccess | null = null;

  for await (const message of query({
    prompt,
    options: {
      allowedTools: ["Read", "Edit"],
      permissionMode: "acceptEdits",
      model: config.model,
      maxTurns: 10,
      abortController,
    },
  })) {
    checkAuthError(message);
    logStreamMessage(message);

    if (message.type === "result" && message.subtype === "success") {
      resultMsg = message;
      if (message.result) {
        description = extractDescription(message.result);
      }
    }

    if (message.type === "result" && message.subtype !== "success") {
      throw new Error(`Crash fix agent failed: ${message.subtype}`);
    }
  }

  return {
    description,
    totalCostUsd: resultMsg?.total_cost_usd ?? 0,
    inputTokens: resultMsg?.usage.input_tokens ?? 0,
    outputTokens: resultMsg?.usage.output_tokens ?? 0,
  };
}

async function buildSystemPrompt(
  config: AutoresearchConfig,
  results: ExperimentResult[],
): Promise<string> {
  const programContent = await fs.readFile(
    path.resolve(config.programFile),
    "utf-8",
  );

  const direction = config.metric.direction === "minimize" ? "lower" : "higher";
  const bestResult = findBestResult(results, config.metric.direction);

  const sections: string[] = [
    `# Research Instructions\n\n${programContent}`,
    `# Metric\n\nYou are optimizing: **${config.metric.name}** (${direction} is better)`,
  ];

  if (bestResult) {
    sections.push(
      `Current best ${config.metric.name}: ${bestResult.metricValue}`,
    );
  }

  if (results.length > 0) {
    const recentCount = 20;
    const recent = results.slice(-recentCount);
    const olderCount = results.length - recent.length;

    let historySection = "# Experiment History\n\n";
    if (olderCount > 0) {
      const olderBest = findBestResult(
        results.slice(0, olderCount),
        config.metric.direction,
      );
      historySection += `(${olderCount} earlier experiments omitted; best was ${config.metric.name}=${olderBest?.metricValue ?? "N/A"})\n\n`;
    }
    historySection += "| # | commit | metric | status | description |\n";
    historySection += "|---|--------|--------|--------|-------------|\n";
    for (let i = 0; i < recent.length; i++) {
      const r = recent[i];
      const num = olderCount + i + 1;
      historySection += `| ${num} | ${r.commit} | ${r.metricValue.toFixed(6)} | ${r.status} | ${r.description} |\n`;
    }
    sections.push(historySection);
  }

  sections.push(
    [
      "# Constraints",
      `- ONLY edit the file: ${config.targetFile}`,
      "- Do NOT create new files",
      "- Do NOT run shell commands",
      "- Make ONE focused change per experiment",
      "- Prefer simple, clean changes over complex hacks",
      "- If a small improvement adds ugly complexity, it's not worth it",
      "- If removing code yields equal or better results, that's a win",
    ].join("\n"),
  );

  return sections.join("\n\n");
}

function findBestResult(
  results: ExperimentResult[],
  direction: "minimize" | "maximize",
): ExperimentResult | null {
  const kept = results.filter((r) => r.status === "keep" && r.metricValue > 0);
  if (kept.length === 0) return null;
  return kept.reduce((best, r) =>
    direction === "minimize"
      ? r.metricValue < best.metricValue
        ? r
        : best
      : r.metricValue > best.metricValue
        ? r
        : best,
  );
}

function extractDescription(text: string): string {
  const lines = text.trim().split("\n");
  const last = lines[lines.length - 1].trim();
  const cleaned = last
    .replace(/^(description|summary|change):\s*/i, "")
    .replace(/^[-*•]\s*/, "")
    .slice(0, 200);
  return cleaned || "unknown change";
}

function checkAuthError(message: SDKMessage): void {
  if (
    message.type === "assistant" &&
    (message as SDKAssistantMessage).error === "authentication_failed"
  ) {
    throw new AuthenticationError(
      `Invalid ANTHROPIC_API_KEY. Verify your key at https://console.anthropic.com/settings/keys`,
    );
  }
}

function logStreamMessage(message: SDKMessage): void {
  if (message.type === "assistant" && message.message?.content) {
    for (const block of message.message.content) {
      if ("text" in block && typeof block.text === "string") {
        process.stdout.write(chalk.dim(block.text));
      } else if ("name" in block && typeof block.name === "string") {
        process.stdout.write(chalk.cyan(`\n  [tool: ${block.name}] `));
      }
    }
  }
}
