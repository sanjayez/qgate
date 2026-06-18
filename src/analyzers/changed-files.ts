import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ChangedFile, Surface, SurfaceKind } from "../core/types.js";

export async function analyzeChangedFiles(cwd: string, changedFiles: ChangedFile[]): Promise<Surface[]> {
  const surfaces: Surface[] = [];

  for (const file of changedFiles) {
    const content = file.status === "deleted" ? "" : await readFileIfText(path.join(cwd, file.path));
    const found = classifyFile(file, content);

    for (const surface of found) {
      surfaces.push(surface);
    }
  }

  return dedupeSurfaces(surfaces);
}

export function classifyFile(file: ChangedFile, content = ""): Surface[] {
  const surfaces: Surface[] = [];
  const normalized = file.path.replace(/\\/gu, "/");

  const add = (kind: SurfaceKind, reason: string, confidence: Surface["confidence"] = "high") => {
    const existing = surfaces.find((surface) => surface.kind === kind && surface.path === file.path);
    if (existing) {
      existing.reasons.push(reason);
      if (confidence === "high") existing.confidence = "high";
      return;
    }

    surfaces.push({
      kind,
      path: file.path,
      reasons: [reason],
      confidence
    });
  };

  if (isTestPath(normalized)) add("test", "test file changed");
  if (isDependencyPath(normalized)) add("dependency", "dependency manifest or lockfile changed");
  if (isConfigPath(normalized)) add("config", "configuration file changed");
  if (isApiPath(normalized)) add("api", "API route or server endpoint path changed");
  if (isRoutePath(normalized)) add("route", "Next.js route surface changed");
  if (isComponentPath(normalized)) add("component", "React component surface changed", "medium");
  if (isDataPath(normalized)) add("data", "data model, migration, database, or persistence file changed");
  if (isAuthPath(normalized) || containsAuthSignal(content)) add("auth", "auth or authorization signal detected");
  if (containsFormSignal(normalized, content)) add("form", "form or submit interaction signal detected");
  if (containsValidationSignal(normalized, content)) add("api", "validation schema affects API/input boundary", "medium");

  if (surfaces.length === 0) {
    add("unknown", "changed file did not match known surface patterns", "low");
  }

  return surfaces;
}

function dedupeSurfaces(surfaces: Surface[]): Surface[] {
  const map = new Map<string, Surface>();
  for (const surface of surfaces) {
    const key = `${surface.kind}:${surface.path}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...surface, reasons: [...surface.reasons] });
      continue;
    }
    existing.reasons.push(...surface.reasons);
  }
  return [...map.values()].map((surface) => ({
    ...surface,
    reasons: [...new Set(surface.reasons)]
  }));
}

function isTestPath(filePath: string): boolean {
  return /(^|\/)(__tests__|tests?|specs?)\//u.test(filePath) || /\.(test|spec)\.[cm]?[jt]sx?$/u.test(filePath);
}

function isDependencyPath(filePath: string): boolean {
  return /(^|\/)(package\.json|pnpm-lock\.yaml|package-lock\.json|yarn\.lock|bun\.lockb?|pnpm-workspace\.yaml)$/u.test(filePath);
}

function isConfigPath(filePath: string): boolean {
  return /(^|\/)(next|vite|webpack|eslint|tsconfig|tailwind|postcss|jest|vitest|playwright)\.config\./u.test(filePath)
    || /(^|\/)\.env/u.test(filePath)
    || /(^|\/)(config|configs)\//u.test(filePath);
}

function isApiPath(filePath: string): boolean {
  return /(^|\/)(app\/api\/.*\/route|pages\/api\/|src\/pages\/api\/)/u.test(filePath)
    || /(^|\/)(api|server|routes|controllers)\//u.test(filePath);
}

function isRoutePath(filePath: string): boolean {
  return /(^|\/)app\/.*(page|layout|loading|error|not-found)\.[jt]sx?$/u.test(filePath)
    || /(^|\/)pages\/.*\.[jt]sx?$/u.test(filePath);
}

function isComponentPath(filePath: string): boolean {
  return /\.(tsx|jsx)$/u.test(filePath) && /(^|\/)(components|app|pages|src)\//u.test(filePath);
}

function isDataPath(filePath: string): boolean {
  return /(^|\/)(prisma|migrations|drizzle|db|database|models|schema)\//u.test(filePath)
    || /\.(sql|prisma)$/u.test(filePath);
}

function isAuthPath(filePath: string): boolean {
  return /auth|session|permission|role|policy|guard|rbac|acl/iu.test(filePath);
}

function containsAuthSignal(content: string): boolean {
  return /\b(auth|session|permission|role|authorize|middleware|requireUser|currentUser|getServerSession)\b/iu.test(content);
}

function containsFormSignal(filePath: string, content: string): boolean {
  return /form/iu.test(filePath)
    || /<form\b/iu.test(content)
    || /\b(useForm|Formik|onSubmit|handleSubmit|formAction)\b/u.test(content);
}

function containsValidationSignal(filePath: string, content: string): boolean {
  return /schema|validator|validation/iu.test(filePath)
    || /\b(zod|yup|valibot|superstruct|class-validator|safeParse|parseAsync)\b/u.test(content);
}

async function readFileIfText(filePath: string): Promise<string> {
  try {
    const content = await readFile(filePath, "utf8");
    return content.length > 200_000 ? content.slice(0, 200_000) : content;
  } catch {
    return "";
  }
}
