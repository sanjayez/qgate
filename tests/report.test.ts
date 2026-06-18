import { describe, expect, it } from "vitest";
import { renderGateReport, renderHtmlReport, renderTestPlan } from "../src/report/render.js";
import type { ImpactMap, Intent, RiskMatrix, Summary } from "../src/core/types.js";

describe("report renderer", () => {
  it("renders markdown and html reports", () => {
    const intent: Intent = {
      summary: "Add lead form",
      source: "git-diff",
      confidence: "medium"
    };
    const impact: ImpactMap = {
      changedFiles: [{ path: "src/components/LeadForm.tsx", status: "modified" }],
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
      surfaces: [{ kind: "form", path: "src/components/LeadForm.tsx", reasons: ["form"], confidence: "high" }],
      fallow: { available: false, skippedReason: "not installed", findings: [] }
    };
    const riskMatrix: RiskMatrix = {
      risks: [
        {
          id: "FORM-001",
          title: "Form non-happy paths are covered",
          severity: "critical",
          surface: "form",
          sourcePaths: ["src/components/LeadForm.tsx"],
          scenarios: ["duplicate submit does not create duplicate side effects"],
          requiredChecks: ["playwright"],
          owasp: [],
          coverage: "planned",
          rationale: "form"
        }
      ],
      counts: { critical: 1, warning: 0, info: 0 }
    };
    const summary: Summary = {
      runId: "run",
      verdict: "warn",
      mode: "critical-blocks",
      generatedAt: "2026-06-18T00:00:00.000Z",
      artifactDir: "/tmp/project/.qgate/runs/run",
      criticalCount: 1,
      warningCount: 0,
      infoCount: 0,
      blockers: []
    };

    expect(renderTestPlan(intent, impact, riskMatrix)).toContain("FORM-001");
    const report = renderGateReport(summary, intent, impact, riskMatrix);
    expect(report).toContain("qgate Gate Report");
    expect(renderHtmlReport(report)).toContain("<h1>qgate Gate Report</h1>");
  });
});
