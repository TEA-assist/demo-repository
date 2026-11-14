# AGENTS.md — demo-repository

## Hard Requirements

- **Commit/push authorization (HARD REQUIREMENT)**: NEVER run `git commit` or `git push` unless the user explicitly asks you to in the current turn. The user will always tell you when to commit and push — never commit or push proactively, even after a task is finished, verified, or the user says "continue". Always wait for the explicit request.
- **Issue reference (HARD REQUIREMENT)**: Before every commit, **ask the user which of the three commit options applies** — (A) reference an existing issue: `closes #N` / `fixes #N` when the commit completes it, `refs #N` when it only touches it; (B) let Project Sync auto-create the task: commit with **no reference and no `[skip-task]`**; (C) skip the board entirely: `[skip-task]` for scratch/CI-only work. See [docs/project-board-automation.md](docs/project-board-automation.md).
- Never commit real secrets.