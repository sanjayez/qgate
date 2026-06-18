import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { initCommand } from "../src/commands/init.js";

describe("init command", () => {
  it("writes a pnpm workflow with setup before node cache configuration", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "qgate-init-"));

    await initCommand({ cwd, quiet: true });

    const workflow = await readFile(path.join(cwd, ".github", "workflows", "qgate.yml"), "utf8");

    expect(workflow.indexOf("pnpm/action-setup@v4")).toBeGreaterThan(-1);
    expect(workflow.indexOf("actions/setup-node@v4")).toBeGreaterThan(-1);
    expect(workflow.indexOf("pnpm/action-setup@v4")).toBeLessThan(workflow.indexOf("actions/setup-node@v4"));
  });
});
