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

  it("fails critical-blocks mode when critical risk obligations exist", () => {
    const intent: Intent = {
      summary: "Update form",
      source: "git-diff",
      confidence: "medium"
    };
    const matrix = buildRiskMatrix([
      {
        kind: "form",
        path: "src/components/LeadForm.tsx",
        confidence: "high",
        reasons: ["form detected"]
      }
    ], noFallow);

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
    expect(summary.blockers.map((blocker) => blocker.id)).toContain("RISK-CRITICAL-001");
  });

  it("keeps report-only mode non-blocking for critical risks", () => {
    const intent: Intent = {
      summary: "Update form",
      source: "git-diff",
      confidence: "medium"
    };
    const matrix = buildRiskMatrix([
      {
        kind: "form",
        path: "src/components/LeadForm.tsx",
        confidence: "high",
        reasons: ["form detected"]
      }
    ], noFallow);

    const summary = buildSummary({
      runId: "run",
      artifactDir: "/tmp/run",
      mode: "report-only",
      intent,
      changedFileCount: 1,
      riskMatrix: matrix,
      fallow: noFallow
    });

    expect(summary.verdict).toBe("warn");
    expect(summary.blockers).toEqual([]);
  });

  it("does not emit intent blockers in report-only mode", () => {
    const intent: Intent = {
      summary: "unknown",
      source: "unknown",
      confidence: "low"
    };
    const matrix = buildRiskMatrix([], noFallow);

    const summary = buildSummary({
      runId: "run",
      artifactDir: "/tmp/run",
      mode: "report-only",
      intent,
      changedFileCount: 1,
      riskMatrix: matrix,
      fallow: noFallow
    });

    expect(summary.verdict).toBe("pass");
    expect(summary.blockers).toEqual([]);
  });

  it("derives generatedAt deterministically from timestamp-shaped run ids", () => {
    const intent: Intent = {
      summary: "No changed files detected",
      source: "unknown",
      confidence: "low"
    };
    const matrix = buildRiskMatrix([], noFallow);
    const input = {
      runId: "2026-06-18T12-34-56-789Z",
      artifactDir: "/tmp/run",
      mode: "report-only" as const,
      intent,
      changedFileCount: 0,
      riskMatrix: matrix,
      fallow: noFallow
    };

    expect(buildSummary(input)).toEqual(buildSummary(input));
    expect(buildSummary(input).generatedAt).toBe("2026-06-18T12:34:56.789Z");
  });
});
