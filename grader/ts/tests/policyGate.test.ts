import { describe, expect, it } from "vitest";
import { policyGate } from "../src/policyGate";

describe("policyGate", () => {
  it("blocks on child_process", () => {
    const gate = policyGate({
      flags: {
        uses_fs: false,
        uses_child_process: true,
        uses_network: false,
        uses_worker_threads: false,
        dynamic_import: false,
      },
      risk_score: 0,
    });
    expect(gate.decision).toBe("blocked");
  });

  it("requires human on fs", () => {
    const gate = policyGate({
      flags: {
        uses_fs: true,
        uses_child_process: false,
        uses_network: false,
        uses_worker_threads: false,
        dynamic_import: false,
      },
      risk_score: 0,
    });
    expect(gate.decision).toBe("requires_human");
  });

  it("allows clean submission", () => {
    const gate = policyGate({
      flags: {
        uses_fs: false,
        uses_child_process: false,
        uses_network: false,
        uses_worker_threads: false,
        dynamic_import: false,
      },
      risk_score: 0,
    });
    expect(gate.decision).toBe("allow");
  });
});
