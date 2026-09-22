---
name: git-workflow
description: Git and GitHub conventions for this project — branching, commits, and PRs. Use whenever making commits, creating branches, or opening pull requests.
---

# Git & GitHub Workflow Skill

This document defines how Claude Code should manage git and GitHub while working on this project. Follow these conventions automatically without needing to be asked each time.

## Branching Strategy

- **Never commit directly to `main`.** All work happens on feature branches.
- Create a new branch for each discrete task or feature before starting work.
- Branch naming convention:
  - `feat/<short-description>` — new features
  - `fix/<short-description>` — bug fixes
  - `chore/<short-description>` — tooling, config, cleanup
  - `docs/<short-description>` — documentation only
  - `refactor/<short-description>` — code restructuring, no behavior change
- Keep branch names lowercase, hyphen-separated, and short (3-5 words max).
- Before creating a new branch, always check out and pull the latest `main`:
  ```bash
  git checkout main
  git pull origin main
  git checkout -b feat/example-feature
  ```

## Commit Strategy

- **Commit automatically after each logical change** — don't wait for explicit instruction, and don't batch unrelated changes into one commit.
- A "logical change" = one coherent unit of work (e.g., one function implemented, one bug fixed, one config updated). If a task naturally splits into sub-steps, commit each sub-step separately.
- Always run `git status` and `git diff` before committing to confirm exactly what's being staged.
- Stage intentionally (`git add <specific files>`) rather than `git add .` when the working tree has unrelated changes.
- Never commit:
  - Secrets, API keys, `.env` files
  - Build artifacts / `node_modules` / `dist` / `__pycache__` (ensure `.gitignore` covers these)
  - Commented-out dead code left behind accidentally

## Commit Message Format — Conventional Commits

Use the format:
```
<type>(<optional scope>): <short summary>

<optional body explaining why, not what>
```

**Types:**
| Type | Use for |
|------|---------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, no code meaning change |
| `refactor` | Code change that's neither a fix nor a feature |
| `perf` | Performance improvement |
| `test` | Adding/fixing tests |
| `chore` | Tooling, dependencies, config |
| `ci` | CI/CD pipeline changes |

**Rules:**
- Summary line: imperative mood, lowercase, no trailing period, ≤72 chars.
  - Good: `feat(auth): add password reset endpoint`
  - Bad: `Added password reset.`
- Use the body to explain *why* when the change isn't self-evident from the diff.
- Breaking changes: add `!` after type/scope and a `BREAKING CHANGE:` footer.
  - `feat(api)!: remove deprecated v1 endpoints`
- **Never add a `Co-Authored-By: Claude` (or any Anthropic) trailer to commit messages.** GitHub renders that trailer as an extra contributor/avatar on the commit, which this project doesn't want — commits should show only the human author.

## Pushing & Pull Requests (Full GitHub Flow via `gh` CLI)

1. After the feature branch's work is complete (or at a sensible checkpoint), push the branch:
   ```bash
   git push -u origin feat/example-feature
   ```
2. Create a PR using the GitHub CLI:
   ```bash
   gh pr create --title "feat: add password reset endpoint" \
     --body "$(cat <<'EOF'
   ## Summary
   - Brief bullet list of what changed and why

   ## Testing
   - How this was verified
   EOF
   )"
   ```
3. PR title should follow the same Conventional Commits format as commits.
4. PR body should always include:
   - **Summary** — what changed and why, in a few bullets
   - **Testing** — how it was verified (tests run, manual checks, etc.)
5. Do not merge the PR automatically — leave that for explicit human approval unless told otherwise.
6. After a PR is merged (confirm with the user or check `gh pr status`), clean up:
   ```bash
   git checkout main
   git pull origin main
   git branch -d feat/example-feature
   git push origin --delete feat/example-feature
   ```

## General Hygiene

- Check `git status` before and after any batch of file edits to catch unintended changes.
- If a `.gitignore` doesn't exist or is incomplete for the stack in use, create/update it before the first commit.
- Never force-push (`git push -f`) to shared branches like `main` without explicit confirmation.
- If a merge conflict arises, surface it clearly and ask before resolving in a way that could discard someone else's work.
- Keep commits atomic and revertible — avoid a single commit that mixes feature code with unrelated refactors.

## Quick Reference — Typical Flow

```bash
git checkout main && git pull origin main
git checkout -b feat/new-thing
# ... make changes ...
git add <files>
git commit -m "feat: implement new thing"
# ... more changes, more atomic commits ...
git push -u origin feat/new-thing
gh pr create --title "feat: implement new thing" --body "..."
```