import { build } from "esbuild";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import fs from "node:fs/promises";

const ASSETS_DIR = "assets";
const OUT_JS_DIR = path.join("build", "html", "js");
const OUT_CSS_DIR = path.join("build", "html", "css");

// Recursively collect files with a given extension
async function collectFiles(dir, exts) {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      out.push(...(await collectFiles(full, exts)));
    } else if (e.isFile()) {
      const ext = path.extname(e.name).toLowerCase();
      if (exts.includes(ext)) out.push(full);
    }
  }
  return out;
}

// Keep the directory structure under assets/ when writing to build/html/{js,css}/
function outbaseAwareOutfile(infile, outRoot) {
  const rel = path.relative(ASSETS_DIR, infile); // e.g. js/foo/bar.js
  return path.join(outRoot, rel);
}

async function main() {
  const jsFiles = await collectFiles(ASSETS_DIR, [".js"]);
  const cssFiles = await collectFiles(ASSETS_DIR, [".css"]);

  await mkdir(OUT_JS_DIR, { recursive: true });
  await mkdir(OUT_CSS_DIR, { recursive: true });

  // JS: minify each file separately (no bundling)
  await Promise.all(
    jsFiles.map((infile) =>
      build({
        entryPoints: [infile],
        bundle: false,
        minify: true,
        sourcemap: true,
        format: "iife", // safe-ish default for standalone scripts
        target: ["es2019"],
        outfile: outbaseAwareOutfile(infile, path.join("build", "html")),
      })
    )
  );

  // CSS: minify each file separately (no bundling)
  await Promise.all(
    cssFiles.map((infile) =>
      build({
        entryPoints: [infile],
        bundle: false,
        minify: true,
        sourcemap: true,
        outfile: outbaseAwareOutfile(infile, path.join("build", "html")),
      })
    )
  );

  console.log(
    `Minified ${jsFiles.length} JS and ${cssFiles.length} CSS files.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
