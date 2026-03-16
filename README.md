# autoresearch

Inspired by [karpathy/autoresearch](https://github.com/karpathy/autoresearch), reimagined in TypeScript with Claude as the agent via the [Claude Code SDK](https://github.com/anthropics/claude-code-sdk-ts).

An autonomous experiment loop. Give it a file to optimize, an eval command, and a metric — it uses Claude to iteratively propose changes, test them, and keep only the ones that improve the score.

## How it works

1. Creates a git branch for the run and measures a baseline
2. Asks Claude to read the target file and propose one focused change
3. Commits the change, runs the eval command, and parses the metric from stdout
4. If the metric improved → keep the commit. If not → `git reset --hard`
5. Feeds the full experiment history back to Claude on the next iteration
6. Repeats until you stop it with Ctrl+C

Each experiment is a real git commit, so the entire search trajectory is preserved and can be inspected with `git log`.

## Prerequisites

- Node.js >= 18
- An [Anthropic API key](https://console.anthropic.com/)
- A git repository (`git init` if needed)

## Setup

```bash
npm install
cp .env.example .env
# Fill in your keys in .env
```

## Quick start

Run the interactive setup to generate a config and `program.md`:

```bash
npx tsx src/index.ts init
```

Then start the loop:

```bash
npx tsx src/index.ts run --tag <name>
```

The `--tag` names the git branch (`autoresearch/<name>`). Use something descriptive like `mar15` or `v1-prompt-search`.

Check progress at any time:

```bash
npx tsx src/index.ts status
```

## Configuration

`autoresearch.config.ts` in your project root:

```ts
const config = {
  // The only file Claude is allowed to edit
  targetFile: "src/prompt.ts",

  // Files Claude can read but not modify (eval harness, dataset, etc.)
  readonlyContext: ["src/evaluate.ts", "src/dataset.ts"],

  // Command to run one evaluation
  command: "npx tsx src/evaluate.ts",

  // Kill the process if it exceeds this
  timeoutSeconds: 180,

  metric: {
    name: "accuracy",
    // Must have one capture group matching a number
    pattern: /^accuracy:\s+([\d.]+)/m,
    direction: "maximize", // or "minimize"
  },

  model: "claude-sonnet-4-6",
  branchPrefix: "autoresearch",

  // Markdown file with task instructions for Claude
  programFile: "program.md",
};

export default config;
```

## program.md

This file is the research brief Claude reads before every experiment. It should explain:

- What the task is and what good performance looks like
- What Claude is allowed to change and how
- What strategies to try (and what to avoid)
- Any domain-specific constraints

See [`sample/program.md`](sample/program.md) for a complete example.

## Eval harness requirements

Your eval script must:

- Use a **fixed held-out dataset** that is not accessible from the target file
- Print the metric on its own line in a format your regex can match, e.g. `accuracy: 0.8750`
- Exit with code `0` on success, non-zero on failure
- Be deterministic (or close to it) — noisy evals make it hard to distinguish real improvements

## Output files

| File | Contents |
|---|---|
| `results.tsv` | Tab-separated log of every experiment: commit, metric, status, tokens, description |
| `run.log` | Stdout/stderr from the most recent eval run |

## Crash recovery

If an experiment causes the eval to crash, Claude automatically gets one additional attempt to diagnose and fix the error before the change is reverted.

## Sample experiment

`sample/` contains a complete working example: prompt optimization for movie review sentiment classification using a Hugging Face hosted model.

```bash
npx tsx src/index.ts run --tag sample --config sample/autoresearch.config.ts
```

Make sure `HF_TOKEN` is set in your `.env` file.

The agent iterates on `sample/prompt.ts` — adjusting the system prompt, few-shot examples, output format, and response parsing — to maximize accuracy on 100 held-out reviews.

## Commands

| Command | Description |
|---|---|
| `autoresearch init` | Interactive setup: generates config and `program.md` |
| `autoresearch run --tag <name>` | Start the experiment loop |
| `autoresearch run --tag <name> --config <path>` | Use a custom config file |
| `autoresearch status` | Show experiment summary and full log |

## License

MIT
