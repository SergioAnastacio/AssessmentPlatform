import { evaluateSubmission, problemPathFromRepoRoot } from "./evaluate";
import path from "node:path";

// This file is intended to be executed in a separate Node process.
// It MUST print ONLY JSON to stdout.

export type HarnessOk = {
  ok: true;
  grade: unknown;
};

export type HarnessError = {
  ok: false;
  phase: "args" | "import" | "grade" | "unknown";
  error: { name: string; message: string };
};

function parseArgs(argv: string[]) {
  const args = new Map<string, string>();
  for (let i = 2; i < argv.length; i++) {
    const k = argv[i];
    const v = argv[i + 1];
    if (k?.startsWith("--") && v && !v.startsWith("--")) {
      args.set(k.slice(2), v);
      i++;
    }
  }
  return args;
}

export async function main(argv: string[]) {
  try {
    const args = parseArgs(argv);

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

    const out: HarnessOk = { ok: true, grade: res };
    process.stdout.write(JSON.stringify(out));
  } catch (e) {
    const err = e as Error;
    const out: HarnessError = {
      ok: false,
      phase: "unknown",
      error: { name: err.name ?? "Error", message: err.message ?? String(e) },
    };
    process.stdout.write(JSON.stringify(out));
    process.exitCode = 10;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  void main(process.argv);
}
