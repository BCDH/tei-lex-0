# Generating `CITATION.cff` from the TEI Header

This document explains how `CITATION.cff` is generated from the TEI header in
`odd/lex-0.odd`, how it is kept up to date, and how CI injects release metadata.

## Overview

- Source of truth: `odd/lex-0.odd` (`teiHeader`)
- Generator: `xslt/teiheader-to-cff.xsl`
- Citation-only pipeline: `xproc/citation-cff.xpl`
- Local command: `npm run citation:cff`
- CI metadata injection: `scripts/update-citation-metadata.mjs`

CI generates a clean `CITATION.cff` (without `commit`, `date-generated`, and
`date-released`) and then injects metadata in CI.

## Local Usage

Generate (or refresh) `CITATION.cff` locally (this is separate from `npm run build`):

```
npm run citation:cff
```

This runs the citation-only XProc pipeline and overwrites the repository root
`CITATION.cff`.

## CI Metadata Injection

CI injects the following fields after the file is generated:

- `commit`: full SHA (`git rev-parse HEAD`)
- `date-generated`: UTC date (`date -u +%F`)
- `date-released`: UTC date (`date -u +%F`) for release commits only

The injector updates or inserts the fields without altering other content. This
keeps local builds deterministic while ensuring published branches carry the
exact provenance metadata.

### Secrets and permissions

The `citation-metadata` workflow must create a PR that triggers PR checks. To
avoid the GitHub Actions token suppression on `pull_request` workflows, it uses
a fine-grained PAT stored as a repo secret:

- **Secret name:** `CITATION_BOT_TOKEN`
- **Resource owner:** `BCDH`
- **Repository access:** only `BCDH/tei-lex-0`
- **Permissions:** Contents (read/write), Pull requests (read/write), Actions (read/write)

If the secret is missing, the workflow fails fast with a clear error.

## CI Workflows

- `citation-metadata` (push to `dev`/`main`)
  - Runs the citation-only pipeline (`xproc/citation-cff.xpl`)
  - Injects `commit` + `date-generated`
  - Opens/updates a PR and enables auto-merge (no direct pushes)
  - Uses branch `ci/citation-metadata/<base>` and label `automation`
- `site-build` (push to `dev`/`main` and tags)
  - Skips deploy on metadata-only bot commits
- `release-helper` (manual, owner-only)
  - Fast-forwards `main` to `dev`
  - Regenerates `CITATION.cff`
  - Injects `commit` + `date-generated` + `date-released` and commits
  - Creates the annotated tag

## Release Notes

- Tag builds are immutable. The tag must point to a commit that already
  contains the injected metadata.
- The release helper workflow enforces this order and creates the annotated
  tag only after metadata is committed.
