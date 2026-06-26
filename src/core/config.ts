// Config loading stays deliberately conservative so qgate.config.ts can be JSON-compatible.
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import type { QGateConfig } from "./types.js";

const ToolSchema = z.object({
  enabled: z.boolean().default(true)
}).strict();

const ConfigSchema = z.object({
  project: z.enum(["auto", "next-react"]).optional(),
  mode: z.enum(["critical-blocks", "report-only", "strict"]).optional(),
  tools: z
    .object({
      fallow: ToolSchema.optional(),
      playwright: ToolSchema.optional(),
      semgrep: ToolSchema.optional(),
      gitleaks: ToolSchema.optional(),
      osvScanner: ToolSchema.optional(),
      schemathesis: ToolSchema.optional(),
      oasdiff: ToolSchema.optional()
    })
    .strict()
    .optional(),
  reports: z
    .object({
      markdown: z.boolean().optional(),
      html: z.boolean().optional(),
      json: z.boolean().optional()
    })
    .strict()
    .optional()
}).strict();

export function defineConfig(config: Partial<QGateConfig>): Partial<QGateConfig> {
  return config;
}

export function defaultConfig(): QGateConfig {
  return {
    project: "next-react",
    mode: "critical-blocks",
    tools: {
      fallow: { enabled: true },
      playwright: { enabled: true },
      semgrep: { enabled: true },
      gitleaks: { enabled: true },
      osvScanner: { enabled: true },
      schemathesis: { enabled: true },
      oasdiff: { enabled: true }
    },
    reports: {
      markdown: true,
      html: true,
      json: true
    }
  };
}

export interface LoadedConfig {
  config: QGateConfig;
  path?: string;
}

export async function loadConfig(cwd = process.cwd()): Promise<LoadedConfig> {
  const candidates = [
    "qgate.config.json",
    "qgate.config.ts",
    "qgate.config.mjs",
    "qgate.config.js"
  ];

  for (const candidate of candidates) {
    const filePath = path.join(cwd, candidate);
    if (!(await exists(filePath))) {
      continue;
    }

    try {
      const raw = await readConfigFile(filePath);
      return {
        config: normalizeConfig(raw),
        path: filePath
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to load qgate config ${filePath}: ${message}`, { cause: error });
    }
  }

  return { config: defaultConfig() };
}

async function readConfigFile(filePath: string): Promise<unknown> {
  if (filePath.endsWith(".json")) {
    return JSON.parse(await readFile(filePath, "utf8"));
  }

  if (filePath.endsWith(".mjs") || filePath.endsWith(".js")) {
    const mod = await import(pathToFileUrl(filePath));
    return mod.default ?? mod;
  }

  const source = await readFile(filePath, "utf8");
  const jsonLike = extractDefineConfigPayload(source);
  return JSON.parse(jsonLike);
}

function extractDefineConfigPayload(source: string): string {
  // This is not a TypeScript evaluator. It accepts only a defineConfig(...) payload.
  const openParen = findDefineConfigOpenParen(source);
  const payloadEnd = findMatchingParen(source, openParen);
  return source.slice(openParen + 1, payloadEnd).trim().replace(/,\s*$/u, "");
}

function findDefineConfigOpenParen(source: string): number {
  // Scan manually so comments/strings containing "defineConfig" do not confuse the parser.
  const marker = "defineConfig";
  let quote: "'" | "\"" | "`" | undefined;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index] ?? "";
    const next = source[index + 1] ?? "";

    if (lineComment) {
      if (char === "\n") lineComment = false;
      continue;
    }

    if (blockComment) {
      if (char === "*" && next === "/") {
        blockComment = false;
        index += 1;
      }
      continue;
    }

    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === quote) {
        quote = undefined;
      }
      continue;
    }

    if (char === "/" && next === "/") {
      lineComment = true;
      index += 1;
      continue;
    }

    if (char === "/" && next === "*") {
      blockComment = true;
      index += 1;
      continue;
    }

    if (char === "'" || char === "\"" || char === "`") {
      quote = char;
      continue;
    }

    if (!source.startsWith(marker, index) || isIdentifierChar(source[index - 1]) || isIdentifierChar(source[index + marker.length])) {
      continue;
    }

    let openParen = index + marker.length;
    while (/\s/u.test(source[openParen] ?? "")) {
      openParen += 1;
    }

    if (source[openParen] === "(") {
      return openParen;
    }
  }

  throw new Error("qgate.config.ts must export default defineConfig({...})");
}

function findMatchingParen(source: string, openParen: number): number {
  // Match nested parentheses while ignoring parentheses inside comments and string literals.
  let depth = 0;
  let quote: "'" | "\"" | "`" | undefined;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = openParen; index < source.length; index += 1) {
    const char = source[index] ?? "";
    const next = source[index + 1] ?? "";

    if (lineComment) {
      if (char === "\n") lineComment = false;
      continue;
    }

    if (blockComment) {
      if (char === "*" && next === "/") {
        blockComment = false;
        index += 1;
      }
      continue;
    }

    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === quote) {
        quote = undefined;
      }
      continue;
    }

    if (char === "/" && next === "/") {
      lineComment = true;
      index += 1;
      continue;
    }

    if (char === "/" && next === "*") {
      blockComment = true;
      index += 1;
      continue;
    }

    if (char === "'" || char === "\"" || char === "`") {
      quote = char;
      continue;
    }

    if (char === "(") {
      depth += 1;
      continue;
    }

    if (char === ")") {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }

  throw new Error("Could not parse qgate.config.ts defineConfig payload");
}

function isIdentifierChar(char: string | undefined): boolean {
  return typeof char === "string" && /[$A-Z_a-z0-9]/u.test(char);
}

function pathToFileUrl(filePath: string): string {
  return pathToFileURL(filePath).href;
}

function normalizeConfig(raw: unknown): QGateConfig {
  const parsed = ConfigSchema.parse(raw);
  const defaults = defaultConfig();

  return {
    project: parsed.project ?? defaults.project,
    mode: parsed.mode ?? defaults.mode,
    tools: {
      fallow: { ...defaults.tools.fallow, ...parsed.tools?.fallow },
      playwright: { ...defaults.tools.playwright, ...parsed.tools?.playwright },
      semgrep: { ...defaults.tools.semgrep, ...parsed.tools?.semgrep },
      gitleaks: { ...defaults.tools.gitleaks, ...parsed.tools?.gitleaks },
      osvScanner: { ...defaults.tools.osvScanner, ...parsed.tools?.osvScanner },
      schemathesis: { ...defaults.tools.schemathesis, ...parsed.tools?.schemathesis },
      oasdiff: { ...defaults.tools.oasdiff, ...parsed.tools?.oasdiff }
    },
    reports: {
      markdown: parsed.reports?.markdown ?? defaults.reports.markdown,
      html: parsed.reports?.html ?? defaults.reports.html,
      json: parsed.reports?.json ?? defaults.reports.json
    }
  };
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}
