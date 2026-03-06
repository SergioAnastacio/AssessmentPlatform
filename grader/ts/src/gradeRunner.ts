import { spawn } from "node:child_process";
import path from "node:path";

import type { GradeResult } from "./grader";

export type RunnerOptions = {
  problemId: string;
  submissionRelPath: string;
  exportName: string;
  timeoutMs: number;
  maxOutputBytes: number;
};

export type ErrorCode =
  | "TIMEOUT"
  | "RUNTIME_ERROR"
  | "BAD_JSON"
  | "NONZERO_EXIT"
  | "FAILED_TESTS"
  | "UNKNOWN";

export type RunnerOutcome = {
  grade?: GradeResult;
  timed_out: boolean;
  exit_code: number | null;
  stdout_truncated: boolean;
  stderr_truncated: boolean;
  stdout: string;
  stderr: string;
  error_code?: ErrorCode;
  error?: { name: string; message: string };
};

function truncateBytes(s: string, maxBytes: number): { text: string; truncated: boolean } {
  const buf = Buffer.from(s, "utf-8");
  if (buf.length <= maxBytes) return { text: s, truncated: false };
  const sliced = buf.subarray(0, maxBytes);
  return { text: sliced.toString("utf-8"), truncated: true };
}

export async function runWithTimeout(opts: RunnerOptions): Promise<RunnerOutcome> {
  const repoRoot = path.resolve(process.cwd(), "..", "..");

  // Execute harness in a separate process so we can enforce timeouts safely.
  // Use Node's `--import tsx` to avoid relying on `npx` availability.
  const child = spawn(
    process.execPath,
    [
      "--import",
      "tsx",
      "src/harness.ts",
      "--problem",
      opts.problemId,
      "--submission",
      opts.submissionRelPath,
      "--export",
      opts.exportName,
    ],
    {
      cwd: path.join(repoRoot, "grader", "ts"),
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        NODE_ENV: "production",
      },
    }
  );

  let stdout = "";
  let stderr = "";
  let stdout_truncated = false;
  let stderr_truncated = false;

  child.stdout.setEncoding("utf-8");
  child.stderr.setEncoding("utf-8");

  child.stdout.on("data", (chunk: string) => {
    if (stdout_truncated) return;
    stdout += chunk;
    const t = truncateBytes(stdout, opts.maxOutputBytes);
    stdout = t.text;
    stdout_truncated = t.truncated;
  });

  child.stderr.on("data", (chunk: string) => {
    if (stderr_truncated) return;
    stderr += chunk;
    const t = truncateBytes(stderr, opts.maxOutputBytes);
    stderr = t.text;
    stderr_truncated = t.truncated;
  });

  const exitPromise = new Promise<{ exit_code: number | null; error?: Error }>((resolve) => {
    child.on("exit", (code) => resolve({ exit_code: code }));
    child.on("error", (err) => resolve({ exit_code: null, error: err as Error }));
  });

  const timeoutPromise = new Promise<{ timed_out: true }>((resolve) => {
    setTimeout(() => {
      child.kill("SIGKILL");
      resolve({ timed_out: true });
    }, opts.timeoutMs);
  });

  const raced = await Promise.race([exitPromise, timeoutPromise]);

  if ("timed_out" in raced) {
    const ex = await exitPromise;
    return {
      timed_out: true,
      exit_code: ex.exit_code,
      stdout_truncated,
      stderr_truncated,
      stdout,
      stderr,
      error_code: "TIMEOUT",
      error: { name: "TimeoutError", message: `Timed out after ${opts.timeoutMs}ms` },
    };
  }

  const exit_code = raced.exit_code;
  if (raced.error) {
    return {
      timed_out: false,
      exit_code,
      stdout_truncated,
      stderr_truncated,
      stdout,
      stderr,
      error_code: "RUNTIME_ERROR",
      error: { name: raced.error.name, message: raced.error.message },
    };
  }

  // Harness prints raw JSON (no formatting). Try parsing whole stdout.
  // If child logged something accidentally, parsing may fail; we return stderr/stdout for debugging.
  type HarnessEnvelope =
    | { ok: true; grade: GradeResult }
    | { ok: false; phase: string; error: { name: string; message: string } };

  let env: HarnessEnvelope | null = null;
  try {
    env = JSON.parse(stdout) as HarnessEnvelope;
  } catch (e) {
    const err = e as Error;
    return {
      timed_out: false,
      exit_code,
      stdout_truncated,
      stderr_truncated,
      stdout,
      stderr,
      error_code: "BAD_JSON",
      error: { name: err.name ?? "ParseError", message: err.message ?? "Failed to parse JSON" },
    };
  }

  // If harness itself reported an error, classify as runtime error.
  if (env && "ok" in env && env.ok === false) {
    return {
      timed_out: false,
      exit_code,
      stdout_truncated,
      stderr_truncated,
      stdout,
      stderr,
      error_code: "RUNTIME_ERROR",
      error: { name: env.error.name, message: `${env.phase}: ${env.error.message}` },
    };
  }

  // At this point we have a grade object.
  const grade = (env as { ok: true; grade: GradeResult }).grade;

  // Non-zero exit is still useful signal but grade is authoritative.
  if (exit_code !== 0) {
    return {
      timed_out: false,
      exit_code,
      stdout_truncated,
      stderr_truncated,
      stdout,
      stderr,
      grade,
      error_code: "NONZERO_EXIT",
      error: { name: "NonZeroExit", message: `Harness exited with code ${String(exit_code)}` },
    };
  }

  // Domain failure: tests failed
  if (!grade.passed) {
    return {
      timed_out: false,
      exit_code,
      stdout_truncated,
      stderr_truncated,
      stdout,
      stderr,
      grade,
      error_code: "FAILED_TESTS",
      error: { name: "FailedTests", message: "One or more test cases failed" },
    };
  }

  return {
    timed_out: false,
    exit_code,
    stdout_truncated,
    stderr_truncated,
    stdout,
    stderr,
    grade,
  };
}
