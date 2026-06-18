import { describe, expect, it } from "vitest";
import { createProgram } from "../src/cli.js";

describe("cli", () => {
  it("registers expected commands", () => {
    const program = createProgram();
    const commands = program.commands.map((command) => command.name());

    expect(commands).toEqual(expect.arrayContaining(["init", "plan", "run", "report"]));
  });
});
