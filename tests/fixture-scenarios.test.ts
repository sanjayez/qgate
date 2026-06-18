import { describe, expect, it } from "vitest";
import { readJsonArtifact } from "../src/core/artifacts.js";
import type { Intent, RiskMatrix, Summary } from "../src/core/types.js";
import { createPlan } from "../src/commands/plan.js";
import { createFixtureRepo } from "./fixture-repo.js";

describe("golden fixture repos", () => {
  it("maps a form PR to form non-happy-path risks", async () => {
    const repo = await createFixtureRepo("form-pr");
    const result = await createPlan({ cwd: repo.cwd, base: repo.base, head: repo.head, runId: "fixture-form" });

    expect(result.impact.surfaces.some((surface) => surface.kind === "form")).toBe(true);
    expect(result.riskMatrix.risks.some((risk) => risk.id.startsWith("FORM-"))).toBe(true);
    await expect(readJsonArtifact<Intent>(result.artifactDir, "intent.json")).resolves.toMatchObject({ source: "git-diff" });
    await expect(readJsonArtifact<RiskMatrix>(result.artifactDir, "risk-matrix.json")).resolves.toMatchObject({
      counts: expect.objectContaining({ critical: expect.any(Number) })
    });
  });

  it("maps an API PR to API boundary risks", async () => {
    const repo = await createFixtureRepo("api-pr");
    const result = await createPlan({ cwd: repo.cwd, base: repo.base, head: repo.head, runId: "fixture-api" });

    expect(result.impact.surfaces.some((surface) => surface.kind === "api")).toBe(true);
    expect(result.riskMatrix.risks.some((risk) => risk.id.startsWith("API-"))).toBe(true);
    expect(result.riskMatrix.risks.find((risk) => risk.id.startsWith("API-"))?.scenarios).toContain("missing authentication returns 401");
  });

  it("keeps unknown runtime files visible instead of passing silently", async () => {
    const repo = await createFixtureRepo("unknown-pr");
    const result = await createPlan({ cwd: repo.cwd, base: repo.base, head: repo.head, runId: "fixture-unknown" });

    expect(result.impact.surfaces).toEqual([
      expect.objectContaining({ kind: "unknown", confidence: "low" })
    ]);
    expect(result.summary.verdict).toBe("warn");
    await expect(readJsonArtifact<Summary>(result.artifactDir, "summary.json")).resolves.toMatchObject({ verdict: "warn" });
  });
});
