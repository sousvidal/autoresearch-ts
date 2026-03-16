import chalk from "chalk";
import { loadConfig } from "../core/config.js";
import { startLoop } from "../core/loop.js";

export async function runCommand(options: {
  tag: string;
  config?: string;
}): Promise<void> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error(
      chalk.red(
        "ANTHROPIC_API_KEY environment variable is required.\n" +
          "Set it with: export ANTHROPIC_API_KEY=your-key-here",
      ),
    );
    process.exit(1);
  }

  try {
    const { config, cwd } = await loadConfig(options.config);
    process.chdir(cwd);

    console.log(chalk.bold.blue("\n  autoresearch\n"));
    console.log(
      chalk.dim("  Autonomous experiment loop — Ctrl+C to stop gracefully\n"),
    );

    await startLoop({ tag: options.tag, config, cwd });
  } catch (err) {
    console.error(
      chalk.red(`Error: ${err instanceof Error ? err.message : String(err)}`),
    );
    process.exit(1);
  }
}
