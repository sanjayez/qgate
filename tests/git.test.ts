import { describe, expect, it } from "vitest";
import { parseNameStatus } from "../src/adapters/git.js";

describe("git adapter", () => {
  it("parses git name-status output", () => {
    const files = parseNameStatus(["A\tsrc/new.ts", "M\tsrc/edit.ts", "D\tsrc/old.ts", "R100\tsrc/a.ts\tsrc/b.ts"].join("\n"));

    expect(files).toEqual([
      { status: "added", path: "src/new.ts" },
      { status: "modified", path: "src/edit.ts" },
      { status: "deleted", path: "src/old.ts" },
      { status: "renamed", oldPath: "src/a.ts", path: "src/b.ts" }
    ]);
  });
});
