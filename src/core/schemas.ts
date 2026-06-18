import { z } from "zod";

const SeveritySchema = z.enum(["critical", "warning", "info"]);
const VerdictSchema = z.enum(["pass", "warn", "fail"]);
const GateModeSchema = z.enum(["critical-blocks", "report-only", "strict"]);
const SurfaceKindSchema = z.enum([
  "form",
  "api",
  "auth",
  "data",
  "dependency",
  "config",
  "route",
  "component",
  "test",
  "unknown"
]);
const RequiredCheckSchema = z.enum([
  "unit",
  "component",
  "integration",
  "playwright",
  "api",
  "security",
  "accessibility",
  "performance",
  "static-analysis"
]);

const ChangedFileSchema = z.object({
  path: z.string().min(1),
  oldPath: z.string().min(1).optional(),
  status: z.enum(["added", "modified", "deleted", "renamed", "copied", "unknown"])
});

const GitHubContextSchema = z.object({
  repository: z.string().optional(),
  eventName: z.string().optional(),
  pullRequest: z
    .object({
      number: z.number().int().positive().optional(),
      title: z.string().optional(),
      body: z.string().optional(),
      url: z.string().optional(),
      baseRef: z.string().optional(),
      headRef: z.string().optional()
    })
    .optional()
});

export const IntentSchema = z.object({
  summary: z.string().min(1),
  source: z.enum(["github-pr", "git-diff", "unknown"]),
  confidence: z.enum(["high", "medium", "low"]),
  details: z.string().optional()
});

const DetectedProjectSchema = z.object({
  root: z.string().min(1),
  packageManager: z.enum(["pnpm", "npm", "yarn", "bun", "unknown"]),
  projectType: z.enum(["next-react", "react", "node", "unknown"]),
  scripts: z.record(z.string(), z.string()),
  dependencies: z.record(z.string(), z.string()),
  devDependencies: z.record(z.string(), z.string()),
  hasNext: z.boolean(),
  hasReact: z.boolean(),
  hasPlaywright: z.boolean(),
  testRunners: z.array(z.enum(["vitest", "jest"])),
  openApiFiles: z.array(z.string())
});

const SurfaceSchema = z.object({
  kind: SurfaceKindSchema,
  path: z.string().min(1),
  reasons: z.array(z.string().min(1)).min(1),
  confidence: z.enum(["high", "medium", "low"])
});

const NormalizedFindingSchema = z.object({
  source: z.string().min(1),
  severity: SeveritySchema,
  title: z.string().min(1),
  path: z.string().optional(),
  message: z.string().optional()
});

const FallowResultSchema = z.object({
  available: z.boolean(),
  skippedReason: z.string().optional(),
  verdict: z.enum(["pass", "warn", "fail", "unknown"]).optional(),
  findings: z.array(NormalizedFindingSchema),
  raw: z.unknown().optional()
});

export const ImpactMapSchema = z.object({
  changedFiles: z.array(ChangedFileSchema),
  project: DetectedProjectSchema,
  surfaces: z.array(SurfaceSchema),
  fallow: FallowResultSchema,
  github: GitHubContextSchema.optional()
});

const RiskItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  severity: SeveritySchema,
  surface: SurfaceKindSchema,
  sourcePaths: z.array(z.string()),
  scenarios: z.array(z.string().min(1)).min(1),
  requiredChecks: z.array(RequiredCheckSchema),
  owasp: z.array(z.string()),
  coverage: z.enum(["planned", "existing", "unmapped", "not-applicable"]),
  rationale: z.string().min(1)
});

const SeverityCountsSchema = z.object({
  critical: z.number().int().nonnegative(),
  warning: z.number().int().nonnegative(),
  info: z.number().int().nonnegative()
});

export const RiskMatrixSchema = z.object({
  risks: z.array(RiskItemSchema),
  counts: SeverityCountsSchema
});

const GateBlockerSchema = z.object({
  id: z.string().min(1),
  severity: z.literal("critical"),
  title: z.string().min(1),
  source: z.string().min(1),
  message: z.string().optional()
});

export const SummarySchema = z.object({
  runId: z.string().min(1),
  verdict: VerdictSchema,
  mode: GateModeSchema,
  generatedAt: z.string().datetime(),
  artifactDir: z.string().min(1),
  criticalCount: z.number().int().nonnegative(),
  warningCount: z.number().int().nonnegative(),
  infoCount: z.number().int().nonnegative(),
  blockers: z.array(GateBlockerSchema)
});

const JsonArtifactSchemas = {
  "intent.json": IntentSchema,
  "impact-map.json": ImpactMapSchema,
  "risk-matrix.json": RiskMatrixSchema,
  "summary.json": SummarySchema
} satisfies Record<string, z.ZodType<unknown>>;

export function validateJsonArtifact(name: string, value: unknown): unknown {
  const schema = JsonArtifactSchemas[name as keyof typeof JsonArtifactSchemas];
  return schema ? schema.parse(value) : value;
}
