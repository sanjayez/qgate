import type { RequiredCheck, Severity, SurfaceKind } from "../core/types.js";

export interface RiskTemplate {
  title: string;
  severity: Severity;
  scenarios: string[];
  requiredChecks: RequiredCheck[];
  owasp: string[];
  rationale: string;
}

export const riskCatalog: Record<SurfaceKind, RiskTemplate[]> = {
  form: [
    {
      title: "Form non-happy paths are covered",
      severity: "critical",
      scenarios: [
        "required fields are empty or whitespace-only",
        "malformed field values are rejected without data loss",
        "overly long and unicode input stays bounded and safe",
        "duplicate submit does not create duplicate side effects",
        "server 400/422 validation errors are shown inline",
        "server 500, timeout, and offline responses leave the user recoverable",
        "keyboard-only and mobile viewport interactions still work",
        "XSS-looking strings render as inert text"
      ],
      requiredChecks: ["component", "playwright", "accessibility", "security"],
      owasp: ["ASVS V5 Validation", "WSTG Input Validation", "OWASP Top 10 Injection"],
      rationale: "Forms are high-risk because they combine untrusted input, UI state, network calls, and user expectations."
    }
  ],
  api: [
    {
      title: "API boundary rejects malformed and unauthorized requests",
      severity: "critical",
      scenarios: [
        "missing authentication returns 401",
        "wrong role returns 403",
        "cross-user object access is denied",
        "malformed JSON and unknown fields are rejected",
        "mass-assignment fields are ignored or rejected",
        "invalid enums, nulls, and oversized arrays are rejected",
        "409/422/429/500 responses have consistent error shape",
        "request retries do not duplicate side effects"
      ],
      requiredChecks: ["api", "integration", "security"],
      owasp: ["OWASP API1 BOLA", "OWASP API3 BOPLA", "ASVS V4 Access Control"],
      rationale: "API changes expose trust boundaries and are a common source of AI-generated security regressions."
    }
  ],
  auth: [
    {
      title: "Auth and authorization failure paths are explicit",
      severity: "critical",
      scenarios: [
        "anonymous user cannot access protected behavior",
        "authenticated user without permission is denied",
        "user cannot access another user's object by changing an id",
        "stale, expired, or missing session is handled safely",
        "client-provided role/status fields are not trusted"
      ],
      requiredChecks: ["unit", "integration", "api", "security", "playwright"],
      owasp: ["ASVS V2 Authentication", "ASVS V4 Access Control", "OWASP Top 10 Broken Access Control"],
      rationale: "Authorization mistakes are usually severe and often invisible in happy-path tests."
    }
  ],
  data: [
    {
      title: "Data workflow handles conflicts and partial failures",
      severity: "critical",
      scenarios: [
        "duplicate records hit unique constraints cleanly",
        "concurrent updates do not overwrite silently",
        "transaction rollback leaves no partial state",
        "retry after network/process failure is safe",
        "stale cache or stale reads do not expose wrong data"
      ],
      requiredChecks: ["unit", "integration"],
      owasp: ["ASVS V11 Business Logic"],
      rationale: "Data bugs can pass UI tests while corrupting durable state."
    }
  ],
  dependency: [
    {
      title: "Dependency and supply-chain changes are scanned",
      severity: "warning",
      scenarios: [
        "new dependencies are expected and listed in the right dependency group",
        "lockfile changes match manifest changes",
        "known vulnerabilities are scanned",
        "unused or duplicate dependencies are reviewed"
      ],
      requiredChecks: ["static-analysis", "security"],
      owasp: ["OWASP Top 10 Vulnerable and Outdated Components"],
      rationale: "Dependency changes can introduce vulnerabilities, bundle bloat, or unreviewed transitive behavior."
    }
  ],
  config: [
    {
      title: "Configuration changes do not weaken runtime safety",
      severity: "warning",
      scenarios: [
        "environment variable changes have validation",
        "security headers and build/runtime flags remain intentional",
        "test, lint, and typecheck settings are not weakened silently",
        "secrets are not committed"
      ],
      requiredChecks: ["static-analysis", "security"],
      owasp: ["OWASP Top 10 Security Misconfiguration"],
      rationale: "Config changes can silently bypass protections without touching product code."
    }
  ],
  route: [
    {
      title: "User route handles loading, error, and navigation states",
      severity: "warning",
      scenarios: [
        "loading state is visible and non-blocking",
        "not-found and error states render safely",
        "back/refresh/deep-link navigation works",
        "mobile viewport does not hide primary actions",
        "unexpected API failure does not blank the page"
      ],
      requiredChecks: ["playwright", "accessibility", "performance"],
      owasp: ["ASVS V14 Configuration"],
      rationale: "Route changes often look correct in happy-path desktop testing but fail in real navigation paths."
    }
  ],
  component: [
    {
      title: "Component edge states are represented",
      severity: "warning",
      scenarios: [
        "empty, loading, error, and disabled states render correctly",
        "long text and missing optional props do not break layout",
        "callbacks are not invoked unexpectedly",
        "accessible labels and roles remain available"
      ],
      requiredChecks: ["component", "accessibility"],
      owasp: ["ASVS V5 Validation"],
      rationale: "Reusable UI can amplify a small state bug across many flows."
    }
  ],
  test: [
    {
      title: "Test changes assert behavior instead of implementation detail",
      severity: "info",
      scenarios: [
        "tests contain meaningful assertions",
        "tests fail if the behavior regresses",
        "mocks do not replace the entire behavior under test",
        "new tests cover at least one non-happy path when product behavior changes"
      ],
      requiredChecks: ["unit"],
      owasp: [],
      rationale: "AI-generated tests often increase coverage without proving behavior."
    }
  ],
  unknown: [
    {
      title: "Unknown changed surface is reviewed manually",
      severity: "warning",
      scenarios: [
        "reviewer confirms whether this file affects runtime behavior",
        "if runtime behavior changes, add a more specific qgate rule",
        "if safe, document why no automated test is required"
      ],
      requiredChecks: ["static-analysis"],
      owasp: [],
      rationale: "Unclassified files are review risk because the gate cannot map their failure modes yet."
    }
  ]
};

export function templateForSurface(kind: SurfaceKind): RiskTemplate[] {
  return riskCatalog[kind] ?? riskCatalog.unknown;
}
