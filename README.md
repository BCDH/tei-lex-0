# TEI Lex-0

Repository for the new TEI Lex-0 Schema and Guidelines (test version).

## Getting the code

Clone the repository and enter the working directory:

```sh
git clone https://github.com/daliboris/tei-lex-0.git
cd tei-lex-0
```

## Using in oXygen

Open `lex-0.xpr` as the project. The main ODD is `tei/lex-0.odd`, with supporting includes and examples in the same folder. 

Use our project-specific oXygen transformation scenarios:

- `Lex-0: Generate Relax NG Schema`
- `Lex-0: Generate guidelines`

to produce schema and documentation outputs as needed. You can run these transformations regardless of where you are in the project or what your currently open file is. (If you want to create toolbar buttons for an even easier access to your transformations, check out the [OxyRuns](https://github.com/BCDH/oxyruns) plugin.)

**Note:** The assets build step (copying minified CSS/JS files to `/build`) is handled via `npm`. From the root of this repo, do:

```sh
npm install
npm run build
```

