# qgate Architecture

## CLI-First Design

`qgate` is a one-shot CLI for local and CI use. V1 avoids a web dashboard so the
quality gate can run directly in pull request workflows.

Primary commands:

- `qgate init`
- `qgate plan`
- `qgate run`
- `qgate report`

## Analyzer Pipeline

The pipeline is adapter-based:

1. Read config and create a run directory.
2. Read GitHub PR metadata when available.
3. Read local git diff.
4. Detect project shape and installed tools.
5. Run optional analyzers such as Fallow.
6. Run native changed-file and framework analyzers.
7. Generate non-happy-path risks and test obligations.
8. Render reports and calculate the gate verdict.

## Artifact-First Storage

Each run writes immutable artifacts under:

```text
.qgate/runs/<run-id>/
```

Core artifacts:

- `intent.json`
- `impact-map.json`
- `risk-matrix.json`
- `test-plan.md`
- `summary.json`
- `gate-report.md`
- `gate-report.html`

The artifact model keeps v1 simple, scriptable, and CI-friendly.

## Deterministic-First Policy

The default source of truth is deterministic evidence:

- git diffs
- project manifests
- static code structure
- analyzer output
- test and scanner results

LLMs may later improve summaries or generate test scaffolds, but they are not
required for v1 gate decisions.

## Fallow Integration

Fallow is optional. When available, `qgate` runs:

```bash
fallow audit --format json --quiet
```

Fallow findings enrich the impact map with JS/TS codebase intelligence:

- PR risk
- complexity
- duplication
- architecture issues
- dependency hygiene
- dead code
- Next.js correctness

Fallow does not replace QGate's non-happy-path risk engine.

## Verdict Model

Findings use three severities:

- `critical`: blocks CI in `critical-blocks` mode.
- `warning`: appears in reports but does not block by default.
- `info`: context for reviewers and future automation.

V1 blocks only on objective critical signals such as failed tests, high-risk
security findings, breaking API contracts, or fail-level optional analyzer
findings.
