import type { FallowResult, GateBlocker, GateMode, Intent, RiskItem, RiskMatrix, Severity, Summary, Surface, Verdict } from "../core/types.js";
import { templateForSurface } from "./catalog.js";

export function buildRiskMatrix(surfaces: Surface[], fallow: FallowResult): RiskMatrix {
  const risks: RiskItem[] = [];
  let counter = 1;

  for (const surface of surfaces) {
    for (const template of templateForSurface(surface.kind)) {
      risks.push({
        id: `${prefixFor(surface.kind)}-${String(counter).padStart(3, "0")}`,
        title: template.title,
        severity: template.severity,
        surface: surface.kind,
        sourcePaths: [surface.path],
        scenarios: template.scenarios,
        requiredChecks: template.requiredChecks,
        owasp: template.owasp,
        coverage: "planned",
        rationale: `${template.rationale} Source signal: ${surface.reasons.join("; ")}.`
      });
      counter += 1;
    }
  }

  for (const finding of fallow.findings.filter((item) => item.severity === "critical")) {
    risks.push({
      id: `FALLOW-${String(counter).padStart(3, "0")}`,
      title: finding.title,
      severity: "critical",
      surface: "unknown",
      sourcePaths: finding.path ? [finding.path] : [],
      scenarios: [finding.message ?? "Review Fallow fail-level finding before merge."],
      requiredChecks: ["static-analysis"],
      owasp: [],
      coverage: "planned",
      rationale: "Fallow reported a fail-level changed-code finding."
    });
    counter += 1;
  }

  return {
    risks,
    counts: countBySeverity(risks)
  };
}

export function buildSummary(input: {
  runId: string;
  artifactDir: string;
  mode: GateMode;
  intent: Intent;
  changedFileCount: number;
  riskMatrix: RiskMatrix;
  fallow: FallowResult;
}): Summary {
  const blockers = collectBlockers(input);
  const verdict = calculateVerdict(input.mode, blockers, input.riskMatrix);

  return {
    runId: input.runId,
    verdict,
    mode: input.mode,
    generatedAt: new Date().toISOString(),
    artifactDir: input.artifactDir,
    criticalCount: input.riskMatrix.counts.critical,
    warningCount: input.riskMatrix.counts.warning,
    infoCount: input.riskMatrix.counts.info,
    blockers
  };
}

function collectBlockers(input: {
  intent: Intent;
  changedFileCount: number;
  fallow: FallowResult;
}): GateBlocker[] {
  const blockers: GateBlocker[] = [];

  if (input.changedFileCount > 0 && input.intent.confidence === "low") {
    blockers.push({
      id: "INTENT-001",
      severity: "critical",
      source: "intent",
      title: "PR intent could not be inferred",
      message: "Add a clear PR title/body or run qgate with richer PR metadata."
    });
  }

  if (input.fallow.available && input.fallow.verdict === "fail") {
    blockers.push({
      id: "FALLOW-001",
      severity: "critical",
      source: "fallow",
      title: "Fallow reported fail-level changed-code risk",
      message: "Review Fallow findings before merge."
    });
  }

  return blockers;
}

function calculateVerdict(mode: GateMode, blockers: GateBlocker[], riskMatrix: RiskMatrix): Verdict {
  if (mode === "report-only") {
    return riskMatrix.risks.length > 0 ? "warn" : "pass";
  }

  if (blockers.length > 0) {
    return "fail";
  }

  if (mode === "strict" && riskMatrix.counts.critical > 0) {
    return "fail";
  }

  return riskMatrix.risks.length > 0 ? "warn" : "pass";
}

function countBySeverity(risks: RiskItem[]): Record<Severity, number> {
  return {
    critical: risks.filter((risk) => risk.severity === "critical").length,
    warning: risks.filter((risk) => risk.severity === "warning").length,
    info: risks.filter((risk) => risk.severity === "info").length
  };
}

function prefixFor(kind: Surface["kind"]): string {
  return {
    form: "FORM",
    api: "API",
    auth: "AUTH",
    data: "DATA",
    dependency: "DEP",
    config: "CFG",
    route: "ROUTE",
    component: "UI",
    test: "TEST",
    unknown: "UNK"
  }[kind];
}
