#!/usr/bin/env node

import "dotenv/config";
import { Command } from "commander";
import { initCommand } from "./commands/init.js";
import { runCommand } from "./commands/run.js";
import { statusCommand } from "./commands/status.js";

const program = new Command();

program
  .name("autoresearch")
  .description(
    "Autonomous experiment loop — an AI agent iterates on your code while you sleep",
  )
  .version("0.1.0");

program
  .command("init")
  .description("Interactive setup: create config and program.md")
  .action(async () => {
    await initCommand();
  });

program
  .command("run")
  .description("Start the autonomous experiment loop")
  .requiredOption("--tag <tag>", "Run tag (used for branch name, e.g. mar15)")
  .option("--config <path>", "Path to config file", "autoresearch.config.ts")
  .action(async (opts: { tag: string; config: string }) => {
    await runCommand(opts);
  });

program
  .command("status")
  .description("Show experiment results summary")
  .option("--config <path>", "Path to config file", "autoresearch.config.ts")
  .action(async (opts: { config: string }) => {
    await statusCommand(opts);
  });

program.parse();
