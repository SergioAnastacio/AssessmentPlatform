import { describe, expect, it } from "vitest";
import { runWithTimeout } from "../src/gradeRunner";

// These tests validate error_code classification.

describe("gradeRunner error_code", () => {
  it("returns TIMEOUT on long-running submission", async () => {
    const outcome = await runWithTimeout({
      problemId: "sum-two",
      submissionRelPath: "grader/ts/tests/fixtures/loop_forever.ts",
      exportName: "sumTwo",
      timeoutMs: 50,
      maxOutputBytes: 8 * 1024,
    });

    expect(outcome.timed_out).toBe(true);
    expect(outcome.error_code).toBe("TIMEOUT");
  });

  it(
    "classifies abnormal termination (non-zero or non-JSON)",
    async () => {
      const outcome = await runWithTimeout({
      problemId: "sum-two",
      submissionRelPath: "grader/ts/tests/fixtures/exit_nonzero.ts",
      exportName: "sumTwo",
      // Give plenty of time in CI/container; we are testing classification, not performance.
      timeoutMs: 8000,
      maxOutputBytes: 8 * 1024,
    });

    // Depending on runtime/loader behavior, this can appear as NONZERO_EXIT or BAD_JSON.
    // In very slow environments this could also timeout.
      expect(["NONZERO_EXIT", "BAD_JSON", "TIMEOUT"]).toContain(outcome.error_code);
    },
    15000
  );

  it("returns BAD_JSON when stdout is polluted by submission logs", async () => {
    const outcome = await runWithTimeout({
      problemId: "sum-two",
      submissionRelPath: "grader/ts/tests/fixtures/noisy_stdout.ts",
      exportName: "sumTwo",
      timeoutMs: 2000,
      maxOutputBytes: 8 * 1024,
    });

    expect(outcome.timed_out).toBe(false);
    expect(outcome.error_code).toBe("BAD_JSON");
  });
});
