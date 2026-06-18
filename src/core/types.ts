export type Severity = "critical" | "warning" | "info";
export type Verdict = "pass" | "warn" | "fail";
export type GateMode = "critical-blocks" | "report-only" | "strict";

export type SurfaceKind =
  | "form"
  | "api"
  | "auth"
  | "data"
  | "dependency"
  | "config"
  | "route"
  | "component"
  | "test"
  | "unknown";

export type RequiredCheck =
  | "unit"
  | "component"
  | "integration"
  | "playwright"
  | "api"
  | "security"
  | "accessibility"
  | "performance"
  | "static-analysis";

export interface ToolConfig {
  enabled: boolean;
}

export interface QGateConfig {
  project: "auto" | "next-react";
  mode: GateMode;
  tools: {
    fallow: ToolConfig;
    playwright: ToolConfig;
    semgrep: ToolConfig;
    gitleaks: ToolConfig;
    osvScanner: ToolConfig;
    schemathesis: ToolConfig;
    oasdiff: ToolConfig;
  };
  reports: {
    markdown: boolean;
    html: boolean;
    json: boolean;
  };
}

export interface ChangedFile {
  path: string;
  oldPath?: string;
  status: "added" | "modified" | "deleted" | "renamed" | "copied" | "unknown";
}

export interface GitHubContext {
  repository?: string;
  eventName?: string;
  pullRequest?: {
    number?: number;
    title?: string;
    body?: string;
    url?: string;
    baseRef?: string;
    headRef?: string;
  };
}

export interface Intent {
  summary: string;
  source: "github-pr" | "git-diff" | "unknown";
  confidence: "high" | "medium" | "low";
  details?: string;
}

export interface DetectedProject {
  root: string;
  packageManager: "pnpm" | "npm" | "yarn" | "bun" | "unknown";
  projectType: "next-react" | "react" | "node" | "unknown";
  scripts: Record<string, string>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  hasNext: boolean;
  hasReact: boolean;
  hasPlaywright: boolean;
  testRunners: Array<"vitest" | "jest">;
  openApiFiles: string[];
}

export interface Surface {
  kind: SurfaceKind;
  path: string;
  reasons: string[];
  confidence: "high" | "medium" | "low";
}

export interface NormalizedFinding {
  source: string;
  severity: Severity;
  title: string;
  path?: string;
  message?: string;
}

export interface FallowResult {
  available: boolean;
  skippedReason?: string;
  verdict?: "pass" | "warn" | "fail" | "unknown";
  findings: NormalizedFinding[];
  raw?: unknown;
}

export interface ImpactMap {
  changedFiles: ChangedFile[];
  project: DetectedProject;
  surfaces: Surface[];
  fallow: FallowResult;
  github?: GitHubContext;
}

export interface RiskItem {
  id: string;
  title: string;
  severity: Severity;
  surface: SurfaceKind;
  sourcePaths: string[];
  scenarios: string[];
  requiredChecks: RequiredCheck[];
  owasp: string[];
  coverage: "planned" | "existing" | "unmapped" | "not-applicable";
  rationale: string;
}

export interface RiskMatrix {
  risks: RiskItem[];
  counts: Record<Severity, number>;
}

export interface GateBlocker {
  id: string;
  severity: "critical";
  title: string;
  source: string;
  message?: string;
}

export interface Summary {
  runId: string;
  verdict: Verdict;
  mode: GateMode;
  generatedAt: string;
  artifactDir: string;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  blockers: GateBlocker[];
}
