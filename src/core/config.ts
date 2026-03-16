import { pathToFileURL } from "node:url";
import path from "node:path";
import fs from "node:fs/promises";
import { z } from "zod";
import type { AutoresearchConfig } from "../types.js";

const ConfigSchema = z.object({
  targetFile: z.string().min(1),
  readonlyContext: z.array(z.string()).default([]),
  command: z.string().min(1),
  timeoutSeconds: z.number().positive().default(600),
  metric: z.object({
    name: z.string().min(1),
    pattern: z.instanceof(RegExp),
    direction: z.enum(["minimize", "maximize"]),
  }),
  model: z.string().default("claude-sonnet-4-6"),
  branchPrefix: z.string().default("autoresearch"),
  programFile: z.string().min(1),
});

export interface LoadConfigResult {
  config: AutoresearchConfig;
  cwd: string;
}

export async function loadConfig(
  configPath?: string,
): Promise<LoadConfigResult> {
  const resolved = path.resolve(configPath ?? "autoresearch.config.ts");
  const cwd = path.dirname(resolved);

  try {
    await fs.access(resolved);
  } catch {
    throw new Error(`Config file not found: ${resolved}`);
  }

  const fileUrl = pathToFileURL(resolved).href;
  const mod = (await import(fileUrl)) as { default: unknown };
  const parsed = ConfigSchema.parse(mod.default);

  const targetExists = await fs
    .access(path.resolve(cwd, parsed.targetFile))
    .then(() => true)
    .catch(() => false);
  if (!targetExists) {
    throw new Error(`Target file not found: ${parsed.targetFile}`);
  }

  const programExists = await fs
    .access(path.resolve(cwd, parsed.programFile))
    .then(() => true)
    .catch(() => false);
  if (!programExists) {
    throw new Error(`Program file not found: ${parsed.programFile}`);
  }

  return { config: parsed, cwd };
}
