import { access } from "node:fs/promises";
import path from "node:path";
import { execa } from "execa";
import type { FallowResult, NormalizedFinding, Severity } from "../core/types.js";

export async function runFallowAudit(cwd: string, enabled: boolean): Promise<FallowResult> {
  if (!enabled) {
    return { available: false, skippedReason: "disabled", findings: [] };
  }

  const command = await resolveFallowCommand(cwd);
  if (!command) {
    return {
      available: false,
      skippedReason: "fallow is not installed locally or globally",
      findings: []
    };
  }

  try {
    const { stdout } = await execa(command.bin, [...command.prefixArgs, "audit", "--format", "json", "--quiet"], {
      cwd,
      reject: false
    });

    if (!stdout.trim()) {
      return {
        available: true,
        verdict: "unknown",
        findings: [
          {
            source: "fallow",
            severity: "warning",
            title: "Fallow returned no JSON output"
          }
        ]
      };
    }

    const raw = JSON.parse(stdout) as unknown;
    return normalizeFallowOutput(raw);
  } catch (error) {
    return {
      available: false,
      skippedReason: error instanceof Error ? error.message : "fallow execution failed",
      findings: []
    };
  }
}

function normalizeFallowOutput(raw: unknown): FallowResult {
  const record = asRecord(raw);
  const verdict = normalizeVerdict(
    firstPresentValue(
      record.verdict,
      record.status,
      asRecord(record.summary).verdict,
      asRecord(record.audit).verdict
    )
  );

  return {
    available: true,
    verdict,
    findings: collectFindings(raw),
    raw
  };
}

function collectFindings(raw: unknown): NormalizedFinding[] {
  const record = asRecord(raw);
  const candidates = [record.findings, record.issues, record.results, record.diagnostics]
    .filter(Array.isArray)
    .flat() as unknown[];

  return candidates.slice(0, 100).map((candidate, index) => {
    const item = asRecord(candidate);
    return {
      source: "fallow",
      severity: normalizeSeverity(item.severity ?? item.level ?? item.status),
      title: String(item.title ?? item.rule ?? item.kind ?? `Fallow finding ${index + 1}`),
      path: typeof item.path === "string" ? item.path : typeof item.file === "string" ? item.file : undefined,
      message: typeof item.message === "string" ? item.message : undefined
    };
  });
}

async function resolveFallowCommand(cwd: string): Promise<{ bin: string; prefixArgs: string[] } | undefined> {
  const localBin = path.join(cwd, "node_modules", ".bin", process.platform === "win32" ? "fallow.cmd" : "fallow");
  if (await exists(localBin)) {
    return { bin: localBin, prefixArgs: [] };
  }

  try {
    await execa("fallow", ["--version"], { cwd });
    return { bin: "fallow", prefixArgs: [] };
  } catch {
    return undefined;
  }
}

function normalizeVerdict(value: unknown): FallowResult["verdict"] {
  const text = String(value ?? "").toLowerCase();
  if (text.includes("fail")) return "fail";
  if (text.includes("warn")) return "warn";
  if (text.includes("pass")) return "pass";
  return "unknown";
}

function normalizeSeverity(value: unknown): Severity {
  const text = String(value ?? "").toLowerCase();
  if (text.includes("error") || text.includes("fail") || text.includes("critical")) return "critical";
  if (text.includes("warn")) return "warning";
  return "info";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function firstPresentValue(...values: unknown[]): unknown {
  return values.find(
    (value) => value !== null
      && value !== undefined
      && (typeof value !== "string" || value.trim().length > 0)
  );
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}
