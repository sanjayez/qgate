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
  const range = `${base}...${head}`;
  const { stdout } = await execa("git", ["diff", "--name-status", range], { cwd });
  return parseNameStatus(stdout);
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
