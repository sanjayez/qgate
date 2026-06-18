import type { ImpactMap, Intent, RiskMatrix, Summary } from "../core/types.js";

export function renderTestPlan(intent: Intent, impact: ImpactMap, riskMatrix: RiskMatrix): string {
  const lines: string[] = [
    "# qgate Test Plan",
    "",
    "## Intent",
    "",
    `- Summary: ${intent.summary}`,
    `- Source: ${intent.source}`,
    `- Confidence: ${intent.confidence}`,
    "",
    "## Impacted Surfaces",
    ""
  ];

  for (const surface of impact.surfaces) {
    lines.push(`- ${surface.kind}: \`${surface.path}\` (${surface.confidence})`);
  }

  if (impact.surfaces.length === 0) {
    lines.push("- No changed surfaces detected.");
  }

  lines.push("", "## Non-Happy-Path Obligations", "");

  for (const risk of riskMatrix.risks) {
    lines.push(`### ${risk.id}: ${risk.title}`);
    lines.push("");
    lines.push(`- Severity: ${risk.severity}`);
    lines.push(`- Surface: ${risk.surface}`);
    lines.push(`- Source paths: ${risk.sourcePaths.map((item) => `\`${item}\``).join(", ") || "n/a"}`);
    lines.push(`- Required checks: ${risk.requiredChecks.join(", ") || "n/a"}`);
    if (risk.owasp.length > 0) {
      lines.push(`- Security map: ${risk.owasp.join(", ")}`);
    }
    lines.push("- Scenarios:");
    for (const scenario of risk.scenarios) {
      lines.push(`  - ${scenario}`);
    }
    lines.push("");
  }

  if (riskMatrix.risks.length === 0) {
    lines.push("No risk obligations generated.");
  }

  return lines.join("\n");
}

export function renderGateReport(summary: Summary, intent: Intent, impact: ImpactMap, riskMatrix: RiskMatrix): string {
  const lines: string[] = [
    "# qgate Gate Report",
    "",
    `- Verdict: ${summary.verdict}`,
    `- Mode: ${summary.mode}`,
    `- Run: ${summary.runId}`,
    `- Artifact dir: ${summary.artifactDir}`,
    `- Generated: ${summary.generatedAt}`,
    "",
    "## Intent",
    "",
    `- ${intent.summary}`,
    `- Confidence: ${intent.confidence}`,
    "",
    "## Counts",
    "",
    `- Critical risks: ${summary.criticalCount}`,
    `- Warning risks: ${summary.warningCount}`,
    `- Info risks: ${summary.infoCount}`,
    `- Blockers: ${summary.blockers.length}`,
    "",
    "## Blockers",
    ""
  ];

  if (summary.blockers.length === 0) {
    lines.push("- None");
  } else {
    for (const blocker of summary.blockers) {
      lines.push(`- ${blocker.id}: ${blocker.title}${blocker.message ? ` - ${blocker.message}` : ""}`);
    }
  }

  lines.push("", "## Impact", "");
  lines.push(`- Changed files: ${impact.changedFiles.length}`);
  lines.push(`- Classified surfaces: ${impact.surfaces.length}`);
  lines.push(`- Project type: ${impact.project.projectType}`);
  lines.push(`- Package manager: ${impact.project.packageManager}`);
  lines.push(`- Fallow: ${impact.fallow.available ? `available (${impact.fallow.verdict ?? "unknown"})` : `skipped (${impact.fallow.skippedReason ?? "unavailable"})`}`);

  lines.push("", "## Top Risks", "");
  for (const risk of riskMatrix.risks.slice(0, 20)) {
    lines.push(`- ${risk.id} [${risk.severity}] ${risk.title} (${risk.sourcePaths.join(", ") || "n/a"})`);
  }
  if (riskMatrix.risks.length === 0) {
    lines.push("- None");
  }

  return lines.join("\n");
}

export function renderHtmlReport(markdown: string): string {
  const body = markdown
    .split(/\r?\n/u)
    .map((line) => renderMarkdownLine(line))
    .join("\n");

  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    "<title>qgate report</title>",
    "<style>",
    "body{font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;max-width:980px;margin:40px auto;padding:0 24px;line-height:1.55;color:#17202a}",
    "code{background:#f2f4f8;padding:2px 5px;border-radius:4px}",
    "pre{background:#f8fafc;padding:16px;border-radius:8px;overflow:auto}",
    "h1,h2,h3{line-height:1.2}",
    "li{margin:4px 0}",
    "</style>",
    "</head>",
    "<body>",
    body,
    "</body>",
    "</html>"
  ].join("\n");
}

function renderMarkdownLine(line: string): string {
  if (line.startsWith("### ")) return `<h3>${escapeHtml(line.slice(4))}</h3>`;
  if (line.startsWith("## ")) return `<h2>${escapeHtml(line.slice(3))}</h2>`;
  if (line.startsWith("# ")) return `<h1>${escapeHtml(line.slice(2))}</h1>`;
  if (line.startsWith("- ")) return `<li>${renderInline(line.slice(2))}</li>`;
  if (line.trim() === "") return "";
  return `<p>${renderInline(line)}</p>`;
}

function renderInline(value: string): string {
  return escapeHtml(value).replace(/`([^`]+)`/gu, "<code>$1</code>");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/gu, "&amp;")
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;")
    .replace(/"/gu, "&quot;");
}
