# AGENTS

Project: Build Pipeline for TEI Lex-0 Guidelines.

## Quickstart

- Install deps: `npm ci`
- Build docs + schema: `XMLCALABASH_CMD=xmlcalabash npm run build`
- Open output: `build/html/index.html`

## Required tools

- Node.js (asset build scripts)
- XML Calabash (XProc 3.0)
  - Detection order used by `scripts/run-xproc.mjs`:
    1. `XMLCALABASH_CMD` (shell command string)
    2. `xmlcalabash` on `PATH`
    3. `calabash` on `PATH`
    4. `XMLCALABASH_JAR` or `CALABASH_JAR` (full path to jar)

## Key paths

- ODD source: `odd/lex-0.odd`
- ODD includes/examples: `odd/includes/`, `odd/examples/`
- XProc pipeline: `xproc/lex-0.xpl`
- XSLT stylesheets: `xslt/`
- Generated output (gitignored): `build/`
  - HTML docs: `build/html/`
  - Schemas: `build/html/schema/`

## Common scripts

- `npm run assets:odd` generate schema + HTML via XProc
- `npm run assets:minify` minify CSS/JS into `build/html/css/` and `build/html/js/`
- `npm run assets:images` copy images into `build/html/images/`
- `npm run build` full local build (odd + minify + images)
- `npm run links:check` internal link hygiene for `build/html`
- `npm run postprocess:html -- --mode=dev` postprocess HTML for dev

## Watch mode

Run in separate terminals when iterating:

- `npm run assets:watch` watches `assets/`, `odd/`, `xslt/`
- `npm run postprocess:watch` watches `scripts/postprocess-html.mjs`

## Notes for edits

- If you change ODD/XSLT, re-run `assets:odd` or `build`.
- If you change assets (CSS/JS/images), re-run `assets:minify` or `assets:images`.
- Outputs are static files under `build/html/` and are not committed.

## Git workflow (summary)

- Branch from `dev`, always target `dev` in PRs; rebase-only merges to keep `dev` linear.
- Release to prod by fast-forwarding `main` to `dev` via CLI (`git merge --ff-only origin/dev`).
- Publish releases from **annotated** tags on `main` (`vX.Y.Z`); tag publish generates `gh-pages/releases/vX.Y.Z/`.
- Never rebase `dev` or `main`; only rebase feature branches and force-push with `--force-with-lease`.

## Deployment overview

- `lex-0.org` serves `main` (Vercel project on `vercel-main`).
- `dev.lex-0.org` serves `dev` (Vercel project on `vercel-dev`).
- `lex-0.org/releases/vX.Y.Z/` serves GitHub Pages releases via Vercel rewrite.
- Release builds are immutable and require annotated tags; if a tag exists, publish fails.
- HTML output must use relative links (no absolute `/` or `github.io`) or releases will break.
