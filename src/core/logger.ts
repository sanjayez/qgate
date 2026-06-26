// Small CLI logger so commands can stay readable and tests can suppress output.
import pc from "picocolors";

export interface Logger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  success(message: string): void;
}

export function createLogger(quiet = false): Logger {
  return {
    info(message) {
      if (!quiet) {
        console.log(pc.cyan(message));
      }
    },
    warn(message) {
      if (!quiet) {
        console.warn(pc.yellow(message));
      }
    },
    error(message) {
      console.error(pc.red(message));
    },
    success(message) {
      if (!quiet) {
        console.log(pc.green(message));
      }
    }
  };
}
