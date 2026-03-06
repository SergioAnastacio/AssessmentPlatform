import { describe, expect, it } from "vitest";
import path from "node:path";
import { loadProblem, gradeStub } from "../src/grader";

describe("grader", () => {
  it("loads problem.json", async () => {
    const problemPath = path.join(process.cwd(), "..", "..", "problems", "sum-two", "problem.json");
    const p = await loadProblem(problemPath);
    expect(p.id).toBe("sum-two");
    expect(p.tests.length).toBeGreaterThan(0);
  });

  it("stub grades as passed", async () => {
    const problemPath = path.join(process.cwd(), "..", "..", "problems", "sum-two", "problem.json");
    const r = await gradeStub(problemPath);
    expect(r.passed).toBe(true);
    expect(r.failed).toBe(0);
  });
});
