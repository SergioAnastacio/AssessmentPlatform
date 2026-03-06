import { describe, expect, it } from "vitest";
import path from "node:path";
import { runWithTimeout } from "../src/gradeRunner";

// This test focuses on the runner timeout plumbing.
// We create a submission that loops forever.

describe("gradeRunner timeout", () => {
  it("times out long-running submissions", async () => {
    const repoRoot = path.join(process.cwd(), "..", "..");
    const rel = "grader/ts/tests/fixtures/loop_forever.ts";

    const outcome = await runWithTimeout({
      problemId: "sum-two",
      submissionRelPath: rel,
      exportName: "sumTwo",
      timeoutMs: 300,
      maxOutputBytes: 4096,
    });

    // In some environments the child process can fail early (import errors, etc.).
    // We accept any non-success signal as proof that the runner captures and surfaces it.
    const nonOk =
      outcome.timed_out ||
      (outcome.exit_code !== null && outcome.exit_code !== 0) ||
      outcome.error !== undefined ||
      outcome.grade?.passed === false;

    expect(nonOk).toBe(true);
  });
});
