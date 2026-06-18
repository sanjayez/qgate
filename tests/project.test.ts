import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { detectProject } from "../src/adapters/project.js";

describe("project adapter", () => {
  it("detects a Next React project", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "qgate-project-"));
    await writeFile(
      path.join(cwd, "package.json"),
      JSON.stringify(
        {
          scripts: { test: "vitest run" },
          dependencies: { next: "15.0.0", react: "19.0.0" },
          devDependencies: { vitest: "4.0.0", "@playwright/test": "1.56.0" }
        },
        null,
        2
      ),
      "utf8"
    );

    const project = await detectProject(cwd);

    expect(project.projectType).toBe("next-react");
    expect(project.hasNext).toBe(true);
    expect(project.hasReact).toBe(true);
    expect(project.hasPlaywright).toBe(true);
    expect(project.testRunners).toContain("vitest");
  });

  it("throws on malformed package.json instead of treating it as missing", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "qgate-project-"));
    await writeFile(path.join(cwd, "package.json"), "{not json", "utf8");

    await expect(detectProject(cwd)).rejects.toThrow("Failed to read package.json");
  });

  it("detects Next projects that use CommonJS config", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "qgate-project-"));
    await writeFile(
      path.join(cwd, "package.json"),
      JSON.stringify({ dependencies: { react: "19.0.0" } }),
      "utf8"
    );
    await writeFile(path.join(cwd, "next.config.cjs"), "module.exports = {};\n", "utf8");

    const project = await detectProject(cwd);

    expect(project.hasNext).toBe(true);
    expect(project.projectType).toBe("next-react");
  });

  it("detects Next projects that use ESM TypeScript config", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "qgate-project-"));
    await writeFile(
      path.join(cwd, "package.json"),
      JSON.stringify({ dependencies: { react: "19.0.0" } }),
      "utf8"
    );
    await writeFile(path.join(cwd, "next.config.mts"), "export default {};\n", "utf8");

    const project = await detectProject(cwd);

    expect(project.hasNext).toBe(true);
    expect(project.projectType).toBe("next-react");
  });

  it("keeps OpenAPI detection to conventional spec paths", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "qgate-project-"));
    await mkdir(path.join(cwd, "docs"), { recursive: true });
    await mkdir(path.join(cwd, "coverage"), { recursive: true });
    await mkdir(path.join(cwd, "api", "openapi"), { recursive: true });
    await writeFile(path.join(cwd, "docs", "openapi.yaml"), "openapi: 3.1.0\n", "utf8");
    await writeFile(path.join(cwd, "docs", "test-openapi-mock.yaml"), "not: a contract\n", "utf8");
    await writeFile(path.join(cwd, "coverage", "openapi.yaml"), "ignored: true\n", "utf8");
    await writeFile(path.join(cwd, "api", "openapi", "schema.yaml"), "openapi: 3.1.0\n", "utf8");

    const project = await detectProject(cwd);

    expect(project.openApiFiles).toEqual(expect.arrayContaining(["docs/openapi.yaml", "api/openapi/schema.yaml"]));
    expect(project.openApiFiles).not.toContain("docs/test-openapi-mock.yaml");
    expect(project.openApiFiles).not.toContain("coverage/openapi.yaml");
  });
});
