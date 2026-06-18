import { chmod, mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runFallowAudit } from "../src/adapters/fallow.js";

describe("fallow adapter", () => {
  it("falls back past blank verdict fields", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "qgate-fallow-"));
    const binDir = path.join(cwd, "node_modules", ".bin");
    const binPath = path.join(binDir, process.platform === "win32" ? "fallow.cmd" : "fallow");
    await mkdir(binDir, { recursive: true });
    await writeFile(
      binPath,
      `#!/usr/bin/env node
console.log(JSON.stringify({ verdict: "", status: "pass", findings: [] }));
`,
      "utf8"
    );
    await chmod(binPath, 0o755);

    const result = await runFallowAudit(cwd, true);

    expect(result.available).toBe(true);
    expect(result.verdict).toBe("pass");
  });
});
