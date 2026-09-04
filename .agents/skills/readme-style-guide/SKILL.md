---
name: readme-style-guide
description: Canonical README/CHANGELOG structure, section-by-section guidance, and writing rules for this project. Load in full before drafting or editing README.md, CHANGELOG.md, or any root-level documentation.
---

# README Style Guide

## Canonical structure

```
# Project Name
One-line description + badges (license, build, version)

## Table of Contents
## About / Overview
## Features
## Demo                (only if UI-heavy — screenshots/GIFs)
## Tech Stack
## Getting Started
   ### Prerequisites
## Installation
## Usage
## Configuration
## Project Structure
## Testing
## Deployment
## Contributing
## Roadmap             (only if one actually exists)
## License
## Contact / Acknowledgments
```

Small or early-stage projects can collapse this to: **About → Features →
Installation → Usage → Contributing → License**. Trim, don't pad — a section
with nothing real to say is worse than no section.

## Style rules

- Tone: clear, concise, professional. No hype adjectives, no marketing copy.
- Emojis: only if the README already uses them consistently; if introducing
  them, keep to the Features section, sparingly.
- Short paragraphs, bullets over prose blocks, fenced code blocks with
  language tags.
- Every command shown must be real — copy it from the actual scripts /
  package manifest, never invent one.
- Minimal diffs: edit only what changed, so PR review stays fast and the
  file's git history stays legible.
- Keep the Table of Contents anchors in sync with actual headings.
- Environment variable examples always use placeholders
  (`API_KEY=your_api_key_here`), never real-looking values.

## Section-by-section notes

- **Overview**: the problem it solves and why someone would use it — not a
  restatement of the title.
- **Installation**: a working, copy-pasteable path from clone to running.
  Prefer the actual commands from CI config over paraphrased instructions.
- **Usage**: start with the simplest possible example, then advanced usage if
  relevant.
- **Configuration**: every env var / config key that's actually read by the
  code — cross-check against source before listing one.
- **Contributing**: link to `CONTRIBUTING.md` if it exists rather than
  duplicating its content here.

## Edge cases

- **No README exists yet**: generate one from the structure above, filling in
  only what's verifiable from the code, and mark unknowns with
  `<!-- TODO: confirm -->` rather than guessing.
- **Monorepo**: maintain the top-level README plus any per-package READMEs
  that already exist; link between them instead of duplicating content.
- **Revert PRs**: roll back the README section that documented the reverted
  feature.
- **Multiple language READMEs** (e.g. `README.fr.md`): update the primary
  file only, and note in your report that translations are now stale.

## CHANGELOG entries (if the file exists)

One line per merge, dated, in the imperative mood:

```
## 2026-09-04
- Add `--dry-run` flag to the CLI
- Fix pagination bug in `listUsers()`
```

Don't restate the full commit log — summarize what changed for someone
reading the file, not for git archaeology.
