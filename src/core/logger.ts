import fs from "node:fs/promises";
import path from "node:path";
import type { ExperimentResult, ExperimentStatus } from "../types.js";

const TSV_HEADER = "commit\tmetric_value\tstatus\ttokens_used\tdescription";
const TSV_FILE = "results.tsv";

export async function initResultsFile(dir?: string): Promise<void> {
  const filePath = path.resolve(dir ?? ".", TSV_FILE);
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, TSV_HEADER + "\n", "utf-8");
  }
}

export async function readResults(dir?: string): Promise<ExperimentResult[]> {
  const filePath = path.resolve(dir ?? ".", TSV_FILE);
  try {
    const content = await fs.readFile(filePath, "utf-8");
    const lines = content.trim().split("\n").slice(1); // skip header
    return lines.filter((line) => line.trim().length > 0).map(parseLine);
  } catch {
    return [];
  }
}

export async function appendResult(
  result: ExperimentResult,
  dir?: string,
): Promise<void> {
  const filePath = path.resolve(dir ?? ".", TSV_FILE);
  const line = [
    result.commit,
    result.metricValue.toFixed(6),
    result.status,
    result.tokensUsed.toString(),
    result.description.replace(/\t/g, " ").replace(/\n/g, " "),
  ].join("\t");

  await fs.appendFile(filePath, line + "\n", "utf-8");
}

function parseLine(line: string): ExperimentResult {
  const parts = line.split("\t");
  return {
    commit: parts[0] ?? "",
    metricValue: parseFloat(parts[1] ?? "0"),
    status: (parts[2] ?? "crash") as ExperimentStatus,
    tokensUsed: parseInt(parts[3] ?? "0", 10),
    description: parts[4] ?? "",
  };
}

export interface ResultsSummary {
  total: number;
  kept: number;
  discarded: number;
  crashed: number;
  bestMetric: number | null;
  bestCommit: string | null;
  totalTokens: number;
  results: ExperimentResult[];
}

export function summarizeResults(
  results: ExperimentResult[],
  direction: "minimize" | "maximize",
): ResultsSummary {
  const kept = results.filter((r) => r.status === "keep");
  const discarded = results.filter((r) => r.status === "discard");
  const crashed = results.filter((r) => r.status === "crash");
  const totalTokens = results.reduce((sum, r) => sum + r.tokensUsed, 0);

  let bestMetric: number | null = null;
  let bestCommit: string | null = null;

  for (const r of kept) {
    if (r.metricValue === 0) continue;
    if (bestMetric === null) {
      bestMetric = r.metricValue;
      bestCommit = r.commit;
    } else if (direction === "minimize" && r.metricValue < bestMetric) {
      bestMetric = r.metricValue;
      bestCommit = r.commit;
    } else if (direction === "maximize" && r.metricValue > bestMetric) {
      bestMetric = r.metricValue;
      bestCommit = r.commit;
    }
  }

  return {
    total: results.length,
    kept: kept.length,
    discarded: discarded.length,
    crashed: crashed.length,
    bestMetric,
    bestCommit,
    totalTokens,
    results,
  };
}
