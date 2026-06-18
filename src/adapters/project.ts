import { access, readFile } from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import { hasErrorCode } from "../core/errors.js";
import type { DetectedProject } from "../core/types.js";

const OPENAPI_SPEC_PATTERNS = [
  "**/openapi.{json,yaml,yml}",
  "**/openapi/*.{json,yaml,yml}",
  "**/swagger.{json,yaml,yml}",
  "**/swagger/*.{json,yaml,yml}"
];

const PROJECT_GLOB_IGNORES = [
  ".git/**",
  ".next/**",
  ".qgate/**",
  "build/**",
  "coverage/**",
  "dist/**",
  "node_modules/**"
];

export async function detectProject(cwd: string): Promise<DetectedProject> {
  const packageJson = await readPackageJson(cwd);
  const scripts = packageJson?.scripts ?? {};
  const dependencies = packageJson?.dependencies ?? {};
  const devDependencies = packageJson?.devDependencies ?? {};
  const allDeps = { ...dependencies, ...devDependencies };
  const openApiFiles = await fg(OPENAPI_SPEC_PATTERNS, {
    cwd,
    ignore: PROJECT_GLOB_IGNORES,
    dot: false
  });

  const hasNext = Boolean(allDeps.next)
    || (await anyExists(cwd, ["next.config.js", "next.config.cjs", "next.config.mjs", "next.config.mts", "next.config.ts"]));
  const hasReact = Boolean(allDeps.react);
  const hasPlaywright = Boolean(allDeps["@playwright/test"]) || (await anyExists(cwd, ["playwright.config.ts", "playwright.config.js"]));
  const testRunners: DetectedProject["testRunners"] = [];
  if (allDeps.vitest || scripts.test?.includes("vitest")) testRunners.push("vitest");
  if (allDeps.jest || scripts.test?.includes("jest")) testRunners.push("jest");

  return {
    root: cwd,
    packageManager: await detectPackageManager(cwd),
    projectType: hasNext && hasReact ? "next-react" : hasReact ? "react" : packageJson ? "node" : "unknown",
    scripts,
    dependencies,
    devDependencies,
    hasNext,
    hasReact,
    hasPlaywright,
    testRunners,
    openApiFiles
  };
}

async function readPackageJson(cwd: string): Promise<{
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
} | undefined> {
  const packageJsonPath = path.join(cwd, "package.json");
  try {
    return JSON.parse(await readFile(packageJsonPath, "utf8")) as {
      scripts?: Record<string, string>;
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
  } catch (error) {
    if (hasErrorCode(error, "ENOENT")) {
      return undefined;
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to read package.json at ${packageJsonPath}: ${message}`, { cause: error });
  }
}

async function detectPackageManager(cwd: string): Promise<DetectedProject["packageManager"]> {
  if (await exists(path.join(cwd, "pnpm-lock.yaml"))) return "pnpm";
  if (await exists(path.join(cwd, "package-lock.json"))) return "npm";
  if (await exists(path.join(cwd, "yarn.lock"))) return "yarn";
  if (await exists(path.join(cwd, "bun.lockb")) || await exists(path.join(cwd, "bun.lock"))) return "bun";
  return "unknown";
}

async function anyExists(cwd: string, candidates: string[]): Promise<boolean> {
  for (const candidate of candidates) {
    if (await exists(path.join(cwd, candidate))) {
      return true;
    }
  }
  return false;
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}
