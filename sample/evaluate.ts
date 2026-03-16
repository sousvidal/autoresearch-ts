/**
 * Evaluation harness for the sentiment classification experiment.
 * DO NOT MODIFY — this is the fixed metric.
 *
 * Fetches 40 examples from the rotten_tomatoes test split, sends each through
 * an LLM using the current prompt config, and reports accuracy.
 */

import { HfInference } from "@huggingface/inference";
import { fetchExamples } from "./dataset.js";
import { promptConfig } from "./prompt.js";

const HF_TOKEN = process.env.HF_TOKEN;
if (!HF_TOKEN) {
  console.error("Error: HF_TOKEN environment variable is required.");
  console.error("Get a free token at https://huggingface.co/settings/tokens");
  process.exit(1);
}

const MODEL = process.env.HF_MODEL ?? "mistralai/Mistral-7B-Instruct-v0.3";
const MAX_CONCURRENT = parseInt(process.env.EVAL_CONCURRENCY ?? "5", 10);
const EVAL_OFFSET = parseInt(process.env.EVAL_OFFSET ?? "0", 10);
const EVAL_LENGTH = parseInt(process.env.EVAL_LENGTH ?? "40", 10);

const hf = new HfInference(HF_TOKEN);

interface EvalResult {
  text: string;
  expected: string;
  predicted: string | null;
  correct: boolean;
  latencyMs: number;
}

async function classifyOne(text: string): Promise<{ label: string | null; latencyMs: number }> {
  const start = Date.now();
  try {
    const response = await hf.chatCompletion({
      model: MODEL,
      messages: [
        { role: "system", content: promptConfig.systemPrompt },
        { role: "user", content: promptConfig.buildUserMessage(text) },
      ],
      max_tokens: 20,
      temperature: 0.0,
    });

    const content = response.choices[0]?.message?.content ?? "";
    const label = promptConfig.parseResponse(content);
    return { label, latencyMs: Date.now() - start };
  } catch (err) {
    console.error(`  Warning: API call failed for "${text.slice(0, 40)}...": ${err instanceof Error ? err.message : String(err)}`);
    return { label: null, latencyMs: Date.now() - start };
  }
}

async function runBatch<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency: number,
): Promise<R[]> {
  const results: R[] = [];
  let idx = 0;

  async function worker(): Promise<void> {
    while (idx < items.length) {
      const currentIdx = idx++;
      results[currentIdx] = await fn(items[currentIdx]);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

async function main(): Promise<void> {
  console.log(`Model: ${MODEL}`);
  console.log(`Dataset: rotten_tomatoes test split (offset=${EVAL_OFFSET}, length=${EVAL_LENGTH})`);
  console.log(`Concurrency: ${MAX_CONCURRENT}`);
  console.log();

  process.stdout.write("Fetching eval examples... ");
  const evalExamples = await fetchExamples("test", EVAL_OFFSET, EVAL_LENGTH);
  console.log(`${evalExamples.length} examples loaded.\n`);

  const results: EvalResult[] = await runBatch(
    evalExamples,
    async (example) => {
      const { label, latencyMs } = await classifyOne(example.text);
      const correct = label === example.label;
      process.stdout.write(correct ? "." : "x");
      return {
        text: example.text,
        expected: example.label,
        predicted: label,
        correct,
        latencyMs,
      };
    },
    MAX_CONCURRENT,
  );

  console.log("\n");

  const correct = results.filter((r) => r.correct).length;
  const total = results.length;
  const accuracy = correct / total;
  const avgLatency = results.reduce((sum, r) => sum + r.latencyMs, 0) / total;
  const unparseable = results.filter((r) => r.predicted === null).length;

  const wrong = results.filter((r) => !r.correct);
  if (wrong.length > 0) {
    console.log("Misclassifications:");
    for (const r of wrong.slice(0, 10)) {
      console.log(
        `  expected=${r.expected} predicted=${r.predicted ?? "null"}: "${r.text.slice(0, 60)}..."`,
      );
    }
    if (wrong.length > 10) {
      console.log(`  ... and ${wrong.length - 10} more`);
    }
    console.log();
  }

  // Fixed output format — DO NOT CHANGE
  console.log("---");
  console.log(`accuracy:         ${accuracy.toFixed(4)}`);
  console.log(`total_examples:   ${total}`);
  console.log(`correct:          ${correct}`);
  console.log(`unparseable:      ${unparseable}`);
  console.log(`avg_latency_ms:   ${Math.round(avgLatency)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
