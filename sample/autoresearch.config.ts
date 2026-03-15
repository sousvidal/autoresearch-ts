const config = {
  targetFile: "sample/prompt.ts",
  readonlyContext: ["sample/evaluate.ts", "sample/dataset.ts"],

  command: "npx tsx sample/evaluate.ts",
  timeoutSeconds: 180,

  metric: {
    name: "accuracy",
    pattern: /^accuracy:\s+([\d.]+)/m,
    direction: "maximize" as const,
  },

  model: "claude-sonnet-4-20250514",
  branchPrefix: "autoresearch",
  programFile: "sample/program.md",
};

export default config;
