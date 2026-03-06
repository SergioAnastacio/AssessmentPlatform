import type { PolicyFlags } from "./policyScan";

export type PolicyDecision = "allow" | "requires_human" | "blocked";

export type PolicyGateResult = {
  decision: PolicyDecision;
  reasons: string[];
  // Useful to keep centralized thresholds
  thresholds: {
    requires_human_risk_score: number;
    blocked_risk_score: number;
  };
};

export function policyGate(opts: {
  flags?: PolicyFlags;
  risk_score?: number;
}): PolicyGateResult {
  const thresholds = {
    requires_human_risk_score: 0.3,
    blocked_risk_score: 0.6,
  };

  const reasons: string[] = [];
  const risk = opts.risk_score ?? 0;
  const f = opts.flags;

  // Hard blocks (Phase 1 MVP): these are high-risk in shared runners.
  if (f?.uses_child_process) reasons.push("uses_child_process");
  if (f?.dynamic_import) reasons.push("dynamic_code_loading");
  if (f?.uses_network) reasons.push("uses_network");
  if (risk >= thresholds.blocked_risk_score) reasons.push(`risk_score>=${thresholds.blocked_risk_score}`);

  if (reasons.length > 0) {
    return { decision: "blocked", reasons, thresholds };
  }

  // Requires human review: moderate risk.
  const humanReasons: string[] = [];
  if (f?.uses_fs) humanReasons.push("uses_fs");
  if (f?.uses_worker_threads) humanReasons.push("uses_worker_threads");
  if (risk >= thresholds.requires_human_risk_score)
    humanReasons.push(`risk_score>=${thresholds.requires_human_risk_score}`);

  if (humanReasons.length > 0) {
    return { decision: "requires_human", reasons: humanReasons, thresholds };
  }

  return { decision: "allow", reasons: [], thresholds };
}
