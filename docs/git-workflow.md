# Git Workflow

Goal: keep `dev` and `main` strictly linear with rebase-only PR merges, publish production by fast-forwarding `main` to `dev`, and publish immutable releases from annotated `vX.Y.Z` tags on `main`.

## Overview

- Set up [required settings](#required-github-settings) on GitHub
- **Publish to dev site:** merge PRs into `dev` (rebase-only) → pushing to `dev` triggers deployment to `dev.lex-0.org`.
- **Publish to production site:** fast-forward `main` to `dev` → pushing to `main` triggers deployment to `lex-0.org`.
- **Publish an immutable release:** create an **annotated** tag `vX.Y.Z` on `main` and push the tag → GitHub Actions publishes to `gh-pages/releases/vX.Y.Z/` and updates the releases index on `gh-pages`.

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

Releases are immutable snapshots published under `lex-0.org/releases/vX.Y.Z/` (GitHub Pages, behind a Vercel rewrite). The release workflow is tag-driven and requires an **annotated** tag on `main`.

### Preconditions (once per repo)

- GitHub Pages is enabled and configured to serve from the `gh-pages` branch.
- The `build-site` workflow exists (`.github/workflows/site-build.yml`) and is green on pushes.
- Vercel projects are configured to deploy `vercel-main` and `vercel-dev` branches.

### Release preflight (recommended)

Run release doctor before cutting a release:

- `npm run release:doctor -- --tag vX.Y.Z`

It checks branch topology, rulesets, workflow wiring, required secrets, tag
collisions, tag vs `odd/lex-0.odd` edition alignment, and release metadata
readiness (`date-released` on `origin/dev`).

### Release automation (preferred)

Use repo-local Node scripts:

- Prepare release metadata PR on `dev`:
  - `npm run release:prepare -- --tag vX.Y.Z`
- End-to-end release (prepare -> FF `dev` to `main` -> trigger `release-helper`):
  - `npm run release:cut -- --tag vX.Y.Z`

Both support `--dry-run`; pass `--yes --non-interactive` for unattended runs.
Legacy fish helpers can still be used, but the npm scripts are the canonical path.

### Release process (owner-only automation)

Use the GitHub Actions **release-helper** workflow (`.github/workflows/release-helper.yml`, manual trigger). It is gated to `ttasovac` and:

- validates that `main` already contains `dev` (FF promotion must already be done)
- validates that `CITATION.cff` on `main` already includes `date-released`
- creates an annotated tag `vX.Y.Z`

Then the normal tag build publishes to `gh-pages/releases/vX.Y.Z/`.

### Release process (manual alternative)

1. Prepare release citation metadata via a PR to `dev` (because `dev` is PR-only):

   - `git checkout dev && git pull --ff-only origin dev`
   - `git checkout -b chore/release-prep-vX.Y.Z`
   - `node scripts/update-citation-metadata.mjs --commit "$(git rev-parse origin/dev)" --date "$(date -u +%F)" --date-released "$(date -u +%F)"`
   - `git add CITATION.cff && git commit -m "chore: prepare citation metadata for vX.Y.Z"`
   - `git push -u origin chore/release-prep-vX.Y.Z`
   - `gh pr create --base dev --head chore/release-prep-vX.Y.Z --title "chore: prepare citation metadata for vX.Y.Z" --body ""`
   - `gh pr merge --rebase --auto`
2. Wait for GitHub Actions → `citation-metadata` and `build-site` on `dev` to finish successfully.
3. Fast-forward `main` to `dev` (see [above](#release-dev-to-main-ff-only).)
4. Wait for GitHub Actions → `build-site` on `main` to finish successfully (this deploys `lex-0.org`).
5. Create an **annotated** tag on `main` and push it:

   - `git checkout main`
   - `git pull --ff-only origin main`
   - `git tag -a vX.Y.Z -m "Release vX.Y.Z"`
   - `git push origin vX.Y.Z`

6. Monitor GitHub Actions → `build-site` → `tag_release` job:

   - Publishes `build/html` to `gh-pages/releases/vX.Y.Z/`
   - Regenerates `gh-pages/releases/index.html`

7. Verify:

   - `https://lex-0.org/releases/vX.Y.Z/` loads
   - Assets resolve (no `github.io` URLs)

Notes:

- Tags must be **annotated**. The workflow rejects lightweight tags.
- Re-using an existing tag (or attempting to publish a release folder that already exists) is blocked by CI.

Note: GitHub Desktop is fine for day-to-day work, but the release tag must be an **annotated git tag**, so you must use a terminal for this.

## Required GitHub settings

These settings enforce a rebase-only workflow on `dev`, while still allowing admin to fast-forward `main` to `dev` from the CLI.

**Repo settings → Secrets and variables → Actions**

- `CITATION_BOT_TOKEN` (fine-grained PAT) is required for the `citation-metadata`
  workflow to open PRs that trigger PR checks.

**Repo settings → Pull Requests**

- Enable: “Allow rebase merging”
- Disable: “Allow merge commits”
- Disable: “Allow squash merging” (rebase-only)
- Enable: “Allow auto-merge” (required for `citation-metadata` PRs)
- Do _not_ set “Always suggest updating pull request branches” (the “Update branch” flow is not compatible with rebase-only workflows)

**Repo settings → Rules → Rulesets**

Use two rulesets, because `dev` and `main` have different constraints.

- **Ruleset for `dev` (PR-only):**
  - Target branches (fnmatch pattern): `dev`
  - Enable: “Require a pull request before merging”
  - Enable: “Require linear history”
  - Enable: “Block force pushes” and “Block deletions”
  - Required status checks: `check_citation` and `pr` (build-site PR job)
- **Ruleset for `main` (FF-only by admin):**
  - Target branches (fnmatch pattern): `main`
  - Enable: “Require linear history”
  - Enable: “Block force pushes” and “Block deletions”
  - Do **not** require pull requests (FF promotion is a direct push)
  - Do **not** require status checks (checks run on `dev` before FF promotion)

**Bypass list**

- Keep the bypass list empty for the `dev` ruleset.
- For `main`, prefer “restrict who can push” over bypass. If you can’t restrict pushes, add only yourself to the bypass list and keep “Block force pushes” enabled.

In a nutshell: never rebase `dev` or `main`. Only rebase your own feature branches, then force-push them with `--force-with-lease` after rebasing.

For deployment architecture details (Vercel, GitHub Pages, release archive), see [`deployment.md`](deployment.md).
