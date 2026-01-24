# TEI Lex-0

Official repository for [TEI Lex-0](https://lex-0.org). It contains the Lex-0 ODD and build pipeline used to generate the schema and guidelines.

## Development

### Quickstart

```sh
git clone https://github.com/BCDH/tei-lex-0.git
cd tei-lex-0
npm ci
XMLCALABASH_CMD=xmlcalabash npm run build
```

Open `build/html/index.html` to view the generated documentation.

### Project layout

- Master ODD: `odd/lex-0.odd` (includes and examples under `odd/includes/` and `odd/examples/`).
- XProc pipeline: `xproc/lex-0.xpl`.
- XSLT stylesheets: `xslt/` (used by the pipeline to generate schema and documentation).
- Generated outputs: `build/` (gitignored).
  - HTML docs: `build/html/` (entry point: `build/html/index.html`)
  - Schemas: `build/html/schema/`
    - `lex-0.rng`
    - `lex-0.rnc`
    - `lex-0.xsd`

### Build

#### Requirements

- Node.js (for asset build scripts).
- XML Calabash (XProc 3.0) to run `xproc/lex-0.xpl`.

#### Calabash detection order

`npm run assets:odd` runs `scripts/run-xproc.mjs` and looks for Calabash in this order:

1. `XMLCALABASH_CMD` (shell command string).
2. `xmlcalabash` on `PATH`.
3. `calabash` on `PATH`.
4. `XMLCALABASH_JAR` or `CALABASH_JAR` (full path to the Calabash jar).

#### Environment variables

Set one of these before running `npm run assets:odd` (or `npm run build`):

- `XMLCALABASH_CMD`: a command string to run XML Calabash on your system
- `XMLCALABASH_JAR` / `CALABASH_JAR`: full path to the Calabash jar file.

You can set the variable just for a single invocation by prefixing the `npm` command (this is one command, not two):

```sh
XMLCALABASH_CMD=xmlcalabash npm run assets:odd
```

or

```sh
XMLCALABASH_JAR=/path/to/xmlcalabash-app-3.0.35.jar npm run assets:odd
```

#### Common commands

- Install dependencies: `npm ci` (or `npm install`)
- Generate guidelines + schema (ODD → HTML + RNG): `npm run assets:odd`
- Full local build (recommended): `npm run build`
  - Runs `assets:odd`
  - Minifies CSS/JS into `build/html/css/` and `build/html/js/`
  - Copies images into `build/html/images/` (referenced in the ODD and examples as `images/...`)
- Link hygiene for `build/html`: `npm run links:check`
- Post-process HTML (banners/robots/minify): `npm run postprocess:html -- --mode=dev` (or `--mode=main`)

#### Watch mode

For iterative work, run the watchers in separate terminals:

- `npm run assets:watch` watches `assets/`, `odd/`, and `xslt/` and automatically re-runs the relevant build tasks:
  - CSS/JS changes → `assets:minify`
  - Image changes → `assets:images`
  - ODD/XSLT changes → `assets:odd`
  - Outputs to `build/html/` (and `build/html/schema/`)
- `npm run postprocess:watch` watches `scripts/postprocess-html.mjs` and re-runs `postprocess:html` in `--mode=dev` when the postprocess script changes (useful when iterating on the postprocessor itself).

Stop either watcher with Ctrl+C.

### Build in oXygen

Alternatively, you can build from inside oXygen XML Editor.

1. Open the `lex-0.xpr` project.
2. Run the transformation scenarios:
   - `Lex-0: Generate Relax NG Schema`
   - `Lex-0: Generate guidelines`
3. Install Node dependencies after cloning the repo for the first time with `npm ci` in the root folder.
4. Build assets so HTML output has its CSS/JS by running `npm run assets:minify` in the cloned repo root folder.

![](.github/images/transformation-scenarios.png)

You can run these transformations regardless of your currently open file. If you want toolbar buttons for even faster access to global transformations, see the [OxyRuns](https://github.com/BCDH/oxyruns) plugin.

## Operations

- Releases and day-to-day branch workflow: [`docs/git-workflow.md`](docs/git-workflow.md)
- Deployment architecture (Vercel + GitHub Pages release archive): [`docs/deployment.md`](docs/deployment.md)

## Maintainers

TEI Lex-0 is maintained by the DARIAH Working Group on Lexical Resources.

<img src="assets/images/dariah-lr-blue.png" alt="DARIAH Working Group on Lexical Resources" width="200" style="display:block; margin:auto">
