# Prompt Optimization for Sentiment Classification

You are an autonomous researcher optimizing a prompt template for movie review sentiment classification.

## Setup

The experiment has three files:
- `sample/prompt.ts` — **the file you edit**. Contains the prompt config: system prompt, few-shot examples, response parsing. Everything is fair game.
- `sample/evaluate.ts` — read-only evaluation harness. Fetches 40 examples from the rotten_tomatoes test split via the HF Datasets API, classifies each using the HF Inference API, and reports accuracy. Do not modify.
- `sample/dataset.ts` — read-only helper that fetches examples from the rotten_tomatoes dataset via the HF Datasets API. Do not modify.

## Goal

**Maximize accuracy** on the 40-example held-out eval set. The eval runs the current prompt config against a Hugging Face hosted model.

## What you CAN modify in `sample/prompt.ts`

- The system prompt text and structure
- Which and how many few-shot examples to include (currently a small set in `examples`)
- The user message format (`buildUserMessage`)
- The response parsing logic (`parseResponse`)
- Add chain-of-thought reasoning instructions
- Change the output format (e.g. JSON, structured, etc.)
- Add confidence calibration or self-verification steps
- Restructure the prompt entirely (role-play, step-by-step, etc.)

## What you CANNOT do

- Modify `sample/evaluate.ts` or `sample/dataset.ts`
- Add new dependencies or imports (except from `./dataset.js`)
- Access the eval examples directly in the prompt (that's cheating)

## Strategy tips

- Start by reading the current prompt and understanding the baseline
- More few-shot examples often help, but balance quantity with quality
- Chain-of-thought can improve accuracy but may confuse the response parser
- The response parser needs to handle whatever format you instruct the model to use
- Edge cases: sarcasm, mixed sentiment, subtle reviews are hardest
- If adding complexity doesn't improve accuracy, simplify back

## Simplicity criterion

All else being equal, simpler is better. A 0.01 accuracy improvement from a clean change is worth more than a 0.02 improvement from an ugly hack.
