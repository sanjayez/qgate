import type { Command } from "commander";
import { readJsonArtifact, resolveRunDir, writeTextArtifact } from "../core/artifacts.js";
import { createLogger } from "../core/logger.js";
import type { ImpactMap, Intent, RiskMatrix, Summary } from "../core/types.js";
import { renderGateReport, renderHtmlReport } from "../report/render.js";

interface ReportOptions {
  cwd?: string;
  quiet?: boolean;
}

export function registerReportCommand(program: Command): void {
  program
    .command("report")
    .description("Render Markdown and HTML reports from an existing qgate run")
    .argument("[run-id]", "run id or latest", "latest")
    .option("--quiet", "reduce command output")
    .action(async (runId: string, options: ReportOptions) => {
      const logger = createLogger(Boolean(options.quiet));
      try {
        const runDir = await reportCommand(runId, { ...options, cwd: process.cwd() });
        logger.success(`qgate report written to ${runDir}`);
      } catch (error) {
        logger.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 2;
      }
    });
}

export async function reportCommand(runId: string, options: ReportOptions): Promise<string> {
  const cwd = options.cwd ?? process.cwd();
  const runDir = await resolveRunDir(cwd, runId);
  const intent = await readJsonArtifact<Intent>(runDir, "intent.json");
  const impact = await readJsonArtifact<ImpactMap>(runDir, "impact-map.json");
  const riskMatrix = await readJsonArtifact<RiskMatrix>(runDir, "risk-matrix.json");
  const summary = await readJsonArtifact<Summary>(runDir, "summary.json");
  const markdown = renderGateReport(summary, intent, impact, riskMatrix);
  const context = { cwd, runId: summary.runId, rootDir: "", runDir };

  await writeTextArtifact(context, "gate-report.md", markdown);
  await writeTextArtifact(context, "gate-report.html", renderHtmlReport(markdown));

  return runDir;
}
