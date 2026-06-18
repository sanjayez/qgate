#!/usr/bin/env node
import { pathToFileURL } from "node:url";
import { Command } from "commander";
import { registerInitCommand } from "./commands/init.js";
import { registerPlanCommand } from "./commands/plan.js";
import { registerReportCommand } from "./commands/report.js";
import { registerRunCommand } from "./commands/run.js";

export function createProgram(): Command {
  const program = new Command();

  program
    .name("qgate")
    .description("Deterministic PR quality gate for AI-generated code")
    .version("0.1.0");

  registerInitCommand(program);
  registerPlanCommand(program);
  registerRunCommand(program);
  registerReportCommand(program);

  return program;
}

export async function main(argv = process.argv): Promise<void> {
  await createProgram().parseAsync(argv);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}
