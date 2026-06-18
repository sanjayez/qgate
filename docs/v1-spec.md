# qgate V1 Specification

## Command Contracts

### `qgate init`

Creates starter project files in the current working directory:

- `qgate.config.ts`
- `.github/workflows/qgate.yml`

Options:

- `--dry-run`: print files that would be written.
- `--force`: overwrite existing files.

### `qgate plan --base <ref> --head <ref>`

Generates deterministic planning artifacts without running expensive checks.

Outputs:

- `intent.json`
- `impact-map.json`
- `risk-matrix.json`
- `test-plan.md`
- `summary.json`

### `qgate run --base <ref> --head <ref>`

Runs `plan`, applies the configured gate mode, renders reports, and exits:

- `0`: pass or warning-only.
- `1`: critical blocker.
- `2`: operational failure.

### `qgate report <run-id>`

Renders `gate-report.md` and `gate-report.html` from existing run artifacts.
Use `latest` to render the newest run.

## Config Schema

`qgate.config.ts` must export a JSON-compatible object via `defineConfig`.

```ts
import { defineConfig } from "qgate/config";

export default defineConfig({
  "project": "next-react",
  "mode": "critical-blocks",
  "tools": {
    "fallow": { "enabled": true },
    "playwright": { "enabled": true },
    "semgrep": { "enabled": true },
    "gitleaks": { "enabled": true },
    "osvScanner": { "enabled": true }
  },
  "reports": {
    "markdown": true,
    "html": true,
    "json": true
  }
});
```

## Artifact Schemas

### `intent.json`

- `summary`: inferred PR intent.
- `source`: `github-pr`, `git-diff`, or `unknown`.
- `confidence`: `high`, `medium`, or `low`.

### `impact-map.json`

- `changedFiles`: git file status.
- `project`: detected project metadata.
- `surfaces`: classified changed code surfaces.
- tool adapter outputs; the current first adapter field is `fallow`, and later
  adapters should move toward a generic normalized tool result shape.

### `risk-matrix.json`

- `risks`: non-happy-path risks.
- `coverage`: planned, existing, unmapped, or not-applicable.
- `requiredChecks`: unit, component, integration, playwright, api, security, accessibility, or performance.

### `summary.json`

- `runId`
- `verdict`
- `criticalCount`
- `warningCount`
- `infoCount`
- `artifactDir`

## Risk Categories

V1 expands the following surfaces:

- forms
- APIs
- auth and authorization
- data workflows
- dependencies
- configuration
- UI routes/components
- tests
- unknown changed files

## Critical Blockers

V1 blocks on:

- operational failure reading the diff
- no inferable PR intent for a non-empty change
- fail-level optional analyzer findings when enabled and available
- high or critical security findings once scanner execution is enabled
- failed targeted tests once runner execution is enabled
- breaking API contract findings once schema diff execution is enabled

## Warning-Only Conditions

V1 warns on:

- optional tool unavailable
- OpenAPI schema unavailable
- low-confidence surface classification
- missing optional tools
- medium-risk non-happy-path obligations
- coverage unavailable

## Supported Tool Integrations

V1 recognizes these tools:

- Fallow
- Semgrep
- Gitleaks
- OSV-Scanner
- Playwright
- Vitest
- Jest
- Testing Library
- MSW
- Schemathesis
- oasdiff
- axe-core through Playwright
