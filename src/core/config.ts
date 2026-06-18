import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import type { QGateConfig } from "./types.js";

const ToolSchema = z.object({
  enabled: z.boolean().default(true)
});

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
    .optional(),
  reports: z
    .object({
      markdown: z.boolean().optional(),
      html: z.boolean().optional(),
      json: z.boolean().optional()
    })
    .optional()
});

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

    const raw = await readConfigFile(filePath);
    return {
      config: normalizeConfig(raw),
      path: filePath
    };
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
  const marker = "defineConfig(";
  const start = source.indexOf(marker);
  if (start === -1) {
    throw new Error("qgate.config.ts must export default defineConfig({...})");
  }

  const payloadStart = start + marker.length;
  const payloadEnd = source.lastIndexOf(")");
  if (payloadEnd <= payloadStart) {
    throw new Error("Could not parse qgate.config.ts defineConfig payload");
  }

  return source.slice(payloadStart, payloadEnd).trim().replace(/,\s*$/u, "");
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
