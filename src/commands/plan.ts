import type { Command } from "commander";
import { analyzeChangedFiles } from "../analyzers/changed-files.js";
import { runFallowAudit } from "../adapters/fallow.js";
import { getChangedFiles, isGitRepository } from "../adapters/git.js";
import { readGitHubContext } from "../adapters/github.js";
import { detectProject } from "../adapters/project.js";
import { createArtifactContext, writeJsonArtifact, writeTextArtifact } from "../core/artifacts.js";
import { loadConfig } from "../core/config.js";
import { createLogger } from "../core/logger.js";
import type { ImpactMap, Intent, QGateConfig, RiskMatrix, Summary } from "../core/types.js";
import { buildRiskMatrix, buildSummary } from "../risk/engine.js";
import { renderTestPlan } from "../report/render.js";

export interface PlanOptions {
  cwd?: string;
  base?: string;
  head?: string;
  runId?: string;
  quiet?: boolean;
}

export interface PlanResult {
  runId: string;
  artifactDir: string;
  config: QGateConfig;
  intent: Intent;
  impact: ImpactMap;
  riskMatrix: RiskMatrix;
  summary: Summary;
}

export function registerPlanCommand(program: Command): void {
  program
    .command("plan")
    .description("Generate intent, impact map, risk matrix, and test plan artifacts")
    .option("--base <ref>", "base git ref", process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : "origin/main")
    .option("--head <ref>", "head git ref", process.env.GITHUB_SHA ?? "HEAD")
    .option("--run-id <id>", "override generated run id")
    .option("--quiet", "reduce command output")
    .action(async (options: PlanOptions) => {
      const logger = createLogger(Boolean(options.quiet));
      try {
        const result = await createPlan({ ...options, cwd: process.cwd() });
        logger.success(`qgate plan written to ${result.artifactDir}`);
      } catch (error) {
        logger.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 2;
      }
    });
}

export async function createPlan(options: PlanOptions): Promise<PlanResult> {
  const cwd = options.cwd ?? process.cwd();
  const base = options.base ?? "origin/main";
  const head = options.head ?? "HEAD";

  if (!(await isGitRepository(cwd))) {
    throw new Error("qgate plan must run inside a git repository");
  }

  const { config } = await loadConfig(cwd);
  const artifactContext = await createArtifactContext(cwd, options.runId);
  const github = await readGitHubContext();
  const changedFiles = await getChangedFiles(cwd, base, head);
  const project = await detectProject(cwd);
  const surfaces = await analyzeChangedFiles(cwd, changedFiles);
  const fallow = await runFallowAudit(cwd, config.tools.fallow.enabled);
  const impact: ImpactMap = { changedFiles, project, surfaces, fallow, github };
  const intent = inferIntent(github, changedFiles);
  const riskMatrix = buildRiskMatrix(surfaces, fallow);
  const summary = buildSummary({
    runId: artifactContext.runId,
    artifactDir: artifactContext.runDir,
    mode: config.mode,
    intent,
    changedFileCount: changedFiles.length,
    riskMatrix,
    fallow
  });

  await writeJsonArtifact(artifactContext, "intent.json", intent);
  await writeJsonArtifact(artifactContext, "impact-map.json", impact);
  await writeJsonArtifact(artifactContext, "risk-matrix.json", riskMatrix);
  await writeTextArtifact(artifactContext, "test-plan.md", renderTestPlan(intent, impact, riskMatrix));
  await writeJsonArtifact(artifactContext, "summary.json", summary);

  return {
    runId: artifactContext.runId,
    artifactDir: artifactContext.runDir,
    config,
    intent,
    impact,
    riskMatrix,
    summary
  };
}

function inferIntent(github: ImpactMap["github"], changedFiles: ImpactMap["changedFiles"]): Intent {
  const title = github?.pullRequest?.title?.trim();
  const body = github?.pullRequest?.body?.trim();

  if (title) {
    return {
      summary: body ? `${title} - ${firstSentence(body)}` : title,
      source: "github-pr",
      confidence: "high"
    };
  }

  if (changedFiles.length > 0) {
    const preview = changedFiles.slice(0, 5).map((file) => file.path).join(", ");
    const suffix = changedFiles.length > 5 ? ` and ${changedFiles.length - 5} more` : "";
    return {
      summary: `Local diff touches ${changedFiles.length} file(s): ${preview}${suffix}`,
      source: "git-diff",
      confidence: "medium"
    };
  }

  return {
    summary: "No changed files detected",
    source: "unknown",
    confidence: "low"
  };
}

function firstSentence(value: string): string {
  return value.split(/\r?\n/u).find((line) => line.trim().length > 0)?.trim() ?? "";
}
