# qgate

`qgate` is a deterministic PR quality gate for AI-generated code. V1 targets
GitHub PRs in Next.js and React JS/TS projects.

It produces:

- PR intent
- impact map
- non-happy-path risk matrix
- test plan
- Markdown, HTML, and JSON gate reports

## Quick Start

```bash
pnpm install
pnpm build
pnpm dev -- --help
```

Inside a target project:

```bash
qgate init
qgate plan --base origin/main --head HEAD
qgate run --base origin/main --head HEAD
qgate report latest
```

Fallow is optional. When installed in a JS/TS project, `qgate` runs
`fallow audit --format json --quiet` and folds its deterministic codebase
intelligence into the gate report.
