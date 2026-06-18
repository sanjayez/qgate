import { mkdtemp, writeFile } from "node:fs/promises";
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
});
