export interface AutoresearchConfig {
  targetFile: string;
  readonlyContext: string[];
  command: string;
  timeoutSeconds: number;
  metric: MetricConfig;
  model: string;
  branchPrefix: string;
  programFile: string;
}

export interface MetricConfig {
  name: string;
  pattern: RegExp;
  direction: "minimize" | "maximize";
}

export type ExperimentStatus = "keep" | "discard" | "crash";

export interface ExperimentResult {
  commit: string;
  metricValue: number;
  status: ExperimentStatus;
  tokensUsed: number;
  description: string;
}

export interface RunOutput {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
}
