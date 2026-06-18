import type { Surface } from "../core/types.js";

export interface NextReactAnalysis {
  impactedRoutes: string[];
  impactedForms: string[];
  impactedApis: string[];
  notes: string[];
}

export function analyzeNextReactSurfaces(surfaces: Surface[]): NextReactAnalysis {
  return {
    impactedRoutes: pathsFor(surfaces, "route"),
    impactedForms: pathsFor(surfaces, "form"),
    impactedApis: pathsFor(surfaces, "api"),
    notes: buildNotes(surfaces)
  };
}

function pathsFor(surfaces: Surface[], kind: Surface["kind"]): string[] {
  return [...new Set(surfaces.filter((surface) => surface.kind === kind).map((surface) => surface.path))];
}

function buildNotes(surfaces: Surface[]): string[] {
  const notes: string[] = [];
  if (surfaces.some((surface) => surface.kind === "form")) {
    notes.push("Form changes require malformed input, duplicate submit, server error, timeout, and accessibility scenarios.");
  }
  if (surfaces.some((surface) => surface.kind === "api")) {
    notes.push("API changes require malformed payload, auth, object access, status code, and contract scenarios.");
  }
  if (surfaces.some((surface) => surface.kind === "auth")) {
    notes.push("Auth changes require wrong-role, anonymous, stale-session, and cross-user object access scenarios.");
  }
  return notes;
}
