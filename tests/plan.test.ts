import { describe, expect, it } from "vitest";
import { defaultBaseRef, defaultHeadRef } from "../src/commands/plan.js";

describe("plan defaults", () => {
  it("uses the same git ref defaults for CLI and programmatic plan calls", () => {
    expect(defaultBaseRef({})).toBe("origin/main");
    expect(defaultHeadRef({})).toBe("HEAD");
    expect(defaultBaseRef({ GITHUB_BASE_REF: "develop" })).toBe("origin/develop");
    expect(defaultHeadRef({ GITHUB_SHA: "abc123" })).toBe("abc123");
  });
});
