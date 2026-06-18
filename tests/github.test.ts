import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { readGitHubContext } from "../src/adapters/github.js";

describe("github adapter", () => {
  it("warns when the GitHub event file cannot be parsed", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "qgate-github-"));
    const eventPath = path.join(cwd, "event.json");
    const warnings: string[] = [];
    await writeFile(eventPath, "{not json", "utf8");

    const context = await readGitHubContext(
      {
        GITHUB_ACTIONS: "true",
        GITHUB_REPOSITORY: "owner/repo",
        GITHUB_EVENT_NAME: "pull_request",
        GITHUB_EVENT_PATH: eventPath
      },
      { warn: (message) => warnings.push(message) }
    );

    expect(context).toMatchObject({ repository: "owner/repo", eventName: "pull_request" });
    expect(context?.pullRequest).toBeUndefined();
    expect(warnings[0]).toContain("Failed to read GitHub event file");
  });
});
