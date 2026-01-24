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

Generate a small static config artifact into the build output, e.g. `js/search-config.json`:

- Reads from env vars:
  - `ALGOLIA_APP_ID`
  - `ALGOLIA_SEARCH_API_KEY` (search-only)
  - `ALGOLIA_INDEX_NAME`
- Writes a config file consumed by the frontend.
- Fails the build if required vars are missing (to avoid silently using the wrong index).

Frontend (`js/algo.js`) loads that config and initializes DocSearch from it.

### 2. Disable search on historical releases

During release publishing, CI already knows whether a tag is the latest (`release-status=current|historical`).

For `mode=release` + `release-status=historical`, the release post-processing step should remove/disable DocSearch by editing the generated HTML:

- Remove the DocSearch CDN script tag.
- Remove the `js/algo.js` script tag.
- Remove or hide the `#docsearch` container in the sidebar.

This ensures historical releases never make Algolia requests and don’t show a search UI.

### 3. Vercel per-project env

Set per project:

- `lex-0.org`:
  - `ALGOLIA_INDEX_NAME=lex0-crawler`
- `dev.lex-0.org`:
  - `ALGOLIA_INDEX_NAME=lex0-dev-crawler`

Shared values (same on both projects):

- `ALGOLIA_APP_ID`
- `ALGOLIA_SEARCH_API_KEY`

### 4. Guardrails

- Restrict the search API key to the expected indices.
- Optionally restrict by allowed domains/referrers for `lex-0.org` and `dev.lex-0.org`.

## Verification checklist

- `lex-0.org`: queries `lex0-crawler`
- `dev.lex-0.org`: queries `lex0-dev-crawler`
- Current release (if enabled): queries `lex0-crawler`
- Historical releases: no DocSearch UI and no Algolia requests
