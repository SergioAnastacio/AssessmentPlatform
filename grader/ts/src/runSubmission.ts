import path from "node:path";
import { evaluateSubmission, problemPathFromRepoRoot } from "./evaluate";

// Usage (from repo root via Docker/CI):
//   npm --prefix grader/ts run grade -- --problem sum-two --submission submissions/ts/sum-two/submission.ts

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

  const repoRoot = path.resolve(process.cwd(), "..", "..");
  const problemId = args.get("problem") ?? "sum-two";
  const submissionRel = args.get("submission") ?? "submissions/ts/sum-two/submission.ts";

  const problemJsonPath = problemPathFromRepoRoot(repoRoot, problemId);
  const submissionPath = path.join(repoRoot, submissionRel);

  const res = await evaluateSubmission({
    problemJsonPath,
    submissionPath,
    exportName: "sumTwo",
  });

  process.stdout.write(JSON.stringify(res, null, 2) + "\n");
  process.exitCode = res.passed ? 0 : 2;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  void main(process.argv);
}
