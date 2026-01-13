# Deployment

This document describes how TEI Lex-0 is deployed across Vercel and GitHub Pages, how releases are published, and the constraints that keep the release archive stable and reproducible.

## Architecture overview

- `lex0.org` serves the current release from Vercel (main line).
- `dev.lex0.org` serves the dev line from Vercel.
- `lex0.org/releases/vX.Y.Z/` serves archived releases from GitHub Pages via a Vercel rewrite.
- Release content is immutable and produced only from annotated tags on `main`.

## Domains and routing

- Production domain: `lex0.org` -> Vercel project for `main`.
- Dev domain: `dev.lex0.org` -> Vercel project for `dev`.
- Release archive: `lex0.org/releases/:path*` -> GitHub Pages via Vercel rewrite.

Vercel rewrite (main project):

```sh
/releases/:path* -> https://<user>.github.io/<repo>/releases/:path*
```

Note: keep this as a rewrite, not a redirect, so the URL remains `lex0.org/releases/...`.

## Vercel projects

Two Vercel projects are expected:

- Main project: production branch `vercel-main` -> `lex0.org`.
- Dev project: production branch `vercel-dev` -> `dev.lex0.org`.

These branches are artifact-only deployments that contain only the built site.

## GitHub Pages release archive

- GitHub Pages is served from `gh-pages`.
- Releases are published into `gh-pages/releases/vX.Y.Z/`.
- The release archive must be immutable. If a tag already exists, the publish should fail.
- A release is produced only from an **annotated tag** on `main` named `vX.Y.Z`.

## Build output requirements

- HTML output must use relative links for assets and internal navigation.
- Absolute links to `github.io` or to `/` will bypass rewrites and break releases.
- The CI link hygiene check enforces relative links; do not "fix" links in post-processing.

## CI workflows

All deployments are handled in GitHub Actions. High-level triggers:

- Pull requests targeting `dev`: build only; no post-processing; no publish.
- Pushes to `main` and `dev`: build + post-process, then publish to Vercel artifact branches.
- **Annotated tags** on `main` (e.g., `vX.Y.Z`): build + post-process, then publish to GitHub Pages.

Common job steps:

- `npm ci` with caching.
- Download/cache Calabash + Saxon; set `XMLCALABASH_JAR` and `SAXON_JAR`.
- Run ODD -> HTML pipeline and asset build.
- Fail if `build/html` is missing or empty.
- Run link hygiene checks on PRs and pushes (skip on tags).
- TODO: schema generation (RNG + XSD)

### Post-processing

Post-processing is CI-only and operates on `build/html` via `scripts/postprocess-html.mjs`:

- Inject dev/release banners.
- Add `<meta name="robots">` as appropriate.
- Minify HTML.
- Inject a build info comment (commit/tag) for debugging.
- Generate `robots.txt` (mode-dependent).
- Generate `sitemap.xml` for main only from `build/html` file list with `https://lex0.org/` as the base.
- Reference the sitemap in main `robots.txt`.
- Add canonical URLs for dev/release builds if missing; keep the page path and point to `https://lex0.org/...`.

Modes:

- `main`: public; sitemap + indexable.
- `dev`: noindex; `robots.txt` disallows all; no sitemap.
- `release`: noindex; `robots.txt` disallows all; no sitemap.

### Publishing targets

- `main` build -> `vercel-main` (repo root).
- `dev` build -> `vercel-dev` (repo root).
- Tag build -> `gh-pages/releases/<tag>/`.

Publishing rules:

- Clean destination branches before copying to avoid stale files.
- Append commits when publishing to `vercel-main` and `vercel-dev`.
- For tags, fail if the release folder already exists.
- `releases/index.html` is generated in the tag workflow on `gh-pages`.
- `RELEASES.md` in `main` is updated only after a successful tag publish.

## Release banner behavior

Release builds display a top-of-page banner on every HTML page:

- Latest release: "Current release vX.Y.Z" with link to `lex0.org`.
- Older releases: "Historical release" with link to `lex0.org`.
- Style is neutral for latest, warning-tinted for older releases.

All release builds are noindexed via `<meta name="robots">` and `robots.txt`.

## Link hygiene

The CI check enforces that internal links are relative. The check should fail on:

- Absolute internal links like `https://lex0.org/...` in normal page content.
- Absolute internal links like `/css/...` or `/images/...`.

The check should allow external domains and metadata/canonical URLs.

## Operational checklist

Use this to validate a deployment:

- `lex0.org` serves latest `main` build via Vercel.
- `dev.lex0.org` serves latest `dev` build via Vercel.
- `lex0.org/releases/vX.Y.Z/` loads via Vercel rewrite with no redirect.
- Assets for releases resolve correctly and stay on `lex0.org`.
- Dev and release builds are noindexed.

## Troubleshooting

- Missing assets in releases: check for absolute paths in `build/html`.
- Release content not updating: verify tag workflow ran and `gh-pages` publish succeeded.
- `dev.lex0.org` indexed: confirm `robots.txt` and `<meta name="robots">` in dev output.
- Release pages redirect to `github.io`: check Vercel rewrite and ensure relative links.

For practical, step-by-step instructions on publishing dev/prod and release builds, see [`git-workflow.md`](git-workflow.md).
