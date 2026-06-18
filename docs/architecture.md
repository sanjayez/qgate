# qgate Architecture

## CLI-First Design

`qgate` is a one-shot CLI for local and CI use. V1 avoids a web dashboard so the
quality gate can run directly in pull request workflows.

Primary commands:

- `qgate init`
- `qgate plan`
- `qgate run`
- `qgate report`

## Evidence Pipeline

The pipeline is adapter-based:

1. Read config and create a run directory.
2. Read declared intent from GitHub PR metadata, branch names, and commits when
   available.
3. Read local git diff and changed-file status.
4. Detect project shape, package manager, scripts, frameworks, and installed
   tools.
5. Build observed intent from changed surfaces such as forms, APIs, auth, data,
   dependencies, config, routes, components, and tests.
6. Optionally run an LLM intent adapter to summarize the change from cited
   evidence. LLM output is evidence only and cannot decide the gate verdict.
7. Run optional tool adapters and native analyzers.
8. Normalize tool output into QGate findings, impacted surfaces, execution
   results, and artifact records.
9. Generate non-happy-path risks and test obligations.
10. Render reports and calculate the gate verdict.

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

## Intent Model

Intent is evidence, not authority. QGate keeps three intent layers:

- `declared`: PR title/body, linked issue text, branch names, and commit
  messages.
- `observed`: deterministic signals from changed files, code surfaces, manifests,
  schemas, tests, and tool output.
- `inferred`: optional LLM-generated summary from cited evidence.

If declared and observed/inferred intent disagree, QGate should surface that as a
warning or blocker depending on gate mode and risk. For example, a PR described
as a copy change that modifies auth or API behavior should not receive a quiet
pass.

## Tool Adapter Model

External tools are adapters in the same evidence pipeline. No tool owns the
verdict. Each adapter should:

- detect whether the tool is installed and configured;
- run only in local/CI OSS mode by default;
- fail visibly with a warning when optional tooling is unavailable;
- emit normalized findings or execution results;
- preserve enough raw evidence for reviewers to audit the result.

Tool output feeds QGate-owned artifacts such as `impact-map.json`,
`risk-matrix.json`, `execution-results.json`, and `summary.json`. QGate owns the
final policy decision.

## Default OSS Toolchain

V1 is local/CI and OSS-first. Some tools may also offer hosted or paid features,
but QGate should default to local/free modes unless explicitly configured
otherwise.

| Pipeline step | QGate responsibility | Default tools |
| --- | --- | --- |
| PR metadata intake | Read declared intent, refs, event payloads, and linked context when available. | `git`, GitHub Actions environment, optional `gh` |
| Diff intake | Parse changed files, status, and scope. | `git` |
| Project detection | Detect package manager, framework, scripts, tests, and schemas. | native manifest/file inspection, `fast-glob` |
| Static/codebase analysis | Enrich the impact map with code intelligence. | native rules, Fallow, Semgrep |
| Secret scanning | Detect committed credentials and sensitive tokens. | Gitleaks |
| Dependency scanning | Detect known vulnerable packages. | OSV-Scanner |
| API/schema analysis | Detect contract changes and API failure paths when schemas exist. | oasdiff, Schemathesis |
| Unit/component execution | Run existing automated tests. | Vitest, Jest, Testing Library |
| UI/user-flow execution | Exercise impacted routes, forms, and interactions. | Playwright, axe-core |
| Network/API failure simulation | Simulate error, timeout, and malformed-response paths. | MSW |
| Risk generation | Convert impacted surfaces into non-happy-path obligations. | QGate native rules |
| Reporting and verdict | Normalize evidence, render artifacts, and calculate pass/warn/fail. | QGate |

Fallow is therefore one optional static-analysis adapter. It can enrich JS/TS
codebase intelligence, but it does not replace native analysis, test execution,
security scanners, or QGate's risk engine.

## Verdict Model

Findings use three severities:

- `critical`: blocks CI in `critical-blocks` mode.
- `warning`: appears in reports but does not block by default.
- `info`: context for reviewers and future automation.

V1 blocks only on objective critical signals such as failed tests, high-risk
security findings, breaking API contracts, or fail-level optional analyzer
findings.
