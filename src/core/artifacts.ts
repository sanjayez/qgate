import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { validateJsonArtifact } from "./schemas.js";

export interface ArtifactContext {
  cwd: string;
  runId: string;
  rootDir: string;
  runDir: string;
}

export function createRunId(date = new Date()): string {
  return date.toISOString().replace(/[:.]/gu, "-");
}

export async function createArtifactContext(
  cwd: string,
  runId = createRunId()
): Promise<ArtifactContext> {
  assertSafeRunId(runId);
  const rootDir = path.resolve(cwd, ".qgate", "runs");
  const runDir = path.resolve(rootDir, runId);
  assertInsideDirectory(rootDir, runDir);
  await mkdir(runDir, { recursive: true });
  return { cwd, runId, rootDir, runDir };
}

export async function writeJsonArtifact(
  context: ArtifactContext,
  name: string,
  value: unknown
): Promise<string> {
  const filePath = resolveArtifactFile(context, name);
  const validated = validateJsonArtifact(name, value);
  await writeFile(filePath, `${JSON.stringify(validated, null, 2)}\n`, "utf8");
  return filePath;
}

export async function writeTextArtifact(
  context: ArtifactContext,
  name: string,
  value: string
): Promise<string> {
  const filePath = resolveArtifactFile(context, name);
  await writeFile(filePath, value.endsWith("\n") ? value : `${value}\n`, "utf8");
  return filePath;
}

export async function readJsonArtifact<T>(runDir: string, name: string): Promise<T> {
  const filePath = resolveArtifactFile({ cwd: "", runId: "", rootDir: "", runDir }, name);
  const parsed = JSON.parse(await readFile(filePath, "utf8")) as unknown;
  return validateJsonArtifact(name, parsed) as T;
}

export async function resolveRunDir(cwd: string, runId: string): Promise<string> {
  const rootDir = path.resolve(cwd, ".qgate", "runs");
  if (runId !== "latest") {
    assertSafeRunId(runId);
    const runDir = path.resolve(rootDir, runId);
    assertInsideDirectory(rootDir, runDir);
    return runDir;
  }

  const entries = await readdir(rootDir, { withFileTypes: true });
  const latest = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .at(-1);

  if (!latest) {
    throw new Error("No qgate runs found");
  }

  return path.join(rootDir, latest);
}

function resolveArtifactFile(context: ArtifactContext, name: string): string {
  assertSafeArtifactName(name);
  const runDir = path.resolve(context.runDir);
  const filePath = path.resolve(runDir, name);
  assertInsideDirectory(runDir, filePath);
  return filePath;
}

function assertSafeRunId(runId: string): void {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u.test(runId)) {
    throw new Error(`Unsafe qgate run id: ${runId}`);
  }
}

function assertSafeArtifactName(name: string): void {
  if (!/^[a-z0-9][a-z0-9.-]*\.(json|md|html|xml|sarif)$/u.test(name)) {
    throw new Error(`Unsafe qgate artifact name: ${name}`);
  }
}

function assertInsideDirectory(parent: string, child: string): void {
  const relative = path.relative(parent, child);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Resolved path escapes qgate artifact directory: ${child}`);
  }
}
