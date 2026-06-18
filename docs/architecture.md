# qgate Architecture

## CLI-First Design

`qgate` is a one-shot CLI for local and CI use. V1 avoids a web dashboard so the
quality gate can run directly in pull request workflows.

Primary commands:

- `qgate init`
- `qgate plan`
- `qgate run`
- `qgate report`

## Failure-Mode Pipeline

QGate is failure-mode driven, not coverage driven. The main question is not
"did tests run?" but "did every changed behavior prove the relevant failure
paths?"

The pipeline is:

1. **PR intake**: read PR metadata, linked context, commits, changed files,
   schemas, config, migrations, and tests.
2. **Intent extraction**: state what the PR claims to change. If intent is
   unclear for a non-empty change, mark the PR risky. Optional LLM support may
   help summarize intent, but cannot decide the verdict.
3. **Impact mapping**: map affected UI, forms, routes, APIs, services, data
   stores, validators, auth policies, external providers, and tests.
4. **Risk classification**: tag changed areas with triggers such as `form`,
   `auth`, `api`, `data mutation`, `migration`, `PII`, `admin action`, and
   `external API`.
5. **Non-happy-path expansion**: expand each risk tag into required scenarios
   for bad input, bad state, bad permissions, bad network, bad timing, bad data,
   bad dependencies, and known vulnerability classes.
6. **Vulnerability mapping**: map relevant risks to OWASP ASVS, WSTG, OWASP Top
   10, and OWASP API Top 10 categories.
7. **Test plan generation**: emit required tests, security checks, Playwright
   flows, untestable items, and merge-blocking gaps.
8. **Test generation**: generate candidate unit, component, integration, API,
   Playwright, and security test scaffolds. V1 keeps this dry-run/reviewable.
9. **Execution**: run fast checks on PRs and deeper checks in configured
   contexts such as merge/nightly.
10. **Evidence report and verdict**: show what changed, what could go wrong,
   what was tested, what failed, what remains risky, and whether merge is
   blocked.

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

The core planning artifact is the Non-Happy-Path Matrix in `risk-matrix.json`.
It turns a large PR into a finite set of failure modes and required checks.

## Deterministic-First Policy

The default source of truth is deterministic evidence:

- git diffs
- project manifests
- static code structure
- analyzer output
- test and scanner results

LLMs may later improve summaries or generate test scaffolds, but they are not
required for v1 gate decisions.

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

| Pipeline step | QGate responsibility | Default OSS tools |
| --- | --- | --- |
| PR intake | Read declared intent, refs, event payloads, commits, and changed files. | `git`, GitHub Actions environment, optional `gh` |
| Intent extraction | Summarize the claimed behavior change and flag unclear intent. | PR metadata, commits, optional LLM adapter |
| Impact mapping | Detect affected surfaces, package manager, framework, scripts, tests, and schemas. | native rules, `rg`, `fast-glob`, later `ast-grep`/tree-sitter |
| Risk classification | Tag changed areas with failure-mode triggers. | QGate native rules, Fallow/Semgrep evidence |
| Non-happy-path expansion | Convert risk tags into required failure scenarios. | QGate risk catalog |
| Vulnerability mapping | Map risks to security categories. | OWASP ASVS, WSTG, Top 10, API Top 10 mappings |
| Test plan generation | Emit required tests, checks, flows, gaps, and manual-review items. | QGate renderer |
| Test generation | Generate reviewable candidate test scaffolds. | QGate generator, Playwright, Vitest/Jest, MSW, Schemathesis |
| Secret scanning | Detect committed credentials and sensitive tokens. | Gitleaks |
| Dependency scanning | Detect known vulnerable packages. | OSV-Scanner |
| API/schema analysis | Detect contract changes and API failure paths when schemas exist. | oasdiff, Schemathesis |
| Unit/component execution | Run existing automated tests. | Vitest, Jest, Testing Library |
| UI/user-flow execution | Exercise impacted routes, forms, and interactions. | Playwright, axe-core |
| Network/API failure simulation | Simulate error, timeout, and malformed-response paths. | MSW |
| Reporting and verdict | Normalize evidence, render artifacts, and calculate pass/warn/fail. | QGate |

## Verdict Model

Findings use three severities:

- `critical`: blocks CI in `critical-blocks` mode.
- `warning`: appears in reports but does not block by default.
- `info`: context for reviewers and future automation.

V1 blocks only on objective critical signals such as failed tests, high-risk
security findings, breaking API contracts, or fail-level optional analyzer
findings.
