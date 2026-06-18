import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createArtifactContext, readJsonArtifact, writeJsonArtifact } from "../src/core/artifacts.js";
import type { Intent } from "../src/core/types.js";

describe("artifact safety and validation", () => {
  it("validates known JSON artifacts before writing", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "qgate-artifacts-"));
    const context = await createArtifactContext(cwd, "schema-valid");

    await expect(writeJsonArtifact(context, "intent.json", { summary: "", source: "unknown", confidence: "low" }))
      .rejects
      .toThrow();
  });

  it("round-trips valid JSON artifacts through schemas", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "qgate-artifacts-"));
    const context = await createArtifactContext(cwd, "schema-roundtrip");
    const intent: Intent = {
      summary: "Local diff touches 1 file",
      source: "git-diff",
      confidence: "medium"
    };

    const filePath = await writeJsonArtifact(context, "intent.json", intent);
    const written = JSON.parse(await readFile(filePath, "utf8")) as Intent;
    const read = await readJsonArtifact<Intent>(context.runDir, "intent.json");

    expect(written).toEqual(intent);
    expect(read).toEqual(intent);
  });

  it("rejects run ids and artifact names that escape the run directory", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "qgate-artifacts-"));

    await expect(createArtifactContext(cwd, "../escape")).rejects.toThrow("Unsafe qgate run id");

    const context = await createArtifactContext(cwd, "safe-run");
    await expect(writeJsonArtifact(context, "../escape.json", { ok: true })).rejects.toThrow("Unsafe qgate artifact name");
  });
});
