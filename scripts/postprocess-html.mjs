import fs from "node:fs/promises";
import path from "node:path";

const ROOT_DIR = path.resolve("build", "html");
const BASE_URL = "https://lex-0.org";
const VALID_MODES = new Set(["main", "dev", "release"]);
const VALID_SITEMAPS = new Set(["main", "dev", "none"]);

const args = process.argv.slice(2);
const opts = {};
for (const arg of args) {
  if (!arg.startsWith("--")) continue;
  const [key, value = ""] = arg.replace(/^--/, "").split("=");
  opts[key] = value;
}

const mode = opts.mode || "main";
const tag = opts.tag || opts.version || "";
const releaseStatus = opts["release-status"] || "historical";
const sitemapMode =
  opts.sitemap || (mode === "main" ? "main" : mode === "dev" ? "dev" : "none");

if (!VALID_MODES.has(mode)) {
  console.error(`Unknown --mode "${mode}". Use main|dev|release.`);
  process.exit(1);
}
if (!VALID_SITEMAPS.has(sitemapMode)) {
  console.error(`Unknown --sitemap "${sitemapMode}". Use main|dev|none.`);
  process.exit(1);
}


const fileExists = async (p) => {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
};

const walkHtml = async (dir) => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkHtml(full)));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".html")) {
      files.push(full);
    }
  }
  return files;
};

const normalizeUrlPath = (relPath) => {
  const withSlashes = relPath.split(path.sep).join("/");
  if (withSlashes.endsWith("/index.html")) {
    const trimmed = withSlashes.slice(0, -"/index.html".length);
    return trimmed === "" ? "/" : `/${trimmed}`;
  }
  return `/${withSlashes}`;
};

const insertBefore = (html, needleRegex, insert) => {
  const match = html.match(needleRegex);
  if (!match) return html;
  return html.replace(needleRegex, `${insert}${match[0]}`);
};

const insertAfter = (html, needleRegex, insert) => {
  const match = html.match(needleRegex);
  if (!match) return html;
  return html.replace(needleRegex, `${match[0]}${insert}`);
};

