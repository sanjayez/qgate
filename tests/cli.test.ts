import { describe, expect, it } from "vitest";
import { createProgram } from "../src/cli.js";

describe("cli", () => {
  it("registers expected commands", () => {
    const program = createProgram();
    const commands = program.commands.map((command) => command.name());

    expect(commands).toEqual(expect.arrayContaining(["init", "plan", "run", "report"]));
  });

  it("leaves plan git ref defaults to createPlan", () => {
    const program = createProgram();
    const plan = program.commands.find((command) => command.name() === "plan");
    const base = plan?.options.find((option) => option.long === "--base");
    const head = plan?.options.find((option) => option.long === "--head");

    expect(base?.defaultValue).toBeUndefined();
    expect(head?.defaultValue).toBeUndefined();
  });
});
