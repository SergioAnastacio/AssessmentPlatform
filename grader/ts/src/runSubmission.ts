import { runWithTimeout } from "./gradeRunner";

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

  const outcome = await runWithTimeout({
    problemId,
    submissionRelPath: submissionRel,
    exportName,
    timeoutMs,
    maxOutputBytes: 16 * 1024,
  });

  // Stable output: always emit JSON.
  const out = {
    ...outcome.grade,
    timed_out: outcome.timed_out,
    exit_code: outcome.exit_code,
    stdout: outcome.stdout,
    stderr: outcome.stderr,
    stdout_truncated: outcome.stdout_truncated,
    stderr_truncated: outcome.stderr_truncated,
    runner_error: outcome.error,
  };

  process.stdout.write(JSON.stringify(out, null, 2) + "\n");

  if (outcome.timed_out) process.exitCode = 124;
  else if (outcome.grade?.passed) process.exitCode = 0;
  else process.exitCode = 2;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  void main(process.argv);
}