const hasCanonical = (html) => /rel=["']canonical["']/i.test(html);
const hasMetaRobots = (html) => /<meta[^>]+name=["']robots["']/i.test(html);

const buildInfoComment = () => {
  const sha = process.env.GITHUB_SHA || "unknown-sha";
  const ref = process.env.GITHUB_REF_NAME || "";
  const now = new Date().toISOString();
  return `<!-- build: mode=${mode} tag=${
    tag || ref
  } sha=${sha} time=${now} -->`;
};

const bannerMarkup = () => {
  if (mode === "dev") {
    return (
      `<div id="env-banner" data-env-banner="dev" style="position:fixed;top:0;left:0;right:0;` +
      `z-index:9999;background:#ed6f59;color:#fff;padding:8px 1.75em;font:600 13px/1.4 system-ui;` +
      `letter-spacing:.5px;text-transform:uppercase;">` +
      `DEV SITE</div>`
    );
  }
  if (mode === "release") {
    const isCurrent = releaseStatus === "current";
    const bg = isCurrent ? "#334155" : "#b91c1c";
    const label = isCurrent ? "Current release" : "Historical release";
    const tagLabel = tag ? ` ${tag}` : "";
    return (
      `<div id="env-banner" data-env-banner="release" style="position:fixed;top:0;left:0;right:0;` +
      `z-index:9999;background:${bg};color:#fff;padding:8px 1.75em;font:600 13px/1.4 system-ui;` +
      `letter-spacing:.3px;">` +
      `${label}${tagLabel}. Latest at <a href="${BASE_URL}" style="color:#fff;text-decoration:underline;">` +
      `lex-0.org</a>.</div>`
    );
  }
  return "";
};

const minifyHtml = (html) => {
  // Conservative minification: skip if pre/code blocks are present.
  if (/<pre\b|<code\b/i.test(html)) {
    return html;
  }
  return html.replace(/>\s+</g, "><").trim();
};

const addCanonicalLink = (html, canonicalUrl) => {
  if (hasCanonical(html)) return html;
  const tag = `<link rel="canonical" href="${canonicalUrl}">`;
  return insertBefore(html, /<\/head>/i, `${tag}\n`);
};

const addMetaRobots = (html, content) => {
  if (hasMetaRobots(html)) return html;
  const tag = `<meta name="robots" content="${content}">`;
  return insertBefore(html, /<\/head>/i, `${tag}\n`);
};

const insertBanner = (html, banner) => {
  if (!banner) return html;
  return insertAfter(html, /<body[^>]*>/i, `${banner}\n`);
};

const addBuildInfo = (html) =>
  insertBefore(html, /<\/head>/i, `${buildInfoComment()}\n`);

const stripDocSearch = (html) => {
  let out = html;
  const message =
    '<div class="docsearch-disabled" role="note" style="' +
    "color:#e2e8f0;font:500 13px/1.4 system-ui;padding:6px 8px;" +
    "margin: 0 2em 0.5em 2em;" +
    "background:rgba(255,255,255,.06);border:1px solid rgba(226,232,240,.18);" +
    'border-radius:6px;">Search is disabled on historical releases.</div>';

  // Remove DocSearch UMD loader.
  out = out.replace(
    /<script\b[^>]*\bsrc=["'][^"']*\/@docsearch\/js@[^"']*\/dist\/umd\/index\.js["'][^>]*>(?:\s*<\/script>)?/gi,
    ""
  );

  // Remove local DocSearch bootstrap.
  out = out.replace(
    /<script\b[^>]*\bsrc=["'][^"']*js\/algo\.js["'][^>]*>(?:\s*<\/script>)?/gi,
    ""
  );

  // Replace the DocSearch mount point with a static message.
  out = out.replace(/<div\b[^>]*\bid=["']docsearch["'][^>]*\s*\/>/gi, message);
  out = out.replace(
    /<div\b[^>]*\bid=["']docsearch["'][^>]*>[\s\S]*?<\/div>/gi,
    message
  );

  return out;
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

const injectBannerStyle = (html) => {
  const style = [
    "<style data-env-banner-style>",
    ".pure-menu-heading{top:33px!important;}",
    "#menu .tei_toc_search{top:84px!important;}",
    ".pure-menu>.toc.toc_body{margin-top:20px!important;}",
    ".teidiv1[id],.teidiv2[id]{scroll-margin-top:50px!important;}",
    "#env-banner a{color:#fff;text-decoration:underline;}",
    ".menu-link {top:33px!important;}",
    "</style>",
  ].join("");
  return insertBefore(html, /<\/head>/i, `${style}\n`);
};

const ensureRobots = async () => {
  const robotsPath = path.join(ROOT_DIR, "robots.txt");
  let content = "";
  if (mode === "main") {
    content = `User-agent: *\nAllow: /\nSitemap: ${BASE_URL}/sitemap.xml\n`;
  } else if (mode === "dev") {
    content =
      "User-agent: Algolia Crawler\nAllow: /\n\nUser-agent: *\nDisallow: /\n";
  } else {
    content = "User-agent: *\nDisallow: /\n";
  }
  await fs.writeFile(robotsPath, content, "utf-8");
};

const writeSitemap = async (urls) => {
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map((u) => `  <url><loc>${u}</loc></url>`),
    "</urlset>",
    "",
  ].join("\n");
  await fs.writeFile(path.join(ROOT_DIR, "sitemap.xml"), xml, "utf-8");
};

const main = async () => {
  if (!(await fileExists(ROOT_DIR))) {
    console.error(`Missing ${ROOT_DIR}. Run the build first.`);
    process.exit(1);
  }

  let sitemapBase = "";
  if (sitemapMode === "main") sitemapBase = "https://lex-0.org";
  if (sitemapMode === "dev") sitemapBase = "https://dev.lex-0.org";

  const files = await walkHtml(ROOT_DIR);
  const urls = [];

  for (const file of files) {
    const rel = path.relative(ROOT_DIR, file);
    const urlPath = normalizeUrlPath(rel);
    const canonicalUrl = `${BASE_URL}${urlPath}`;
    let html = await fs.readFile(file, "utf-8");
    html = stripEnvArtifacts(html);

    if (mode === "dev" || mode === "release") {
      html = addMetaRobots(html, "noindex,nofollow");
      html = injectBannerStyle(html);
      html = insertBanner(html, bannerMarkup());
    }

    if (mode === "release") {
      html = addCanonicalLink(html, canonicalUrl);
    }

    if (mode === "release" && releaseStatus === "historical") {
      html = stripDocSearch(html);
    }

    html = addBuildInfo(html);
    html = minifyHtml(html);

    await fs.writeFile(file, html, "utf-8");
    if (sitemapBase) {
      urls.push(`${sitemapBase}${urlPath}`);
    }
  }

  await ensureRobots();

  if (sitemapBase) {
    const unique = Array.from(new Set(urls)).sort();
    await writeSitemap(unique);
  }
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
