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

  it("returns BAD_JSON when harness output is not valid JSON", async () => {
    const outcome = await runWithTimeout({
      problemId: "sum-two",
      submissionRelPath: "submissions/ts/sum-two/submission.ts",
      exportName: "doesNotExist",
      timeoutMs: 2000,
      maxOutputBytes: 8 * 1024,
    });

    expect(outcome.timed_out).toBe(false);
    expect(outcome.error_code).toBe("BAD_JSON");
  });
});
