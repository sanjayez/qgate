import { execa } from "execa";
import type { ChangedFile } from "../core/types.js";

export async function isGitRepository(cwd: string): Promise<boolean> {
  try {
    await execa("git", ["rev-parse", "--show-toplevel"], { cwd });
    return true;
  } catch {
    return false;
  }
}

export async function getChangedFiles(
  cwd: string,
  base: string,
  head: string
): Promise<ChangedFile[]> {
  validateGitRef(base, "base");
  validateGitRef(head, "head");
  const range = `${base}...${head}`;
  try {
    const { stdout } = await execa("git", ["diff", "--name-status", range, "--"], { cwd });
    return parseNameStatus(stdout);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to read git diff for ${base}...${head}: ${message}`, { cause: error });
  }
}

export function validateGitRef(ref: string, label: string): void {
  const trimmed = ref.trim();
  if (!trimmed) {
    throw new Error(`Invalid ${label} git ref: ref cannot be empty`);
  }

  if (trimmed !== ref) {
    throw new Error(`Invalid ${label} git ref: refs cannot contain leading or trailing whitespace`);
  }

  if (ref.startsWith("-")) {
    throw new Error(`Invalid ${label} git ref: refs cannot start with '-'`);
  }

  if (/[\s\u0000-\u001f\u007f]/u.test(ref)) {
    throw new Error(`Invalid ${label} git ref: refs cannot contain whitespace or control characters`);
  }

  if (/[`$;&|<>(){}[\]]/u.test(ref)) {
    throw new Error(`Invalid ${label} git ref: refs cannot contain shell metacharacters`);
  }

  if (ref.includes("..") || ref.includes("@{")) {
    throw new Error(`Invalid ${label} git ref: refs cannot contain ambiguous revision syntax`);
  }
}

export function parseNameStatus(stdout: string): ChangedFile[] {
  return stdout
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("\t");
      const code = parts[0] ?? "";
      const status = normalizeStatus(code);

      if (status === "renamed" || status === "copied") {
        return {
          status,
          oldPath: parts[1] ?? "",
          path: parts[2] ?? parts[1] ?? ""
        };
      }

      return {
        status,
        path: parts[1] ?? ""
      };
    })
    .filter((file) => file.path.length > 0);
}

function normalizeStatus(code: string): ChangedFile["status"] {
  if (code.startsWith("A")) return "added";
  if (code.startsWith("M")) return "modified";
  if (code.startsWith("D")) return "deleted";
  if (code.startsWith("R")) return "renamed";
  if (code.startsWith("C")) return "copied";
  return "unknown";
}
