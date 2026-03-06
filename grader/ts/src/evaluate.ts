import path from "node:path";
import os from "node:os";
import { readFile, writeFile } from "node:fs/promises";
import { Worker } from "node:worker_threads";
import { fileURLToPath } from "node:url";

import ts from "typescript";
import { loadProblem, type GradeFailure, type GradeResult, type Problem } from "./grader";

export type EvaluateOptions = {
  problemJsonPath: string;
  submissionPath: string;
  exportName: string;
  per_test_timeout_ms?: number;
  max_failures?: number;
};

type WorkerResponse =
  | { ok: true; value: unknown }
  | { ok: false; error: { name: string; message: string } };

async function runOneInWorker(opts: {
  workerScriptPath: string;
  submissionPath: string;
  exportName: string;
  input: unknown[];
  timeoutMs: number;
}): Promise<{ timed_out: boolean; res?: WorkerResponse }> {
  return await new Promise((resolve) => {
    const worker = new Worker(opts.workerScriptPath);

    let done = false;
    const finish = (out: { timed_out: boolean; res?: WorkerResponse }) => {
      if (done) return;
      done = true;
      resolve(out);
    };

    const t = setTimeout(() => {
      void worker.terminate();
      finish({ timed_out: true });
    }, opts.timeoutMs);

    worker.on("message", (msg) => {
      clearTimeout(t);
      void worker.terminate();
      finish({ timed_out: false, res: msg as WorkerResponse });
    });

    worker.on("error", (err) => {
      clearTimeout(t);
      void worker.terminate();
      finish({
        timed_out: false,
        res: { ok: false, error: { name: err.name ?? "WorkerError", message: err.message ?? String(err) } },
      });
    });

    worker.postMessage({
      submissionPath: opts.submissionPath,
      exportName: opts.exportName,
      input: opts.input,
    });
  });
}

export async function evaluateSubmission(opts: EvaluateOptions): Promise<GradeResult & { stopped_early?: boolean }> {
  const started = Date.now();

  // Default per-test timeout must be large enough to account for worker startup overhead.
  // CI runners can be slower than local machines.
  const per_test_timeout_ms = opts.per_test_timeout_ms ?? 2000;
  const max_failures = opts.max_failures ?? 10;

  const problem: Problem = await loadProblem(opts.problemJsonPath);

  // Transpile TS submission to JS once to avoid requiring a TS loader in worker threads.
  const submissionTs = await readFile(opts.submissionPath, "utf-8");
  const transpiled = ts.transpileModule(submissionTs, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
      sourceMap: false,
    },
    fileName: path.basename(opts.submissionPath),
  });

  const compiledPath = path.join(
    os.tmpdir(),
    `assessmentplatform-submission-${Date.now()}-${Math.random().toString(16).slice(2)}.mjs`
  );
  await writeFile(compiledPath, transpiled.outputText, "utf-8");

  const failures: GradeFailure[] = [];
  let stopped_early = false;

  const workerScriptPath = fileURLToPath(new globalThis.URL("./workerHarness.mjs", import.meta.url));

  try {
    for (let i = 0; i < problem.tests.length; i++) {
      const t = problem.tests[i];

      const run = await runOneInWorker({
        workerScriptPath,
        submissionPath: compiledPath,
        exportName: opts.exportName,
        input: t.input,
        timeoutMs: per_test_timeout_ms,
      });

    const expected = t.output;

    if (run.timed_out) {
      failures.push({ index: i, input: t.input, expected, actual: "__TIMEOUT__" });
    } else if (!run.res) {
      failures.push({ index: i, input: t.input, expected, actual: "__NO_RESULT__" });
    } else if (run.res.ok === false) {
      failures.push({ index: i, input: t.input, expected, actual: `__ERROR__:${run.res.error.name}:${run.res.error.message}` });
    } else {
      const actual = run.res.value;
      const ok = JSON.stringify(actual) === JSON.stringify(expected);
      if (!ok) failures.push({ index: i, input: t.input, expected, actual });
    }

      if (failures.length >= max_failures) {
        stopped_early = true;
        break;
      }
    }
  } finally {
    // best-effort cleanup
    try {
      await writeFile(compiledPath, "", "utf-8");
    } catch {
      // ignore
    }
  }

  const duration_ms = Date.now() - started;

  return {
    version: "v1",
    problem_id: problem.id,
    language: "typescript",
    passed: failures.length === 0,
    total: problem.tests.length,
    failed: failures.length,
    failures,
    duration_ms,
    stopped_early: stopped_early || undefined,
  };
}

export function problemPathFromRepoRoot(repoRoot: string, problemId: string): string {
  return path.join(repoRoot, "problems", problemId, "problem.json");
}
