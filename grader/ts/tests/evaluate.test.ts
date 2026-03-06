import { describe, expect, it } from "vitest";
import path from "node:path";
import { evaluateSubmission } from "../src/evaluate";

describe("evaluateSubmission", () => {
  it("passes for correct submission", async () => {
    const repoRoot = path.join(process.cwd(), "..", "..");
    const problemJsonPath = path.join(repoRoot, "problems", "sum-two", "problem.json");
    const submissionPath = path.join(process.cwd(), "tests", "fixtures", "sumTwo_ok.ts");

    const res = await evaluateSubmission({
      problemJsonPath,
      submissionPath,
      exportName: "sumTwo",
    });

    expect(res.version).toBe("v1");
    expect(res.problem_id).toBe("sum-two");
    expect(res.language).toBe("typescript");
    expect(res.passed).toBe(true);
    expect(res.failed).toBe(0);
    expect(res.duration_ms).toBeTypeOf("number");
  });

  it("fails for incorrect submission", async () => {
    const repoRoot = path.join(process.cwd(), "..", "..");
    const problemJsonPath = path.join(repoRoot, "problems", "sum-two", "problem.json");
    const submissionPath = path.join(process.cwd(), "tests", "fixtures", "sumTwo_bad.ts");

    const res = await evaluateSubmission({
      problemJsonPath,
      submissionPath,
      exportName: "sumTwo",
    });

    expect(res.version).toBe("v1");
    expect(res.problem_id).toBe("sum-two");
    expect(res.language).toBe("typescript");
    expect(res.passed).toBe(false);
    expect(res.failed).toBeGreaterThan(0);
    expect(res.failures.length).toBe(res.failed);
    expect(res.duration_ms).toBeTypeOf("number");
  });
});
