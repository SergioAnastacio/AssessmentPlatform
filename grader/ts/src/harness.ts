import { evaluateSubmission, problemPathFromRepoRoot } from "./evaluate";
import path from "node:path";

// This file is intended to be executed in a separate Node process.
// It MUST print ONLY JSON to stdout.

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
  const exportName = args.get("export") ?? "sumTwo";

  const problemJsonPath = problemPathFromRepoRoot(repoRoot, problemId);
  const submissionPath = path.join(repoRoot, submissionRel);

  const res = await evaluateSubmission({
    problemJsonPath,
    submissionPath,
    exportName,
  });

  process.stdout.write(JSON.stringify(res));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  void main(process.argv);
}
