import type { Command } from "commander";
import { createArtifactContextFromRunDir, readJsonArtifact, resolveRunDir, writeTextArtifact } from "../core/artifacts.js";
import { createLogger } from "../core/logger.js";
import { JSON_ARTIFACT_NAMES } from "../core/schemas.js";
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
  const intent = await readJsonArtifact(runDir, JSON_ARTIFACT_NAMES.intent);
  const impact = await readJsonArtifact(runDir, JSON_ARTIFACT_NAMES.impactMap);
  const riskMatrix = await readJsonArtifact(runDir, JSON_ARTIFACT_NAMES.riskMatrix);
  const summary = await readJsonArtifact(runDir, JSON_ARTIFACT_NAMES.summary);
  const markdown = renderGateReport(summary, intent, impact, riskMatrix);
  const context = createArtifactContextFromRunDir(cwd, summary.runId, runDir);

  await writeTextArtifact(context, "gate-report.md", markdown);
  await writeTextArtifact(context, "gate-report.html", renderHtmlReport(markdown));

  return runDir;
}
