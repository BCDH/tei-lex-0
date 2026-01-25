# Split Algolia Indices

## Problem

Today DocSearch is effectively tied to the production index. This causes two issues:

1. `dev.lex-0.org` searches the production index and search results send users back to `lex-0.org`.
2. Historical releases under `lex-0.org/releases/vX.Y.Z/` are immutable snapshots, but search results will drift over time and point to the wrong version or rather back to `lex-0.org`.

## Goals

- Use separate Algolia indices for `lex-0.org` and `dev.lex-0.org`.
- Make index selection deterministic for:
  - Vercel deployments (main/dev)
  - local builds
- Ensure crawlers use the correct sitemap per environment (main vs dev).
- Disable Algolia search on **historical** releases served from GitHub Pages.
- Keep `main` and `dev` history linear (no CI commits to `main` for releases).

## Policy

- `lex-0.org` (main): search enabled
- `dev.lex-0.org` (dev): search enabled (dev index)
- Releases (`lex-0.org/releases/vX.Y.Z/`):
  - Current release: optional (either enabled using prod index, or disabled)
  - Historical releases: **disabled**

Rationale: releases are for stable references (RNG/schema links), not for dynamic search results.

## Index mapping

- Vercel project `lex-0.org` → Algolia index `lex0-crawler`
- Vercel project `dev.lex-0.org` → Algolia index `lex0-dev-crawler`

This mapping is project-based (both are “Production” in Vercel terms).

## Implementation plan

### 1. Build-time search config

Current behavior:

- Index selection is automatic:
  - `lex-0.org` → `lex0-crawler`
  - `dev.lex-0.org` or local (`file://`, `localhost`) → `lex0-dev-crawler`

### 2. Disable search on historical releases

Already implemented in `scripts/postprocess-html.mjs`. During release publishing, CI already knows whether a tag is the latest (`release-status=current|historical`).

For `mode=release` + `release-status=historical`, the post-processing step removes/disables DocSearch by editing the generated HTML:

- Remove the DocSearch CDN script tag.
- Remove the `js/algo.js` script tag.
- Remove or hide the `#docsearch` container in the sidebar.

This ensures historical releases never make Algolia requests and don’t show a search UI.

### 3. Sitemap strategy (main vs dev)

Algolia Crawler must point to different sitemaps per environment. Update post-processing to optionally emit a sitemap for `dev` with a `dev.lex-0.org` base.

Proposed behavior:

- `main`:
  - Keep current behavior: generate `sitemap.xml` from `build/html` with base `https://lex-0.org`.
  - `robots.txt` includes `Sitemap: https://lex-0.org/sitemap.xml`.
- `dev`:
  - Generate `sitemap.xml` from `build/html` with base `https://dev.lex-0.org`.
  - `robots.txt` remains `Disallow: /` (noindex), but Algolia can still crawl via explicit sitemap URL.
- `release`:
  - No sitemap.

Implementation detail:

- `scripts/postprocess-html.mjs` accepts `--sitemap=main|dev|none`.
- `--mode=main` defaults to `--sitemap=main`; `--mode=dev` defaults to `--sitemap=dev`; `--mode=release` defaults to `--sitemap=none`.
- If `--sitemap=dev`, use `https://dev.lex-0.org` as the sitemap base (canonical URLs still point to `https://lex-0.org/...`).

### 4. Transition option (until `lex-0.org` sitemap is fixed)

Right now `lex-0.org` mirrors `lex0.org`, but the production sitemap still lists `lex0.org` URLs. Until that is fixed, keep the **production crawler** fully on `lex0.org` to avoid the "0 records" safe‑reindexing failure.

Temporary production crawler config (stay on old domain):

- `startUrls`: `https://lex0.org`
- `sitemaps`: `https://lex0.org/sitemap.xml`
- `discoveryPatterns`: `https://lex0.org/**`
- `pathsToMatch`: `https://lex0.org/...`

After the main sitemap is corrected, flip **all** of the above fields to `lex-0.org` in one pass:

- `startUrls`: `https://lex-0.org`
- `sitemaps`: `https://lex-0.org/sitemap.xml`
- `discoveryPatterns`: `https://lex-0.org/**`
- `pathsToMatch`: `https://lex-0.org/...`

### 5. CI wiring

Update workflows so each deployment produces its own sitemap:

- `push_main`:
  - `node scripts/postprocess-html.mjs --mode=main --sitemap=main`
- `push_dev`:
  - ensure post-processing runs in dev flow
  - `node scripts/postprocess-html.mjs --mode=dev --sitemap=dev`

### 6. Crawler configuration

Dev crawler:

- `lex0-dev-crawler`:
  - `https://dev.lex-0.org/sitemap.xml`

Production crawler is covered by the transition section above (stay on `lex0.org` until the sitemap flips).

Ensure both crawlers allow the correct domains and do not follow cross-domain links.

## Verification checklist

- `lex-0.org`: queries `lex0-crawler`
- `dev.lex-0.org`: queries `lex0-dev-crawler`
- Current release (if enabled): queries `lex0-crawler`
- Historical releases: no DocSearch UI and no Algolia requests
- `lex-0.org/sitemap.xml` only contains `https://lex-0.org/...` (after flip)
- `dev.lex-0.org/sitemap.xml` only contains `https://dev.lex-0.org/...`
