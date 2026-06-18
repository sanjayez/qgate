import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { analyzeChangedFiles, classifyFile } from "../src/analyzers/changed-files.js";

describe("changed file analyzer", () => {
  it("classifies form components", () => {
    const surfaces = classifyFile(
      { path: "src/components/SignupForm.tsx", status: "modified" },
      `export function SignupForm(){ return <form onSubmit={() => {}}><input name="email" /></form>; }`
    );

    expect(surfaces.map((surface) => surface.kind)).toEqual(expect.arrayContaining(["component", "form"]));
  });

  it("classifies Next API routes and auth signals", () => {
    const surfaces = classifyFile(
      { path: "app/api/orders/[id]/route.ts", status: "modified" },
      `export async function GET(req: Request){ const session = await auth(); return Response.json({}); }`
    );

    expect(surfaces.map((surface) => surface.kind)).toEqual(expect.arrayContaining(["api", "auth"]));
  });

  it("classifies dependency updates", () => {
    const surfaces = classifyFile({ path: "pnpm-lock.yaml", status: "modified" });

    expect(surfaces.map((surface) => surface.kind)).toContain("dependency");
  });

  it("does not classify pages API files as page routes", () => {
    const surfaces = classifyFile(
      { path: "pages/api/users.ts", status: "modified" },
      `export default function handler() { return Response.json({ ok: true }); }`
    );
    const kinds = surfaces.map((surface) => surface.kind);

    expect(kinds).toContain("api");
    expect(kinds).not.toContain("route");
  });

  it("does not read obvious binary files as text", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "qgate-changed-files-"));
    await writeFile(path.join(cwd, "logo.png"), Buffer.from([0, 1, 2, 3]));

    const surfaces = await analyzeChangedFiles(cwd, [{ path: "logo.png", status: "modified" }]);

    expect(surfaces).toEqual([
      {
        kind: "unknown",
        path: "logo.png",
        confidence: "low",
        reasons: ["changed file did not match known surface patterns"]
      }
    ]);
  });

  it("does not read oversized files for content-based classification", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "qgate-changed-files-"));
    const content = `${"a".repeat(200_001)} auth`;
    await writeFile(path.join(cwd, "large.txt"), content, "utf8");

    const surfaces = await analyzeChangedFiles(cwd, [{ path: "large.txt", status: "modified" }]);

    expect(surfaces).toEqual([
      {
        kind: "unknown",
        path: "large.txt",
        confidence: "low",
        reasons: ["changed file did not match known surface patterns"]
      }
    ]);
  });
});
