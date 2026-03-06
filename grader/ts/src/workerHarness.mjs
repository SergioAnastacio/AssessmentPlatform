import { parentPort } from "node:worker_threads";
import path from "node:path";
import { pathToFileURL } from "node:url";

if (!parentPort) {
  throw new Error("workerHarness must be run as a worker thread");
}

async function loadFn(submissionPath, exportName) {
  const abs = path.resolve(submissionPath);
  const mod = await import(pathToFileURL(abs).href);
  const fn = mod[exportName];
  if (typeof fn !== "function") {
    throw new Error(`Submission export '${exportName}' not found or not a function in ${submissionPath}`);
  }
  return fn;
}

parentPort.on("message", async (req) => {
  const res = await (async () => {
    try {
      const fn = await loadFn(req.submissionPath, req.exportName);
      const value = await fn(...req.input);
      return { ok: true, value };
    } catch (e) {
      return {
        ok: false,
        error: { name: e?.name ?? "Error", message: e?.message ?? String(e) },
      };
    }
  })();

  parentPort.postMessage(res);
});
