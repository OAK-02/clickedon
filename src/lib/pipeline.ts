import { extractJson } from "./extract-json";
import { mockStream, type MockBehavior, type MockState } from "./anthropic-mock";

export interface GenerateInput {
  /** Drives the mock streaming client (see anthropic-mock.ts). */
  behavior: MockBehavior;
  /** Hands the finished draft to the next pipeline stage. May reject. */
  advanceToNextStage: () => Promise<void>;
  /** Returns true once the draft passes review. Scripted by callers/tests. */
  reviewPasses: (attempt: number) => boolean;
}

export interface GenerateResult {
  status: "ok" | "error";
  attempts: number;
  // (DESIGN DECISION) user of the api can read this message
  error?: string;
}

const MAX_REVISIONS = 3;

/**
 * Runs one content-generation pass: stream a draft, extract it, revise until it
 * passes review, then hand off to the next stage.
 *
 * This is a faithful (stripped-down) reproduction of the real pipeline — and it
 * ships with three real bugs from that pipeline. Your job is to fix them so the
 * test suite passes. See the README for the symptoms. (Do not edit the tests.)
 */
export async function generate(input: GenerateInput): Promise<GenerateResult> {
  const state: MockState = { calls: 0 };

  // The model call can fail transiently (rate limits) or return a truncated
  // stream (dropped connection, missing closing fence). A truncated response
  // can't be recovered by re-parsing it — the fix is to re-request the stream.
  let text = await mockStream(input.behavior, state);
  try {
    extractJson(text);
  } catch {
    // second try should return entire text
    text = await mockStream(input.behavior, state);
    extractJson(text);
  }

  // Revise until the draft passes review.
  let attempt = 0;
  while (!input.reviewPasses(attempt) && attempt < MAX_REVISIONS) {
    attempt += 1;
  }

  if (!input.reviewPasses(attempt)) {
    return {
      status: "error",
      attempts: attempt,
      error: "Review did not pass (reached revision limits)",
    };
  }


  // Kick off the next stage and return.
  try {
    await input.advanceToNextStage();
  } catch (err) {
    return {
      status: "error",
      attempts: attempt,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  return { status: "ok", attempts: attempt };
}

export { MAX_REVISIONS };
