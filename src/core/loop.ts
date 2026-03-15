import chalk from "chalk";
import type {
  AutoresearchConfig,
  ExperimentResult,
  RunOutput,
} from "../types.js";
import { proposeChange, attemptCrashFix, AuthenticationError } from "./agent.js";
import * as git from "./git.js";
import { runExperiment } from "./runner.js";
import { parseMetric, isBetter } from "./parser.js";
import { initResultsFile, readResults, appendResult } from "./logger.js";

interface LoopOptions {
  tag: string;
  config: AutoresearchConfig;
}

type EvalOutcome =
  | { ok: true; metricValue: number; output: RunOutput }
  | {
      ok: false;
      reason: "timeout" | "crash" | "no-metric";
      output: RunOutput;
    };

let shuttingDown = false;

export async function startLoop(opts: LoopOptions): Promise<void> {
  const { tag, config } = opts;
  const branchName = `${config.branchPrefix}/${tag}`;

  const abortController = new AbortController();
  setupShutdownHandler(abortController);

  await git.ensureRepo();
  await git.ensureClean();
  await git.createBranch(branchName);
  await initResultsFile();

  console.log(chalk.bold(`\nBranch: ${branchName}`));
  console.log(chalk.bold(`Target: ${config.targetFile}`));
  console.log(
    chalk.bold(`Metric: ${config.metric.name} (${config.metric.direction})`),
  );
  console.log(chalk.bold(`Command: ${config.command}`));
  console.log(chalk.bold(`Timeout: ${config.timeoutSeconds}s\n`));

  // --- Baseline run ---
  console.log(chalk.yellow("=== Baseline run (no modifications) ===\n"));
  const baselineOutcome = await runAndEvaluate(config);

  if (!baselineOutcome.ok) {
    const desc =
      baselineOutcome.reason === "timeout"
        ? "baseline (timed out)"
        : baselineOutcome.reason === "no-metric"
          ? "baseline (metric not found)"
          : "baseline (crashed)";
    await appendResult({
      commit: "baseline",
      metricValue: 0,
      status: "crash",
      tokensUsed: 0,
      description: desc,
    });
    console.log(
      chalk.red(
        "Baseline run failed. Fix the experiment command before continuing.",
      ),
    );
    return;
  }

  await appendResult({
    commit: "baseline",
    metricValue: baselineOutcome.metricValue,
    status: "keep",
    tokensUsed: 0,
    description: "baseline",
  });

  let bestMetric = baselineOutcome.metricValue;
  console.log(
    chalk.green(
      `\nBaseline ${config.metric.name}: ${bestMetric.toFixed(6)}\n`,
    ),
  );

  // --- Experiment loop ---
  let experimentNum = 1;

  while (!shuttingDown) {
    console.log(chalk.yellow(`\n=== Experiment #${experimentNum} ===\n`));

    const results = await readResults();
    let committed = false;

    try {
      // 1. Ask Claude to propose and apply a change
      console.log(chalk.cyan("Asking Claude to propose a change...\n"));
      const agentResult = await proposeChange(
        config,
        results,
        abortController,
      );
      const totalTokens = agentResult.inputTokens + agentResult.outputTokens;
      console.log(
        chalk.dim(
          `\n\nAgent: ${agentResult.description} (cost: $${agentResult.totalCostUsd.toFixed(4)})\n`,
        ),
      );

      if (shuttingDown) break;

      // 2. Check if the agent actually made changes
      const changed = await git.hasChanges();
      if (!changed) {
        console.log(chalk.yellow("Agent made no changes. Skipping.\n"));
        experimentNum++;
        continue;
      }

      // 3. Commit the change
      const commitHash = await git.commitAll(
        `experiment: ${agentResult.description.slice(0, 72)}`,
      );
      committed = true;
      console.log(chalk.dim(`Committed: ${commitHash}\n`));

      // 4. Run the experiment
      console.log(chalk.cyan("Running experiment...\n"));
      const outcome = await runAndEvaluate(config);

      if (shuttingDown) break;

      if (!outcome.ok) {
        // Crash — attempt one fix
        console.log(chalk.red("Experiment crashed. Attempting fix...\n"));
        const fixResult = await handleCrash(
          config,
          commitHash,
          agentResult,
          outcome.output,
          abortController,
        );
        committed = false;

        if (!fixResult) {
          experimentNum++;
          continue;
        }

        if (
          isBetter(fixResult.metricValue, bestMetric, config.metric.direction)
        ) {
          bestMetric = fixResult.metricValue;
          await appendResult({ ...fixResult, status: "keep" });
          console.log(
            chalk.green(
              `New best ${config.metric.name}: ${bestMetric.toFixed(6)}\n`,
            ),
          );
        } else {
          console.log(
            chalk.red(
              `No improvement (${fixResult.metricValue.toFixed(6)} vs best ${bestMetric.toFixed(6)}). Reverting.\n`,
            ),
          );
          await revertToLastKept(results);
          await appendResult({ ...fixResult, status: "discard" });
        }
      } else if (
        isBetter(outcome.metricValue, bestMetric, config.metric.direction)
      ) {
        // Improved — keep
        bestMetric = outcome.metricValue;
        await appendResult({
          commit: commitHash,
          metricValue: outcome.metricValue,
          status: "keep",
          tokensUsed: totalTokens,
          description: agentResult.description,
        });
        committed = false;
        console.log(
          chalk.green(
            `New best ${config.metric.name}: ${bestMetric.toFixed(6)}\n`,
          ),
        );
      } else {
        // No improvement — discard
        console.log(
          chalk.red(
            `No improvement (${outcome.metricValue.toFixed(6)} vs best ${bestMetric.toFixed(6)}). Reverting.\n`,
          ),
        );
        await git.resetHard();
        committed = false;
        await appendResult({
          commit: commitHash,
          metricValue: outcome.metricValue,
          status: "discard",
          tokensUsed: totalTokens,
          description: agentResult.description,
        });
      }
    } catch (err) {
      if (shuttingDown) break;
      if (err instanceof AuthenticationError) {
        console.error(chalk.red(`\n${err.message}\n`));
        process.exit(1);
      }
      console.log(
        chalk.red(
          `Error in experiment loop: ${err instanceof Error ? err.message : String(err)}\n`,
        ),
      );
      try {
        if (committed) {
          await git.resetHard();
        } else {
          const changed = await git.hasChanges();
          if (changed) {
            await git.resetHard(await git.getCurrentCommit());
          }
        }
      } catch {
        // ignore cleanup errors
      }
    }

    experimentNum++;
  }

  console.log(
    chalk.yellow(
      `\nShutting down gracefully. Best ${config.metric.name}: ${bestMetric.toFixed(6)}\n`,
    ),
  );
}

