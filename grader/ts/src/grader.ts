import { readFile } from "node:fs/promises";
import path from "node:path";

export type Problem = {
  id: string;
  title: string;
  tests: Array<{ input: unknown[]; output: unknown }>;
};

export type GradeFailure = {
  index: number;
  input: unknown[];
  expected: unknown;
  actual: unknown;
};

export type GradeResult = {
  /** Schema version for the grading output */
  version: "v1";
  problem_id: string;
  language: "typescript";
  passed: boolean;
  total: number;
  failed: number;
  failures: GradeFailure[];
  /** Optional execution timing */
  duration_ms?: number;
};

// Phase 0: minimal contract — load problem.json and return it.
export async function loadProblem(problemJsonPath: string): Promise<Problem> {
  const raw = await readFile(problemJsonPath, "utf-8");
  const data = JSON.parse(raw) as Problem;
  return data;
}

// Phase 0: stub evaluation (we'll execute user code in Phase 1)
export async function gradeStub(problemJsonPath: string): Promise<GradeResult> {
  const p = await loadProblem(problemJsonPath);
  return {
    version: "v1",
    problem_id: p.id,
    language: "typescript",
    passed: true,
    total: p.tests.length,
    failed: 0,
    failures: [],
  };
}

export async function main(argv: string[]) {
  const problemId = argv[2] ?? "sum-two";
  const root = process.cwd();
  const problemPath = path.join(root, "..", "..", "problems", problemId, "problem.json");
  const res = await gradeStub(problemPath);
  // JSON output for integration
  process.stdout.write(JSON.stringify(res, null, 2) + "\n");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  void main(process.argv);
}
