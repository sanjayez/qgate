# qgate Roadmap

`qgate` is a CLI-first quality gate for AI-generated pull requests. It turns a
large PR into deterministic evidence: intent, impacted surfaces,
non-happy-path risk, test obligations, and a merge verdict.

## Phase 1: CLI Foundation

- Scaffold TypeScript CLI, config loading, artifact writer, logging, and exit codes.
- Support `qgate init`, `qgate plan`, `qgate run`, and `qgate report`.
- Store all run artifacts under `.qgate/runs/<run-id>/`.

## Phase 2: GitHub PR And Local Diff Intake

- Read base/head refs from CLI flags or GitHub Actions environment variables.
- Extract PR title/body from the GitHub event payload when available.
- Parse changed files, status, and diff scope from git.

## Phase 3: Project Detection

- Detect Next.js, React, Vitest, Jest, Testing Library, Playwright, MSW, and OpenAPI files.
- Detect package manager and available scripts.
- Classify changed files into routes, components, forms, API handlers, auth, config, dependencies, migrations, and tests.

## Phase 4: Optional Fallow Adapter

- Run `fallow audit --format json --quiet` when Fallow is available.
- Normalize PR risk, duplication, complexity, architecture, dependency hygiene, dead code, and Next.js correctness findings.
- Treat Fallow as optional JS/TS codebase intelligence, not a hard dependency.

## Phase 5: Native Impact Analysis

- Add AST-backed JS/TS analysis for form controls, submit handlers, API handlers, auth guards, validation schemas, fetch calls, and dangerous rendering paths.
- Add test smell detection for tests without assertions and mocked-only paths.
- Add lightweight contract-change detection for API schema files.

## Phase 6: Non-Happy-Path Risk Matrix

- Expand each impacted surface into required failure-mode scenarios.
- Map relevant risks to OWASP ASVS, WSTG, OWASP Top 10, and OWASP API Top 10.
- Emit reviewable `risk-matrix.json` and `test-plan.md`.

## Phase 7: Execution Gate

- Run targeted tests using detected scripts.
- Run Playwright for impacted UI routes/forms with traces, screenshots, console checks, and network failure checks.
- Run Semgrep, Gitleaks, OSV-Scanner, Schemathesis, and oasdiff when available.
- Normalize all results into `critical`, `warning`, and `info`.

## Phase 8: Reports

- Emit `summary.json`, `gate-report.md`, and `gate-report.html`.
- Add optional JUnit and SARIF outputs for CI annotations.
- Keep reports readable without a hosted dashboard.

## Phase 9: Generated Test Scaffolds

- Add `qgate generate-tests --dry-run`.
- Generate candidate Playwright, Vitest, and Jest test stubs from risk IDs.
- Require every generated test to trace back to a risk matrix item.

## Phase 10: Later Adapters

- Add Python/FastAPI/Django adapters.
- Add API-first project mode.
- Add optional BYO/local LLM summaries after deterministic evidence is useful.