async function runAndEvaluate(
  config: AutoresearchConfig,
): Promise<EvalOutcome> {
  const output = await runExperiment(config.command, config.timeoutSeconds);

  if (output.timedOut) {
    console.log(chalk.red("Experiment timed out."));
    return { ok: false, reason: "timeout", output };
  }

  if (output.exitCode !== 0) {
    console.log(chalk.red(`Experiment exited with code ${output.exitCode}.`));
    return { ok: false, reason: "crash", output };
  }

  const parsed = parseMetric(output, config.metric);
  if (!parsed) {
    console.log(
      chalk.red(
        `Could not parse metric "${config.metric.name}" from output.`,
      ),
    );
    return { ok: false, reason: "no-metric", output };
  }

  return { ok: true, metricValue: parsed.value, output };
}

async function handleCrash(
  config: AutoresearchConfig,
  originalCommit: string,
  agentResult: {
    description: string;
    inputTokens: number;
    outputTokens: number;
  },
  failedOutput: RunOutput,
  abortController: AbortController,
): Promise<Omit<ExperimentResult, "status"> | null> {
  const totalTokens = agentResult.inputTokens + agentResult.outputTokens;

  try {
    const errorText = failedOutput.stdout + "\n" + failedOutput.stderr;

    const fixResult = await attemptCrashFix(
      config,
      errorText,
      abortController,
    );

    const changed = await git.hasChanges();
    if (!changed) {
      console.log(chalk.red("Fix attempt made no changes. Giving up.\n"));
      await git.resetHard();
      await appendResult({
        commit: originalCommit,
        metricValue: 0,
        status: "crash",
        tokensUsed: totalTokens,
        description: `${agentResult.description} (crashed)`,
      });
      return null;
    }

    const fixCommit = await git.commitAll(
      `fix: ${fixResult.description.slice(0, 72)}`,
    );

    console.log(chalk.cyan("Re-running experiment after fix...\n"));
    const rerunOutput = await runExperiment(
      config.command,
      config.timeoutSeconds,
    );

    if (rerunOutput.exitCode !== 0 || rerunOutput.timedOut) {
      console.log(chalk.red("Still failing after fix. Reverting.\n"));
      await git.resetHard(`${originalCommit}~1`);
      await appendResult({
        commit: originalCommit,
        metricValue: 0,
        status: "crash",
        tokensUsed: totalTokens,
        description: `${agentResult.description} (crashed, fix failed)`,
      });
      return null;
    }

    const parsed = parseMetric(rerunOutput, config.metric);
    if (!parsed) {
      console.log(chalk.red("Metric not found after fix. Reverting.\n"));
      await git.resetHard(`${originalCommit}~1`);
      await appendResult({
        commit: fixCommit,
        metricValue: 0,
        status: "crash",
        tokensUsed: totalTokens,
        description: `${agentResult.description} (fixed but no metric)`,
      });
      return null;
    }

    const fixTokens =
      totalTokens + fixResult.inputTokens + fixResult.outputTokens;

    return {
      commit: fixCommit,
      metricValue: parsed.value,
      tokensUsed: fixTokens,
      description: `${agentResult.description} (fixed: ${fixResult.description})`,
    };
  } catch {
    console.log(chalk.red("Crash fix failed. Reverting.\n"));
    try {
      await git.resetHard();
    } catch {
      // ignore
    }
    await appendResult({
      commit: originalCommit,
      metricValue: 0,
      status: "crash",
      tokensUsed: totalTokens,
      description: `${agentResult.description} (crashed)`,
    });
    return null;
  }
}

async function revertToLastKept(results: ExperimentResult[]): Promise<void> {
  const lastKept = [...results].reverse().find((r) => r.status === "keep");
  if (lastKept) {
    await git.resetHard(lastKept.commit);
  } else {
    await git.resetHard();
  }
}

function setupShutdownHandler(abortController: AbortController): void {
  const handler = () => {
    if (shuttingDown) {
      console.log(chalk.red("\nForce quit."));
      process.exit(1);
    }
    shuttingDown = true;
    abortController.abort();
    console.log(
      chalk.yellow("\nGraceful shutdown requested. Finishing current step..."),
    );
  };

  process.on("SIGINT", handler);
  process.on("SIGTERM", handler);
}
