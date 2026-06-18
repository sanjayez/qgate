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

QGate is failure-mode driven, not coverage driven. Optional OSS tools such as
Fallow, Semgrep, Gitleaks, OSV-Scanner, Playwright, and Schemathesis contribute
evidence, but QGate owns the risk matrix and final verdict.

## Documentation

- [Architecture](docs/architecture.md)
- [Roadmap](docs/roadmap.md)
- [Quality model](docs/quality.md)
- [V1 specification](docs/v1-spec.md)
