# Git Workflow

Goal: keep `dev` and `main` strictly linear with rebase-only PR merges, publish production by fast-forwarding `main` to `dev`, and publish immutable releases from annotated `vX.Y.Z` tags on `main`.

## Overview

- Set up [required settings](#required-github-settings) on GitHub
- **Publish to dev site:** merge PRs into `dev` (rebase-only) → pushing to `dev` triggers deployment to `dev.lex0.org`.
- **Publish to production site:** fast-forward `main` to `dev` → pushing to `main` triggers deployment to `lex0.org`.
- **Publish an immutable release:** create an **annotated** tag `vX.Y.Z` on `main` and push the tag → GitHub Actions publishes to `gh-pages/releases/vX.Y.Z/` and updates `RELEASES.md`.

## Feature branch creation

Always create feature branches from `dev`.

- **CLI:** `git checkout dev && git pull && git checkout -b feature/xyz`
- **GitHub Desktop:** Switch to `dev` → Branch > New Branch (base on `dev`)

## Always target `dev` in PRs

- **CLI:** `gh pr create --base dev`
- **GitHub Desktop:** Create PR (will default to targeting `main`), then change manually online.

## Stay current

Work on your feature and commit freely; when you’re ready to open a PR, rebase onto `dev` only if `dev` is ahead of your feature. If `dev` hasn’t moved past your branch point, just open the PR without rebasing.

- **CLI:** `git fetch && git rebase origin/dev` → push with `git push --force-with-lease`
- **GitHub Desktop:** Branch > Rebase Current Branch… → select `dev`, then Push (will force-push the rebased branch)

## Merge feature into `dev`

- **GitHub PR:** choose “Rebase and merge” (rebase-only). This keeps `dev` linear and preserves per-commit history. See Required GitHub.com settings below.
- **GitHub Desktop:** use “Create Pull Request” to open on GitHub; complete with a non-merge-commit option. Avoid local merges that create merge commits.

## Release `dev` to `main` (ff only)

- **CLI (preferred):** `git checkout main && git fetch && git merge --ff-only origin/dev && git push` (advances `main` to `dev` with no merge commit).
- **GitHub UI/Desktop:** GitHub PRs don’t offer a true fast-forward merge; “rebase”/“squash” create new commits. If you want `main` to exactly match `dev` with no new commits, you MUST use the CLI fast-forward above.

## Publish a release

Releases are immutable snapshots published under `lex0.org/releases/vX.Y.Z/` (GitHub Pages, behind a Vercel rewrite). The release workflow is tag-driven and requires an **annotated** tag on `main`.

### Preconditions (once per repo)

- GitHub Pages is enabled and configured to serve from the `gh-pages` branch.
- The `build-site` workflow exists (`.github/workflows/site-build.yml`) and is green on pushes.
- Vercel projects are configured to deploy `vercel-main` and `vercel-dev` branches.

### Release process

1. Fast-forward `main` to `dev` (see [above](#release-dev-to-main-ff-only).)
2. Wait for GitHub Actions → `build-site` on `main` to finish successfully (this deploys `lex0.org`).
3. Create an **annotated** tag on `main` and push it:

   - `git checkout main`
   - `git pull --ff-only origin main`
   - `git tag -a vX.Y.Z -m "Release vX.Y.Z"`
   - `git push origin vX.Y.Z`

4. Monitor GitHub Actions → `build-site` → `tag_release` job:

   - Publishes `build/html` to `gh-pages/releases/vX.Y.Z/`
   - Regenerates `gh-pages/releases/index.html`
   - Appends the release URL to `RELEASES.md` on `main`

5. Verify:

   - `https://lex0.org/releases/vX.Y.Z/` loads
   - Assets resolve (no `github.io` URLs)

Notes:

- Tags must be **annotated**. The workflow rejects lightweight tags.
- Re-using an existing tag (or attempting to publish a release folder that already exists) is blocked by CI.

Note: GitHub Desktop is fine for day-to-day work, but the release tag must be an **annotated git tag**, so you must use a terminal for this.

## Required GitHub settings

These settings prevent accidental non-linear history.

**Repo settings → Pull Requests**

- Enable: “Allow rebase merging”
- Disable: “Allow merge commits”
- Disable: “Allow squash merging” (rebase-only)
- Set “Always suggest updating pull request branches” to **Never** (the “Update branch” flow is not compatible with rebase-only workflows)

**Repo settings → Rules → Rulesets**

Create (or edit) a ruleset that targets both protected branches:

- Target branches (fnmatch patterns): add two include patterns: `main` and `dev`
- Enable: “Require a pull request before merging”
- Enable: “Require linear history”
- Enable: “Block force pushes” and “Block deletions”
- TODO: think about requiring approvals and required status checks. For now, it sounds like an overkill.

**Bypass list**

- Keep the bypass list **empty**. If you can bypass the rules, you can still merge with disallowed strategies.

In a nutshell: never rebase `dev` or `main`. Only rebase your own feature branches, then force-push them with `--force-with-lease` after rebasing.

For deployment architecture details (Vercel, GitHub Pages, release archive), see [`deployment.md`](deployment.md).
