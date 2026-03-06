import { runWithTimeout } from "./gradeRunner";
import path from "node:path";
import type { GradeResult } from "./grader";
import type { ErrorCode } from "./gradeRunner";
import { scanSubmissionPolicy, type PolicyFlags } from "./policyScan";

export type RunResult = {
  version: "v1";
  problem_id: string;
  language: "typescript";
  timed_out: boolean;
  exit_code: number | null;
  duration_ms?: number;
  grade_result?: GradeResult;
  error_code?: ErrorCode;
  runner_error?: { name: string; message: string };
  // Static policy scan (best-effort)
  policy_flags?: PolicyFlags;
  policy_findings?: string[];
  risk_score?: number;
  logs: {
    stdout: string;
    stderr: string;
    stdout_truncated: boolean;
    stderr_truncated: boolean;
  };
};

// Usage (from repo root via Docker/CI):
//   npm --prefix grader/ts run grade -- --problem sum-two --submission submissions/ts/sum-two/submission.ts --timeout-ms 2000

export async function main(argv: string[]) {
  const args = new Map<string, string>();
  for (let i = 2; i < argv.length; i++) {
    const k = argv[i];
    const v = argv[i + 1];
    if (k?.startsWith("--") && v && !v.startsWith("--")) {
      args.set(k.slice(2), v);
      i++;
    }
  }

  const problemId = args.get("problem") ?? "sum-two";
  const submissionRel = args.get("submission") ?? "submissions/ts/sum-two/submission.ts";
  const exportName = args.get("export") ?? "sumTwo";
  const timeoutMs = Number(args.get("timeout-ms") ?? "2000");
  const maxOutputBytes = Number(args.get("max-output-bytes") ?? String(32 * 1024));

  const outcome = await runWithTimeout({
    problemId,
    submissionRelPath: submissionRel,
    exportName,
    timeoutMs,
    maxOutputBytes,
  });

  const repoRoot = path.resolve(process.cwd(), "..", "..");
  const submissionAbs = path.join(repoRoot, submissionRel);

  const out: RunResult = {
    version: "v1",
    problem_id: problemId,
    language: "typescript",
    timed_out: outcome.timed_out,
    exit_code: outcome.exit_code,
    duration_ms: outcome.grade?.duration_ms,
    grade_result: outcome.grade,
    error_code: outcome.error_code,
    runner_error: outcome.error,
    logs: {
      stdout: outcome.stdout,
      stderr: outcome.stderr,
      stdout_truncated: outcome.stdout_truncated,
      stderr_truncated: outcome.stderr_truncated,
    },
  };

  // Best-effort policy scan of the submission source.
  try {
    const scan = await scanSubmissionPolicy(submissionAbs);
    out.policy_flags = scan.flags;
    out.policy_findings = scan.findings;
    out.risk_score = scan.risk_score;
  } catch (e) {
    // Don't fail grading if policy scan fails.
    out.policy_findings = [
      `Policy scan failed: ${String(e)}`,
    ];
  }

  process.stdout.write(JSON.stringify(out, null, 2) + "\n");

  if (outcome.timed_out) process.exitCode = 124;
  else if (outcome.grade?.passed) process.exitCode = 0;
  else process.exitCode = 2;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  void main(process.argv);
}
