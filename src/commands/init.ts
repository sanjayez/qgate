import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import type { Command } from "commander";
import { createLogger } from "../core/logger.js";

interface InitOptions {
  cwd?: string;
  dryRun?: boolean;
  force?: boolean;
  quiet?: boolean;
}

export function registerInitCommand(program: Command): void {
  program
    .command("init")
    .description("Create qgate config and CI templates")
    .option("--dry-run", "print files that would be written")
    .option("--force", "overwrite existing files")
    .option("--quiet", "reduce command output")
    .action(async (options: InitOptions) => {
      try {
        await initCommand({ ...options, cwd: process.cwd() });
      } catch (error) {
        createLogger().error(error instanceof Error ? error.message : String(error));
        process.exitCode = 2;
      }
    });
}

export async function initCommand(options: InitOptions): Promise<void> {
  const cwd = options.cwd ?? process.cwd();
  const logger = createLogger(Boolean(options.quiet));
  const files = [
    {
      path: "qgate.config.ts",
      content: configTemplate()
    },
    {
      path: ".github/workflows/qgate.yml",
      content: workflowTemplate()
    }
  ];

  for (const file of files) {
    const target = path.join(cwd, file.path);

    if (options.dryRun) {
      logger.info(`[dry-run] would write ${file.path}`);
      continue;
    }

    if (existsSync(target) && !options.force) {
      logger.warn(`Skipped existing ${file.path}; pass --force to overwrite`);
      continue;
    }

    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, file.content, "utf8");
    logger.success(`Wrote ${file.path}`);
  }
}

function configTemplate(): string {
  return `import { defineConfig } from "qgate/config";

export default defineConfig({
  "project": "next-react",
  "mode": "critical-blocks",
  "tools": {
    "fallow": { "enabled": true },
    "playwright": { "enabled": true },
    "semgrep": { "enabled": true },
    "gitleaks": { "enabled": true },
    "osvScanner": { "enabled": true },
    "schemathesis": { "enabled": true },
    "oasdiff": { "enabled": true }
  },
  "reports": {
    "markdown": true,
    "html": true,
    "json": true
  }
});
`;
}

function workflowTemplate(): string {
  return `name: qgate

on:
  pull_request:

jobs:
  qgate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - uses: pnpm/action-setup@v4
        with:
          version: 10
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec qgate run --base origin/\${{ github.base_ref }} --head HEAD
`;
}
