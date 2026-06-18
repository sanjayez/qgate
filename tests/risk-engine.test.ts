import { describe, expect, it } from "vitest";
import { buildRiskMatrix, buildSummary } from "../src/risk/engine.js";
import type { FallowResult, Intent, Surface } from "../src/core/types.js";

const noFallow: FallowResult = {
  available: false,
  skippedReason: "not installed",
  findings: []
};

describe("risk engine", () => {
  it("expands form surfaces into non-happy-path scenarios", () => {
    const surfaces: Surface[] = [
      {
        kind: "form",
        path: "src/components/LeadForm.tsx",
        confidence: "high",
        reasons: ["form detected"]
      }
    ];

    const matrix = buildRiskMatrix(surfaces, noFallow);

    expect(matrix.counts.critical).toBe(1);
    expect(matrix.risks[0]?.scenarios).toContain("duplicate submit does not create duplicate side effects");
    expect(matrix.risks[0]?.requiredChecks).toContain("playwright");
  });

  it("fails on low-confidence intent for non-empty changes", () => {
    const intent: Intent = {
      summary: "unknown",
      source: "unknown",
      confidence: "low"
    };
    const matrix = buildRiskMatrix([], noFallow);

    const summary = buildSummary({
      runId: "run",
      artifactDir: "/tmp/run",
      mode: "critical-blocks",
      intent,
      changedFileCount: 1,
      riskMatrix: matrix,
      fallow: noFallow
    });

    expect(summary.verdict).toBe("fail");
    expect(summary.blockers[0]?.id).toBe("INTENT-001");
  });

  it("treats fallow fail verdict as a blocker", () => {
    const intent: Intent = {
      summary: "Update form",
      source: "git-diff",
      confidence: "medium"
    };
    const fallow: FallowResult = {
      available: true,
      verdict: "fail",
      findings: []
    };
    const matrix = buildRiskMatrix([], fallow);

    const summary = buildSummary({
      runId: "run",
      artifactDir: "/tmp/run",
      mode: "critical-blocks",
      intent,
      changedFileCount: 1,
      riskMatrix: matrix,
      fallow
    });

    expect(summary.verdict).toBe("fail");
    expect(summary.blockers[0]?.id).toBe("FALLOW-001");
  });
});
