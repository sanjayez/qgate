# QGate Quality Model

QGate is a gate for AI-generated code, so it does not get a free trust pass.
The project earns trust by staying deterministic, testable, and externally
checked.

## Trust Rules

- Gate verdicts come from explicit rules, artifact schemas, tests, and tool
  output.
- Unknowns stay visible. QGate should warn or block when it cannot map risk
  confidently.
- Every artifact must be machine-readable and schema-validated.
- Every risk must explain its source path, scenarios, required checks, and
  rationale.
- QGate can dogfood itself only after independent checks pass.

## Current Required Checks

- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- Semgrep rules under `.semgrep/`
- Gitleaks secret scanning
- OSV-Scanner dependency scanning

## Golden Fixtures

Fixture repos live under `tests/fixtures/` as base/head overlays. Tests create a
temporary git repo, commit the base state, commit the head state, and run QGate
against `HEAD~1...HEAD`.

Current golden scenarios:

- `form-pr`: a form change must produce `FORM-*` risk obligations.
- `api-pr`: an API route change must produce `API-*` boundary risks.
- `unknown-pr`: an unclassified runtime file must warn instead of passing
  silently.

## Invariants

QGate tests must protect these properties:

- Critical blockers never produce a `pass` verdict.
- `report-only` mode never blocks CI.
- Missing optional tools degrade visibly instead of crashing.
- Artifact paths cannot escape `.qgate/runs/<run-id>/`.
- Reports include artifact paths and blocker reasons.
- Risks include traceable source paths, scenarios, required checks, and
  rationale.

## Mutation Testing

Mutation testing is configured with Stryker for the highest-risk deterministic
logic:

- artifact path and schema handling
- changed-file classification
- config loading
- risk and verdict logic
- report rendering

Mutation testing is intentionally narrower than the normal test suite. It should
be expanded only when the core behavior stabilizes.

## Dogfooding Policy

QGate may run on QGate in `report-only` mode first. It should not become a
required self-gate until fixture coverage, invariant tests, external CI checks,
and mutation testing are strong enough to make failures meaningful.
