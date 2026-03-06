import { parentPort } from "node:worker_threads";
import path from "node:path";
import { pathToFileURL } from "node:url";

type Request = {
  submissionPath: string;
  exportName: string;
  input: unknown[];
};

type Response =
  | { ok: true; value: unknown }
  | { ok: false; error: { name: string; message: string } };

type SubmissionModule = { [k: string]: unknown };

async function loadFn(submissionPath: string, exportName: string): Promise<(...args: unknown[]) => unknown> {
  const abs = path.resolve(submissionPath);
  const mod = (await import(pathToFileURL(abs).href)) as SubmissionModule;
  const fn = mod[exportName];
  if (typeof fn !== "function") {
    throw new Error(`Submission export '${exportName}' not found or not a function in ${submissionPath}`);
  }
  return fn as (...args: unknown[]) => unknown;
}

if (!parentPort) {
  throw new Error("workerHarness must be run as a worker thread");
}

parentPort.on("message", async (req: Request) => {
  const res: Response = await (async () => {
    try {
      const fn = await loadFn(req.submissionPath, req.exportName);
      const value = await fn(...req.input);
      return { ok: true, value };
    } catch (e) {
      const err = e as Error;
      return { ok: false, error: { name: err.name ?? "Error", message: err.message ?? String(e) } };
    }
  })();

  parentPort!.postMessage(res);
});
