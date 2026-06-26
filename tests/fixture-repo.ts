// Test helper: builds a real temporary git repo from base/head fixture overlays.
import { cp, mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execa } from "execa";

export interface FixtureRepo {
  cwd: string;
  base: string;
  head: string;
}

export async function createFixtureRepo(name: string): Promise<FixtureRepo> {
  const fixtureRoot = path.join(process.cwd(), "tests", "fixtures", name);
  const cwd = await mkdtemp(path.join(os.tmpdir(), `qgate-${name}-`));

  await cp(path.join(fixtureRoot, "base"), cwd, { recursive: true });
  await git(cwd, "init");
  await git(cwd, "config", "user.email", "qgate@example.test");
  await git(cwd, "config", "user.name", "QGate Fixture");
  await git(cwd, "config", "commit.gpgSign", "false");
  await git(cwd, "add", ".");
  await git(cwd, "commit", "-m", "base");

  await cp(path.join(fixtureRoot, "head"), cwd, { recursive: true });
  await git(cwd, "add", "-A");
  await git(cwd, "commit", "-m", "head");

  return { cwd, base: "HEAD~1", head: "HEAD" };
}

function git(cwd: string, ...args: string[]): Promise<unknown> {
  return execa("git", args, { cwd });
}
