import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import type { RunOutput } from "../types.js";

export async function runExperiment(
  command: string,
  timeoutSeconds: number,
  logFile = "run.log",
): Promise<RunOutput> {
  const logPath = path.resolve(logFile);
  const parts = command.split(/\s+/);
  const cmd = parts[0];
  const args = parts.slice(1);

  return new Promise<RunOutput>((resolve) => {
    const chunks: Buffer[] = [];
    const errChunks: Buffer[] = [];
    let timedOut = false;

    const proc = spawn(cmd, args, {
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env },
    });

    const timer = setTimeout(() => {
      timedOut = true;
      proc.kill("SIGTERM");
      setTimeout(() => {
        if (!proc.killed) proc.kill("SIGKILL");
      }, 5000);
    }, timeoutSeconds * 1000);

    proc.stdout.on("data", (data: Buffer) => chunks.push(data));
    proc.stderr.on("data", (data: Buffer) => errChunks.push(data));

    proc.on("close", async (code) => {
      clearTimeout(timer);
      const stdout = Buffer.concat(chunks).toString("utf-8");
      const stderr = Buffer.concat(errChunks).toString("utf-8");

      const fullOutput = stdout + (stderr ? `\n--- stderr ---\n${stderr}` : "");
      await fs.writeFile(logPath, fullOutput, "utf-8").catch(() => {});

      resolve({
        stdout,
        stderr,
        exitCode: code,
        timedOut,
      });
    });

    proc.on("error", async (err) => {
      clearTimeout(timer);
      const stderr = `Process error: ${err.message}`;
      await fs.writeFile(logPath, stderr, "utf-8").catch(() => {});
      resolve({
        stdout: "",
        stderr,
        exitCode: 1,
        timedOut: false,
      });
    });
  });
}
