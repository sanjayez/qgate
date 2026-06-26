// Artifact I/O boundary. All run ids and artifact names are validated before touching disk.
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { hasErrorCode } from "./errors.js";
import { validateJsonArtifact, type JsonArtifactMap, type JsonArtifactName } from "./schemas.js";

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

export function createArtifactContextFromRunDir(cwd: string, runId: string, runDir: string): ArtifactContext {
  assertSafeRunId(runId);
  const rootDir = path.resolve(cwd, ".qgate", "runs");
  const resolvedRunDir = path.resolve(runDir);
  assertInsideDirectory(rootDir, resolvedRunDir);
  return { cwd, runId, rootDir, runDir: resolvedRunDir };
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

export async function readJsonArtifact<Name extends JsonArtifactName>(
  runDir: string,
  name: Name
): Promise<JsonArtifactMap[Name]>;
export async function readJsonArtifact(runDir: string, name: string): Promise<unknown>;
export async function readJsonArtifact(runDir: string, name: string): Promise<unknown> {
  const filePath = resolveArtifactFileInRunDir(runDir, name);
  const parsed = JSON.parse(await readFile(filePath, "utf8")) as unknown;
  return validateJsonArtifact(name, parsed);
}

export async function resolveRunDir(cwd: string, runId: string): Promise<string> {
  const rootDir = path.resolve(cwd, ".qgate", "runs");
  if (runId !== "latest") {
    assertSafeRunId(runId);
    const runDir = path.resolve(rootDir, runId);
    assertInsideDirectory(rootDir, runDir);
    return runDir;
  }

  let entries;
  try {
    entries = await readdir(rootDir, { withFileTypes: true });
  } catch (error) {
    if (hasErrorCode(error, "ENOENT")) {
      throw new Error("No qgate runs found", { cause: error });
    }
    throw error;
  }
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
  return resolveArtifactFileInRunDir(context.runDir, name);
}

function resolveArtifactFileInRunDir(runDir: string, name: string): string {
  assertSafeArtifactName(name);
  const resolvedRunDir = path.resolve(runDir);
  const filePath = path.resolve(resolvedRunDir, name);
  assertInsideDirectory(resolvedRunDir, filePath);
  return filePath;
}

function assertSafeRunId(runId: string): void {
  // Run ids become directory names, so disallow path separators and shell-sensitive characters.
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u.test(runId)) {
    throw new Error(`Unsafe qgate run id: ${runId}`);
  }
}

function assertSafeArtifactName(name: string): void {
  // Artifacts are fixed-name files inside a run directory, never nested paths.
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
