import fs from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);
const opts = {};
for (const arg of args) {
  if (!arg.startsWith("--")) continue;
  const [key, value = ""] = arg.replace(/^--/, "").split("=");
  opts[key] = value;
}

const releasesDir = path.resolve(opts.dir || "releases");
const currentTag = opts.current || process.env.RELEASE_TAG || "";

if (!currentTag) {
  console.error("Missing current release tag. Use --current=vX.Y.Z or RELEASE_TAG.");
  process.exit(1);
}

const tagPattern = /^v\d+\.\d+\.\d+$/;
if (!tagPattern.test(currentTag)) {
  console.error(`Invalid current tag: ${currentTag}`);
  process.exit(1);
}

const walkHtml = async (dir) => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const out = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walkHtml(full)));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".html")) {
      out.push(full);
    }
  }
  return out;
};

const insertBefore = (html, needleRegex, insert) => {
  if (!needleRegex.test(html)) return html;
  return html.replace(needleRegex, `${insert}$&`);
};

const insertAfter = (html, needleRegex, insert) => {
  if (!needleRegex.test(html)) return html;
  return html.replace(needleRegex, `$&${insert}`);
};

const stripEnvArtifacts = (html) => {
  let out = html;
  out = out.replace(
    /<style[^>]*data-env-banner-style[^>]*>[\s\S]*?<\/style>/gi,
    ""
  );
  out = out.replace(
    /<div[^>]*data-env-banner=["'][^"']+["'][^>]*>[\s\S]*?<\/div>/gi,
    ""
  );
  out = out.replace(/<!--\s*build:.*?-->\s*/gi, "");
  return out;
};

const bannerStyle = () =>
  [
    "<style data-env-banner-style>",
    ".pure-menu-heading{top:33px!important;}",
    "#menu .tei_toc_search{top:84px!important;}",
    ".pure-menu>.toc.toc_body{margin-top:20px!important;}",
    ".teidiv1[id],.teidiv2[id]{scroll-margin-top:50px!important;}",
    "#env-banner a{color:#fff;text-decoration:underline;}",
    ".menu-link {top:33px!important;}",
    "</style>",
  ].join("");

const bannerMarkup = ({ tag, current }) => {
  const bg = current ? "#334155" : "#b91c1c";
  const label = current ? "Current release" : "Historical release";
  return (
    `<div id="env-banner" data-env-banner="release" style="position:fixed;top:0;left:0;right:0;` +
    `z-index:9999;background:${bg};color:#fff;padding:8px 1.75em;font:600 13px/1.4 system-ui;` +
    `letter-spacing:.3px;">` +
    `${label} ${tag}. Latest at <a href="https://lex-0.org" style="color:#fff;text-decoration:underline;">` +
    `lex-0.org</a>.</div>`
  );
};

const updateFile = async (filePath, tag, current) => {
  const raw = await fs.readFile(filePath, "utf8");
  let html = stripEnvArtifacts(raw);
  html = insertBefore(html, /<\/head>/i, `${bannerStyle()}\n`);
  html = insertAfter(html, /<body[^>]*>/i, `${bannerMarkup({ tag, current })}\n`);

  if (html !== raw) {
    await fs.writeFile(filePath, html, "utf8");
    return true;
  }
  return false;
};

const run = async () => {
  const entries = await fs.readdir(releasesDir, { withFileTypes: true });
  const tags = entries
    .filter((d) => d.isDirectory() && tagPattern.test(d.name))
    .map((d) => d.name);

  if (!tags.length) {
    console.log("No release directories found.");
    return;
  }

  let changed = 0;
  for (const tag of tags) {
    const dir = path.join(releasesDir, tag);
    const files = await walkHtml(dir);
    const isCurrent = tag === currentTag;
    for (const filePath of files) {
      if (await updateFile(filePath, tag, isCurrent)) changed += 1;
    }
  }

  console.log(`Updated ${changed} HTML files across ${tags.length} release directories.`);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
