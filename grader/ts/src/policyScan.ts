import { readFile } from "node:fs/promises";

export type PolicyFlags = {
  uses_fs: boolean;
  uses_child_process: boolean;
  uses_network: boolean;
  uses_worker_threads: boolean;
  dynamic_import: boolean;
};

export type PolicyScanResult = {
  flags: PolicyFlags;
  findings: string[];
  risk_score: number; // 0..1
};

function includesAny(haystack: string, needles: string[]): boolean {
  return needles.some((n) => haystack.includes(n));
}

export async function scanSubmissionPolicy(submissionPath: string): Promise<PolicyScanResult> {
  const src = await readFile(submissionPath, "utf-8");

  const flags: PolicyFlags = {
    uses_fs: includesAny(src, ["node:fs", " from \"fs\"", " from 'fs'", "require('fs')", "require(\"fs\")"]),
    uses_child_process: includesAny(src, [
      "node:child_process",
      " from \"child_process\"",
      " from 'child_process'",
      "require('child_process')",
      "require(\"child_process\")",
    ]),
    uses_network: includesAny(src, [
      "node:http",
      "node:https",
      "fetch(",
      "axios",
      " from \"http\"",
      " from \"https\"",
      " from 'http'",
      " from 'https'",
    ]),
    uses_worker_threads: includesAny(src, ["node:worker_threads", " from \"worker_threads\"", " from 'worker_threads'"] ),
    dynamic_import: includesAny(src, ["import(", "eval(", "new Function(" ]),
  };

  const findings: string[] = [];
  if (flags.uses_fs) findings.push("Uses fs");
  if (flags.uses_child_process) findings.push("Uses child_process");
  if (flags.uses_network) findings.push("Uses network APIs (http/https/fetch/axios)");
  if (flags.uses_worker_threads) findings.push("Uses worker_threads");
  if (flags.dynamic_import) findings.push("Uses dynamic code loading (import()/eval/new Function)");

  // Simple scoring: additive with cap.
  let score = 0;
  if (flags.uses_fs) score += 0.2;
  if (flags.uses_child_process) score += 0.4;
  if (flags.uses_network) score += 0.3;
  if (flags.uses_worker_threads) score += 0.2;
  if (flags.dynamic_import) score += 0.4;
  score = Math.max(0, Math.min(1, score));

  return { flags, findings, risk_score: score };
}
