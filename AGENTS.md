# AGENTS.md — demo-repository

> **DANGEROUS:** Commit/push permission is one-job-only. Never reuse it. Never commit or push without a fresh explicit request for the current job.

## Hard Requirements

- **DANGEROUS — ONE-JOB-ONLY commit/push authorization (HARD REQUIREMENT)**: NEVER run `git commit` or `git push` unless the user explicitly asks in the current message **for that specific job**. That authorization is consumed by that one job only. It must NEVER carry over to later jobs, follow-ups, “continue”, or subsequent turns. After finishing the authorized job, immediately return to read-only. Never commit or push proactively, even after work is verified. If there is any doubt, do not commit or push — ask first. Reusing old authorization or committing/pushing without a fresh explicit request is a critical violation.
- **Issue reference (HARD REQUIREMENT)**: Before every commit, **ask the user which of the three commit options applies** — (A) reference an existing issue: `closes #N` / `fixes #N` when the commit completes it, `refs #N` when it only touches it; (B) let Project Sync auto-create the task: commit with **no reference and no `[skip-task]`**; (C) skip the board entirely: `[skip-task]` for scratch/CI-only work. See [docs/project-board-automation.md](docs/project-board-automation.md).
- Never commit real secrets.
