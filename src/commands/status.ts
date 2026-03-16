import chalk from "chalk";
import { loadConfig } from "../core/config.js";
import { readResults, summarizeResults } from "../core/logger.js";

export async function statusCommand(options: {
  config?: string;
}): Promise<void> {
  let direction: "minimize" | "maximize" = "minimize";

  try {
    const { config, cwd } = await loadConfig(options.config);
    process.chdir(cwd);
    direction = config.metric.direction;
  } catch {
    // Fall back to minimize if config isn't available
  }

  const results = await readResults();

  if (results.length === 0) {
    console.log(chalk.yellow("No experiments found. Run some first!"));
    return;
  }

  const summary = summarizeResults(results, direction);

  console.log(chalk.bold.blue("\n  autoresearch status\n"));
  console.log(`  Total experiments:  ${chalk.bold(summary.total.toString())}`);
  console.log(`  Kept:               ${chalk.green(summary.kept.toString())}`);
  console.log(
    `  Discarded:          ${chalk.yellow(summary.discarded.toString())}`,
  );
  console.log(`  Crashed:            ${chalk.red(summary.crashed.toString())}`);
  console.log(
    `  Best metric:        ${summary.bestMetric !== null ? chalk.green(summary.bestMetric.toFixed(6)) : chalk.dim("N/A")}`,
  );
  console.log(
    `  Best commit:        ${summary.bestCommit ? chalk.cyan(summary.bestCommit) : chalk.dim("N/A")}`,
  );
  console.log(
    `  Total tokens:       ${chalk.dim(summary.totalTokens.toLocaleString())}`,
  );

  console.log(chalk.bold("\n  Experiment log:\n"));
  console.log(
    chalk.dim("  #   commit   metric     status    tokens  description"),
  );
  console.log(chalk.dim("  " + "-".repeat(76)));

  for (let i = 0; i < summary.results.length; i++) {
    const r = summary.results[i];
    const num = String(i + 1).padStart(3);
    const commit = r.commit.padEnd(8);
    const metric = r.metricValue > 0 ? r.metricValue.toFixed(6) : "  N/A   ";
    const statusColor =
      r.status === "keep"
        ? chalk.green
        : r.status === "discard"
          ? chalk.yellow
          : chalk.red;
    const status = statusColor(r.status.padEnd(9));
    const tokens = String(r.tokensUsed).padStart(6);
    const desc = r.description.slice(0, 40);

    console.log(`  ${num}  ${commit} ${metric}  ${status} ${tokens}  ${desc}`);
  }

  console.log();
}
