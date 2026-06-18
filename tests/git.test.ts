import { describe, expect, it } from "vitest";
import { parseNameStatus, validateGitRef } from "../src/adapters/git.js";

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

  it("rejects refs that could be parsed as git options", () => {
    expect(() => validateGitRef("--output=/tmp/qgate.diff", "base")).toThrow("refs cannot start with '-'");
    expect(() => validateGitRef("feature\nother", "head")).toThrow("whitespace or control characters");
    expect(() => validateGitRef("   ", "head")).toThrow("cannot be empty");
    expect(() => validateGitRef("feature branch", "head")).toThrow("whitespace or control characters");
    expect(() => validateGitRef("feature..main", "head")).toThrow("ambiguous revision syntax");
    expect(() => validateGitRef("feature;rm", "head")).toThrow("shell metacharacters");
  });
});
