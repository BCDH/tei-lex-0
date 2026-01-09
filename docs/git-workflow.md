# Git Workflow

Goal: keep `dev` and `main` strictly linear; only feature branches get rebased/force-pushed.

## Branch creation (feature from dev)

- **CLI:** `git checkout dev && git pull && git checkout -b feature/xyz`
- **GitHub Desktop:** Switch to `dev` → Branch > New Branch (base on `dev`)

## Stay current (rebase feature onto dev)

- **When:** work on your feature and commit freely; when you’re ready to open a PR, rebase onto `dev` only if `dev` is ahead of your feature. If `dev` hasn’t moved past your branch point, just open the PR without rebasing.
- **CLI:** `git fetch && git rebase origin/dev` → push with `git push --force-with-lease`
- **GitHub Desktop:** Branch > Rebase Current Branch… → select `dev`, then Push (will force-push the rebased branch)

## Merge feature into dev (no merge commits)

- **GitHub PR:** choose “Rebase and merge” or “Squash and merge”; disable regular merge commits via branch protection. This keeps `dev` linear.
- **GitHub Desktop:** use “Create Pull Request” to open on GitHub; complete with a non-merge-commit option. Avoid local merges that create merge commits.

### How to disable regular merge commits (branch protection on GitHub)

1. In the repo on GitHub: Settings → Branches → Branch protection rules → “Add rule” (or edit your `dev`/`main` rule).
2. In “Branch name pattern”, enter the branch (e.g., `dev` or `main`), then check “Require linear history” (this rejects merge commits).
3. Optional but recommended: also check “Require a pull request before merging” and set allowed merge options to “Rebase and merge” and/or “Squash and merge”; uncheck “Allow merge commits.”
4. Save the rule.

## Release dev to main (fast-forward only)

- **CLI (preferred):** `git checkout main && git fetch && git merge --ff-only origin/dev && git push` (advances `main` to `dev` with no merge commit).
- **GitHub UI/Desktop:** GitHub PRs don’t offer a true fast-forward merge; “rebase”/“squash” create new commits. If you want `main` to exactly match `dev` with no new commits, use the CLI fast-forward above.

## Protections and rules

- Enable “Require linear history / prevent merge commits” on `dev` and `main`.
- Allow “Rebase and merge” or “Squash and merge” for PRs into `dev`.
- Never rebase `dev` or `main`. Only rebase your own feature branches; force-push them with `--force-with-lease` after rebasing.
