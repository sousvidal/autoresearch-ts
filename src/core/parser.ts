import type { MetricConfig, RunOutput } from "../types.js";

export interface ParsedMetric {
  value: number;
  raw: string;
}

export function parseMetric(
  output: RunOutput,
  metric: MetricConfig,
): ParsedMetric | null {
  const combined = output.stdout + "\n" + output.stderr;
  const match = combined.match(metric.pattern);

  if (!match || !match[1]) {
    return null;
  }

  const value = parseFloat(match[1]);
  if (isNaN(value)) {
    return null;
  }

  return { value, raw: match[0] };
}

export function isBetter(
  current: number,
  best: number,
  direction: "minimize" | "maximize",
): boolean {
  if (direction === "minimize") {
    return current < best;
  }
  return current > best;
}
