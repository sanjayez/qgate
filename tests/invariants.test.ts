// Invariants protect the trust model: a gate must not accidentally become permissive.
import { describe, expect, it } from "vitest";
import { buildRiskMatrix, buildSummary } from "../src/risk/engine.js";
import { renderGateReport } from "../src/report/render.js";
import type { FallowResult, ImpactMap, Intent, RiskMatrix, Summary, Surface } from "../src/core/types.js";

const noFallow: FallowResult = {
  available: false,
  skippedReason: "not installed",
  findings: []
};

const mediumIntent: Intent = {
  summary: "Local diff touches 1 file",
  source: "git-diff",
  confidence: "medium"
};

describe("quality invariants", () => {
  it("never converts critical blockers into pass verdicts", () => {
    const summary = buildSummary({
      runId: "run",
      artifactDir: "/tmp/run",
      mode: "critical-blocks",
      intent: { summary: "unknown", source: "unknown", confidence: "low" },
      changedFileCount: 1,
      riskMatrix: { risks: [], counts: { critical: 0, warning: 0, info: 0 } },
      fallow: noFallow
    });

    expect(summary.verdict).toBe("fail");
    expect(summary.blockers.map((blocker) => blocker.id)).toContain("INTENT-001");
  });

  it("keeps report-only mode non-blocking even when risks exist", () => {
    const surfaces: Surface[] = [
      { kind: "api", path: "src/app/api/leads/route.ts", reasons: ["API route changed"], confidence: "high" }
    ];
    const riskMatrix = buildRiskMatrix(surfaces, noFallow);

    const summary = buildSummary({
      runId: "run",
      artifactDir: "/tmp/run",
      mode: "report-only",
      intent: mediumIntent,
      changedFileCount: 1,
      riskMatrix,
      fallow: noFallow
    });

    expect(summary.verdict).toBe("warn");
    expect(summary.blockers).toEqual([]);
  });

  it("requires every generated risk to carry traceable review evidence", () => {
    const riskMatrix = buildRiskMatrix(
      [
        { kind: "form", path: "src/components/LeadForm.tsx", reasons: ["form detected"], confidence: "high" },
        { kind: "unknown", path: "src/domain/rules/payment.rules", reasons: ["unclassified"], confidence: "low" }
      ],
      noFallow
    );

    for (const risk of riskMatrix.risks) {
      expect(risk.sourcePaths.length).toBeGreaterThan(0);
      expect(risk.scenarios.length).toBeGreaterThan(0);
      expect(risk.requiredChecks.length).toBeGreaterThan(0);
      expect(risk.rationale).toContain("Source signal:");
    }
  });

  it("reports include artifact paths and blocker reasons", () => {
    const summary: Summary = {
      runId: "run",
      verdict: "fail",
      mode: "critical-blocks",
      generatedAt: "2026-06-18T00:00:00.000Z",
      artifactDir: "/tmp/project/.qgate/runs/run",
      criticalCount: 0,
      warningCount: 0,
      infoCount: 0,
      blockers: [
        {
          id: "INTENT-001",
          severity: "critical",
          source: "intent",
          title: "PR intent could not be inferred",
          message: "Add a clear PR title/body."
        }
      ]
    };
    const impact: ImpactMap = {
      changedFiles: [],
      project: {
        root: "/tmp/project",
        packageManager: "pnpm",
        projectType: "next-react",
        scripts: {},
        dependencies: {},
        devDependencies: {},
        hasNext: true,
        hasReact: true,
        hasPlaywright: false,
        testRunners: [],
        openApiFiles: []
      },
      surfaces: [],
      fallow: noFallow
    };
    const riskMatrix: RiskMatrix = { risks: [], counts: { critical: 0, warning: 0, info: 0 } };

    const report = renderGateReport(summary, { summary: "unknown", source: "unknown", confidence: "low" }, impact, riskMatrix);

    expect(report).toContain("Artifact dir: /tmp/project/.qgate/runs/run");
    expect(report).toContain("INTENT-001: PR intent could not be inferred - Add a clear PR title/body.");
  });
});
