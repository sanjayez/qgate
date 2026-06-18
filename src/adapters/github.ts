import { readFile } from "node:fs/promises";
import type { GitHubContext } from "../core/types.js";

export async function readGitHubContext(env = process.env): Promise<GitHubContext | undefined> {
  if (!env.GITHUB_ACTIONS) {
    return undefined;
  }

  const context: GitHubContext = {
    repository: env.GITHUB_REPOSITORY,
    eventName: env.GITHUB_EVENT_NAME
  };

  if (env.GITHUB_EVENT_PATH) {
    try {
      const event = JSON.parse(await readFile(env.GITHUB_EVENT_PATH, "utf8")) as {
        pull_request?: {
          number?: number;
          title?: string;
          body?: string;
          html_url?: string;
          base?: { ref?: string };
          head?: { ref?: string };
        };
      };

      if (event.pull_request) {
        context.pullRequest = {
          number: event.pull_request.number,
          title: event.pull_request.title,
          body: event.pull_request.body,
          url: event.pull_request.html_url,
          baseRef: event.pull_request.base?.ref,
          headRef: event.pull_request.head?.ref
        };
      }
    } catch {
      return context;
    }
  }

  return context;
}
