import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { defaultConfig, loadConfig } from "../src/core/config.js";

describe("config", () => {
  it("returns defaults when no config exists", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "qgate-config-"));

    const loaded = await loadConfig(cwd);

    expect(loaded.config).toEqual(defaultConfig());
    expect(loaded.path).toBeUndefined();
  });

  it("loads JSON-compatible qgate.config.ts", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "qgate-config-"));
    await writeFile(
      path.join(cwd, "qgate.config.ts"),
      `import { defineConfig } from "qgate/config";

export default defineConfig({
  "project": "next-react",
  "mode": "report-only",
  "tools": {
    "fallow": { "enabled": false }
  },
  "reports": {
    "markdown": true
  }
});
`,
      "utf8"
    );

    const loaded = await loadConfig(cwd);

    expect(loaded.config.mode).toBe("report-only");
    expect(loaded.config.tools.fallow.enabled).toBe(false);
    expect(loaded.config.tools.playwright.enabled).toBe(true);
  });
});
