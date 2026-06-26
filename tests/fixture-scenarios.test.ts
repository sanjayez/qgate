// Golden scenarios prove QGate's known-answer behavior on tiny fake PRs.
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { readJsonArtifact } from "../src/core/artifacts.js";
import { JSON_ARTIFACT_NAMES } from "../src/core/schemas.js";
import { createPlan } from "../src/commands/plan.js";
import { createFixtureRepo } from "./fixture-repo.js";

describe("golden fixture repos", () => {
  it("maps a form PR to form non-happy-path risks", async () => {
    const repo = await createFixtureRepo("form-pr");
    const result = await createPlan({ cwd: repo.cwd, base: repo.base, head: repo.head, runId: "fixture-form", env: {} });

    expect(result.impact.surfaces.some((surface) => surface.kind === "form")).toBe(true);
    expect(result.riskMatrix.risks.some((risk) => risk.id.startsWith("FORM-"))).toBe(true);
    await expect(readJsonArtifact(result.artifactDir, JSON_ARTIFACT_NAMES.intent)).resolves.toMatchObject({ source: "git-diff" });
    await expect(readJsonArtifact(result.artifactDir, JSON_ARTIFACT_NAMES.riskMatrix)).resolves.toMatchObject({
      counts: expect.objectContaining({ critical: expect.any(Number) })
    });
  });

  it("maps an API PR to API boundary risks", async () => {
    const repo = await createFixtureRepo("api-pr");
    const result = await createPlan({ cwd: repo.cwd, base: repo.base, head: repo.head, runId: "fixture-api", env: {} });

    expect(result.impact.surfaces.some((surface) => surface.kind === "api")).toBe(true);
    expect(result.riskMatrix.risks.some((risk) => risk.id.startsWith("API-"))).toBe(true);
    expect(result.riskMatrix.risks.find((risk) => risk.id.startsWith("API-"))?.scenarios).toContain("missing authentication returns 401");
  });

  it("keeps unknown runtime files visible instead of passing silently", async () => {
    const repo = await createFixtureRepo("unknown-pr");
    const result = await createPlan({ cwd: repo.cwd, base: repo.base, head: repo.head, runId: "fixture-unknown", env: {} });

    expect(result.impact.surfaces).toEqual([
      expect.objectContaining({ kind: "unknown", confidence: "low" })
    ]);
    expect(result.summary.verdict).toBe("warn");
    await expect(readJsonArtifact(result.artifactDir, JSON_ARTIFACT_NAMES.summary)).resolves.toMatchObject({ verdict: "warn" });
  });

  it("uses explicit env values for GitHub PR intent", async () => {
    const repo = await createFixtureRepo("form-pr");
    const eventPath = path.join(repo.cwd, "event.json");
    await writeFile(
      eventPath,
      JSON.stringify({
        pull_request: {
          number: 12,
          title: "Add contact form",
          body: "Covers the lead capture flow.",
          html_url: "https://example.test/pull/12",
          base: { ref: "main" },
          head: { ref: "feature/form" }
        }
      }),
      "utf8"
    );

    const result = await createPlan({
      cwd: repo.cwd,
      base: repo.base,
      head: repo.head,
      runId: "fixture-github-env",
      env: {
        GITHUB_ACTIONS: "true",
        GITHUB_EVENT_NAME: "pull_request",
        GITHUB_EVENT_PATH: eventPath,
        GITHUB_REPOSITORY: "owner/repo"
      }
    });

    expect(result.intent).toMatchObject({
      source: "github-pr",
      confidence: "high",
      summary: "Add contact form - Covers the lead capture flow."
    });
  });
});
