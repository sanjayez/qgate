import type { Command } from "commander";
import { createLogger } from "../core/logger.js";
import { writeTextArtifact } from "../core/artifacts.js";
import { renderGateReport, renderHtmlReport } from "../report/render.js";
import { createPlan, type PlanOptions } from "./plan.js";

export function registerRunCommand(program: Command): void {
  program
    .command("run")
    .description("Run qgate plan and apply the configured gate verdict")
    .option("--base <ref>", "base git ref", process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : "origin/main")
    .option("--head <ref>", "head git ref", process.env.GITHUB_SHA ?? "HEAD")
    .option("--run-id <id>", "override generated run id")
    .option("--quiet", "reduce command output")
    .action(async (options: PlanOptions) => {
      const logger = createLogger(Boolean(options.quiet));
      try {
        const result = await runCommand({ ...options, cwd: process.cwd() });
        const message = `qgate ${result.summary.verdict}: ${result.artifactDir}`;
        if (result.summary.verdict === "fail") {
          logger.error(message);
          process.exitCode = result.summary.mode === "report-only" ? 0 : 1;
        } else if (result.summary.verdict === "warn") {
          logger.warn(message);
        } else {
          logger.success(message);
        }
      } catch (error) {
        logger.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 2;
      }
    });
}

export async function runCommand(options: PlanOptions) {
  const result = await createPlan(options);
  const markdown = renderGateReport(result.summary, result.intent, result.impact, result.riskMatrix);
  await writeTextArtifact(
    {
      cwd: options.cwd ?? process.cwd(),
      runId: result.runId,
      rootDir: "",
      runDir: result.artifactDir
    },
    "gate-report.md",
    markdown
  );
  await writeTextArtifact(
    {
      cwd: options.cwd ?? process.cwd(),
      runId: result.runId,
      rootDir: "",
      runDir: result.artifactDir
    },
    "gate-report.html",
    renderHtmlReport(markdown)
  );
  return result;
}
