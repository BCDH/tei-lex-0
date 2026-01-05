# Epic: Release Hosting Strategy (Vercel + GitHub Pages)

## Background

- Current site served from Vercel on `lex0.org`.
- Need stable, versioned historical releases without overloading Vercel’s build/bandwidth limits.
- GitHub Pages is a good fit for immutable, static archives.

## Objectives

- `lex0.org` serves the current release (main branch) via Vercel.
- `dev.lex0.org` serves the dev branch via Vercel.
- `lex0.org/releases/vX.Y.Z/` serves archived release builds from GitHub Pages.
- Users experience a seamless URL (no redirects), with content proxied via Vercel rewrites.

## Key Principles

- Relative links are mandatory in HTML output so assets and internal links resolve correctly when served from `/releases/vX.Y.Z/` and proxied through Vercel. Absolute links to `github.io` or `/` will break or bypass the rewrite.
- Release content is immutable; builds are reproducible and stored by tag.

## Scope

- Vercel projects:
  - Project A: `main` -> `lex0.org`
  - Project B: `dev` -> `dev.lex0.org`
- GitHub Pages:
  - `gh-pages` branch hosts `releases/vX.Y.Z/`
- Vercel rewrite for release paths:
  - `/releases/:path*` -> `https://<user>.github.io/<repo>/releases/:path*`

## Deliverables

- `vercel.json` with release rewrite rule.
- GitHub Actions workflow:
  - Builds HTML for tags/releases.
  - Publishes `build/html` to `gh-pages/releases/vX.Y.Z/`.
- Documentation updates:
  - README section on release hosting.
  - Explicit note on relative link requirement and how to validate it.
  - `RELEASES.md` with a canonical list of release URLs (in addition to `releases/index.html`).
- npm script for manual HTML post-processing (e.g., `postprocess:html`).

## Acceptance Criteria

- `lex0.org` serves latest `main` output from Vercel.
- `dev.lex0.org` serves `dev` output from Vercel.
- `lex0.org/releases/vX.Y.Z/` loads from GitHub Pages via Vercel rewrite with no redirect.
- All assets under a release resolve correctly (no `github.io` leaks).
- Link validation confirms no absolute URLs that would break the rewrite.

## Workflow Summary

- PRs targeting `dev`: build only; no post-processing; no publishing.
- Pushes to `main` and `dev`: build + post-process, then publish to `vercel-main`/`vercel-dev`.
- Annotated tags on `main`: fresh build + post-process, publish to `gh-pages/releases/<tag>`, update release index and `RELEASES.md`.

## Implementation Plan

- GitHub Actions
  - Use concurrency to cancel in-progress runs on new pushes to the same branch.
  - Use separate jobs per trigger (PR, push to `main`, push to `dev`, tag).
  - Use `GITHUB_TOKEN` with `contents: write` for same-repo publishing; cross-repo publishing (e.g., future schema sync to the old repo) will require a dedicated token or app.
  - Use full Git checkout (`fetch-depth: 0`) to ensure tags/history are available.
  - Run workflows on Ubuntu runners.
  - Runtime/tooling:
    - Use Java 17 for Calabash.
    - Use Node.js 22.
    - Pin Calabash to version 3.0.35 (updateable later).
    - Pin Saxon HE to version 12.4 (updateable later).
    - Verify Calabash/Saxon downloads with checksums.
  - Post-process generated HTML via `scripts/postprocess-html.mjs` (CI-only; can be run manually for local testing) with a mode flag (`--mode=main|dev|release`) and release identifier (`--tag`/`--version`) for banners, assuming `build/html` as the input/output directory.
    - Inject dev/release banners and `<meta name="robots">`.
    - Minify HTML.
    - Inject a build info comment (commit/tag) for debugging.
    - Generate `robots.txt` (main/dev/release behavior as specified).
    - Generate `sitemap.xml` for main only from the `build/html` file list with `https://lex0.org/` as the base, including only HTML files and normalizing `index.html` to `/`.
    - Reference the sitemap in the main `robots.txt`.
    - Add canonical URLs for dev/release builds, preserving the page path but pointing to `https://lex0.org/...` (no `/releases/...`), and only if a canonical link is not already present.
    - Dev `robots.txt` disallows all and omits sitemap.
  - Run post-processing before publishing artifacts.
  - Keep `releases/index.html` generation in the tag workflow (it operates on `gh-pages`, not `build/html`).
  - Common job steps (push/PR/tag jobs):
    - Install Node dependencies with `npm ci` (cache npm).
    - Download and cache Calabash/Saxon, set `XMLCALABASH_JAR` and `SAXON_JAR`.
    - Run ODD -> HTML pipeline and asset build.
    - Fail if `build/html` is missing or empty.
    - Run link hygiene checks on PRs and pushes (skip on tags).
  - On pull requests targeting `dev`:
    - Run common job steps.
    - Skip post-processing to keep PR checks light.
    - Do not publish artifacts.
  - On pushes to `main` and `dev`:
    - Run common job steps.
    - Run post-processing before publishing.
    - Publish builds from `main` to `vercel-main` and builds from `dev` to `vercel-dev` (no cross-publishing).
    - Publish artifact-only branches (deploy just the built site, not the full repo).
    - Place the built site at the repo root in `vercel-main` and `vercel-dev`.
    - Append commits when publishing to `vercel-main` and `vercel-dev`.
    - Clean destination branches before copying to avoid stale files.
    - Note: This can be switched to manual triggers later (GitHub Actions `workflow_dispatch`).
  - Link hygiene (as part of CI on pushes/PRs, not tags):
    - Ensure build output uses relative references (e.g. `images/...`, `css/...`).
    - Add a CI check that fails if any absolute internal links are detected (including `https://lex0.org/...`), while allowing external domains and metadata/canonical URLs.
    - Rely on this check rather than rewriting absolute links in post-processing.
  - On annotated tag creation on `main` (e.g. `v*`), publish under the exact tag name (fresh build):
    - Run common job steps.
    - Run post-processing before publishing.
    - Publish `build/html` to `gh-pages/releases/vX.Y.Z/` via direct `gh-pages` push (append commits).
    - Fail if the target release folder already exists.
    - Generate or update `gh-pages/releases/index.html` with a simple folder list of all releases.
    - Update `RELEASES.md` in `main` with the new release URL only after a successful publish (direct commit to `main`).
- Vercel
  - Configure two projects (main/dev) with production branches set to `vercel-main` and `vercel-dev`.
  - Add rewrite rule to main project.
  - Add noindex/robots protection for `dev.lex0.org` via CI post-processing (not Vercel settings).
  - Inject a visible top-of-page DEV banner in the dev build output (CI-only).

## Release Banner Behavior

- All releases get a top-of-page banner (CI-only):
  - Latest release: label as current release (e.g. "Current release vX.Y.Z") and link to `lex0.org`.
  - Older releases: label as historical and link to `lex0.org` for the latest version.
  - Inject the banner on all HTML pages in the release build.
  - Style: neutral banner for the latest release; warning-colored banner for historical releases.
  - Add noindexing to all release builds via `robots.txt` and `<meta name="robots">`.
  - Release `robots.txt` should disallow all (`Disallow: /`) and omit any sitemap.

## Risks and Mitigations

- Broken assets due to absolute paths -> enforce relative links and add CI checks.
- Release site drift -> publish from tags only; treat release output as immutable.
- Vercel caching issues -> keep release content static; no cache busting needed.
- Broken internal links -> out of scope for now; consider adding a link checker later if needed.

## Open Questions

- None.
