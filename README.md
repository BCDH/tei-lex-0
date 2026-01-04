# TEI Lex-0

Repository for the new TEI Lex-0 Schema and Guidelines (test version).

## Getting the code

Clone the repository and enter the working directory:

```sh
git clone https://github.com/ttasovac/tei-lex-0.git
cd tei-lex-0
```

## Source files

- Master ODD lives at `odd/lex-0.odd`, with supporting includes and examples under `odd/includes` and `odd/examples`.
- The XProc script is in `xproc/lex-0.xpl`.
- The stylesheets under `xslt/` are used to generate derived schema and documentation.

## Outputs

All generated artifacts land in `build/` (.gitignored by choice):

- Schemas: `build/rng/` and `build/xsd/`
- HTML docs: `build/html`
- Expanded ODD and intermediates: `build/odd/`

TODO: Add a XSD transformation + compiled ODD from lex-0.xpl.

The HTML documentation expects minified CSS/JS from `assets/`, produced by the npm build step (see below).

## Build in oXygen

1. Open `lex-0.xpr` as the project.
2. Run the transformation scenarios:
   - `Lex-0: Generate Relax NG Schema`
   - `Lex-0: Generate guidelines`
3. Install Node dependencies after cloning the repo for the first time with `npm install` in the root folder.
4. Build assets so HTML output has its CSS/JS by running `npm run build` in the cloned repo root folder.

![](.github/images/transformation-scenarios.png)

You can run these transformations regardless of your currently open file. If you want toolbar buttons for even faster access, see the [OxyRuns](https://github.com/BCDH/oxyruns) plugin.
