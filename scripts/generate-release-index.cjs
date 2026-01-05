const fs = require("fs");
const path = require("path");

const releasesDir = path.join(process.cwd(), "releases");
const entries = fs
  .readdirSync(releasesDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

const items = entries
  .map((name) => `<li><a href="${name}/">${name}</a></li>`)
  .join("");
const html = [
  "<!doctype html>",
  '<html><head><meta charset="utf-8"><title>Releases</title></head>',
  "<body><h1>Releases</h1><ul>",
  items,
  "</ul></body></html>",
  "",
].join("");

fs.writeFileSync(path.join(releasesDir, "index.html"), html, "utf-8");
