const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

function getReleaseTags() {
  const fromEnv = process.env.RELEASE_TAGS;
  if (fromEnv && fromEnv.trim()) {
    return fromEnv
      .split(/\r?\n/g)
      .map((t) => t.trim())
      .filter(Boolean);
  }

  try {
    const out = execFileSync(
      "git",
      ["tag", "--list", "v*", "--sort=-version:refname"],
      { encoding: "utf-8" },
    );
    return out
      .split(/\r?\n/g)
      .map((t) => t.trim())
      .filter(Boolean);
  } catch {
    return null;
  }
}

const releasesDir = path.join(process.cwd(), "releases");
const tags = getReleaseTags();
const entries =
  tags && tags.length > 0
    ? tags
    :
  fs
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
