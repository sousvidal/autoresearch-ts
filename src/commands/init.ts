import * as p from "@clack/prompts";
import fs from "node:fs/promises";
import path from "node:path";
import chalk from "chalk";

export async function initCommand(): Promise<void> {
  p.intro(chalk.bold("autoresearch init"));

  const answers = await p.group(
    {
      targetFile: () =>
        p.text({
          message: "Target file (the file the agent will edit):",
          placeholder: "train.py",
          validate: (v) =>
            !v || v.trim().length === 0 ? "Required" : undefined,
        }),
      readonlyContext: () =>
        p.text({
          message: "Read-only context files (comma-separated, or empty):",
          placeholder: "prepare.py, README.md",
          initialValue: "",
        }),
      command: () =>
        p.text({
          message: "Experiment command:",
          placeholder: "python train.py",
          validate: (v) =>
            !v || v.trim().length === 0 ? "Required" : undefined,
        }),
      timeoutSeconds: () =>
        p.text({
          message: "Timeout per experiment (seconds):",
          initialValue: "600",
          validate: (v) =>
            isNaN(parseInt(v ?? "", 10)) ? "Must be a number" : undefined,
        }),
      metricName: () =>
        p.text({
          message: "Metric name:",
          placeholder: "val_bpb",
          validate: (v) =>
            !v || v.trim().length === 0 ? "Required" : undefined,
        }),
      metricPattern: () =>
        p.text({
          message: "Regex to extract metric (must have one capture group):",
          placeholder: "^val_bpb:\\s+([\\d.]+)",
          validate: (v) => {
            if (!v) return "Required";
            try {
              new RegExp(v, "m");
              return undefined;
            } catch {
              return "Invalid regex";
            }
          },
        }),
      metricDirection: () =>
        p.select({
          message: "Optimization direction:",
          options: [
            { value: "minimize", label: "Minimize (lower is better)" },
            { value: "maximize", label: "Maximize (higher is better)" },
          ],
        }),
      model: () =>
        p.text({
          message: "Claude model:",
          initialValue: "claude-sonnet-4-6",
        }),
      branchPrefix: () =>
        p.text({
          message: "Git branch prefix:",
          initialValue: "autoresearch",
        }),
    },
    {
      onCancel: () => {
        p.cancel("Setup cancelled.");
        process.exit(0);
      },
    },
  );

  const contextFiles = String(answers.readonlyContext ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const configContent = `import { type AutoresearchConfig } from "./src/types.js";

const config: AutoresearchConfig = {
  targetFile: ${JSON.stringify(answers.targetFile)},
  readonlyContext: ${JSON.stringify(contextFiles)},
  command: ${JSON.stringify(answers.command)},
  timeoutSeconds: ${answers.timeoutSeconds},
  metric: {
    name: ${JSON.stringify(answers.metricName)},
    pattern: /${String(answers.metricPattern)}/m,
    direction: ${JSON.stringify(answers.metricDirection)},
  },
  model: ${JSON.stringify(answers.model)},
  branchPrefix: ${JSON.stringify(answers.branchPrefix)},
  programFile: "program.md",
};

export default config;
`;

  const configPath = path.resolve("autoresearch.config.ts");
  await fs.writeFile(configPath, configContent, "utf-8");

  const programPath = path.resolve("program.md");
  try {
    await fs.access(programPath);
  } catch {
    const programTemplate = `# Research Program

## Goal

Improve the **${answers.metricName}** metric by modifying \`${answers.targetFile}\`.

## What to try

- Adjust hyperparameters
- Modify architecture or structure
- Try different strategies or algorithms
- Simplify where possible — if removing something gives equal results, that's a win

## Constraints

- Only modify \`${answers.targetFile}\`
- Keep changes focused — one idea per experiment
- Prefer clean, simple changes over complex hacks
`;
    await fs.writeFile(programPath, programTemplate, "utf-8");
    p.log.success("Created program.md");
  }

  p.log.success("Created autoresearch.config.ts");
  p.outro(
    chalk.green("Ready! Run `npx tsx src/index.ts run --tag <name>` to start."),
  );
}
