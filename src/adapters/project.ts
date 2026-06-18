import { access, readFile } from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import type { DetectedProject } from "../core/types.js";

export async function detectProject(cwd: string): Promise<DetectedProject> {
  const packageJson = await readPackageJson(cwd);
  const scripts = packageJson?.scripts ?? {};
  const dependencies = packageJson?.dependencies ?? {};
  const devDependencies = packageJson?.devDependencies ?? {};
  const allDeps = { ...dependencies, ...devDependencies };
  const openApiFiles = await fg(
    [
      "**/openapi.{json,yaml,yml}",
      "**/swagger.{json,yaml,yml}",
      "**/*openapi*.{json,yaml,yml}"
    ],
    {
      cwd,
      ignore: ["node_modules/**", "dist/**", ".next/**", ".qgate/**"],
      dot: false
    }
  );

  const hasNext = Boolean(allDeps.next) || (await anyExists(cwd, ["next.config.js", "next.config.mjs", "next.config.ts"]));
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
  try {
    return JSON.parse(await readFile(path.join(cwd, "package.json"), "utf8")) as {
      scripts?: Record<string, string>;
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
  } catch {
    return undefined;
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
