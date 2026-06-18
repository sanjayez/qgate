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

  it("loads only the defineConfig payload from TypeScript config", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "qgate-config-"));
    await writeFile(
      path.join(cwd, "qgate.config.ts"),
      `import { defineConfig } from "qgate/config";

export default defineConfig({
  "mode": "report-only",
  "reports": {
    "json": false
  }
});

console.log("ignored ) after config");
`,
      "utf8"
    );

    const loaded = await loadConfig(cwd);

    expect(loaded.config.mode).toBe("report-only");
    expect(loaded.config.reports.json).toBe(false);
  });

  it("ignores comments and imports before the defineConfig call", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "qgate-config-"));
    await writeFile(
      path.join(cwd, "qgate.config.ts"),
      `import { defineConfig } from "qgate/config";

// defineConfig() is documented here but should not be parsed.
const note = "defineConfig({}) is just text";

export default defineConfig({
  "mode": "report-only"
});
`,
      "utf8"
    );

    const loaded = await loadConfig(cwd);

    expect(loaded.config.mode).toBe("report-only");
  });

  it("rejects unknown config keys instead of silently defaulting", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "qgate-config-"));
    await writeFile(
      path.join(cwd, "qgate.config.json"),
      JSON.stringify({ mode: "report-only", typoedMode: "strict" }),
      "utf8"
    );

    await expect(loadConfig(cwd)).rejects.toThrow(/Failed to load qgate config .*qgate\.config\.json/u);
  });
});
