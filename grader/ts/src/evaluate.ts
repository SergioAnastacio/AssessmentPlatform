import path from "node:path";
import { pathToFileURL } from "node:url";
import { loadProblem, type GradeResult, type Problem } from "./grader";

type SubmissionModule = {
  [k: string]: unknown;
};

export type EvaluateOptions = {
  problemJsonPath: string;
  submissionPath: string;
  exportName: string;
};

export async function loadSubmissionFunction(
  submissionPath: string,
  exportName: string
): Promise<unknown> {
  const abs = path.resolve(submissionPath);
  const mod = (await import(pathToFileURL(abs).href)) as SubmissionModule;
  const fn = mod[exportName];
  if (typeof fn !== "function") {
    throw new Error(
      `Submission export '${exportName}' not found or not a function in ${submissionPath}`
    );
  }
  return fn;
}

export async function evaluateSubmission(opts: EvaluateOptions): Promise<GradeResult> {
  const problem: Problem = await loadProblem(opts.problemJsonPath);
  const fn = await loadSubmissionFunction(opts.submissionPath, opts.exportName);

  const failures: GradeResult["failures"] = [];

  for (let i = 0; i < problem.tests.length; i++) {
    const t = problem.tests[i];
    const actual = await (fn as (...args: unknown[]) => unknown)(...t.input);
    const expected = t.output;
    // basic deep equality for primitives/JSON-ish
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    if (!ok) {
      failures.push({ index: i, input: t.input, expected, actual });
    }
  }

  return {
    passed: failures.length === 0,
    total: problem.tests.length,
    failed: failures.length,
    failures,
  };
}

export function problemPathFromRepoRoot(repoRoot: string, problemId: string): string {
  return path.join(repoRoot, "problems", problemId, "problem.json");
}
