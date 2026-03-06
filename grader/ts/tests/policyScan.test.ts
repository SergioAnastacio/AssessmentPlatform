import { describe, expect, it } from "vitest";
import path from "node:path";
import { scanSubmissionPolicy } from "../src/policyScan";

describe("policyScan", () => {
  it("detects fs usage", async () => {
    const submissionPath = path.join(process.cwd(), "tests", "fixtures", "uses_fs.ts");
    const res = await scanSubmissionPolicy(submissionPath);
    expect(res.flags.uses_fs).toBe(true);
    expect(res.risk_score).toBeGreaterThan(0);
    expect(res.findings.join(" ")).toMatch(/fs/i);
  });
});
