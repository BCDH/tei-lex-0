import fs from "node:fs/promises";
import path from "node:path";

const ROOT_DIR = path.resolve("build", "html");

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

const stripAllowedMeta = (html) => {
  let out = html;
  out = out.replace(/<link[^>]*rel=["']canonical["'][^>]*>/gi, "");
  out = out.replace(/<meta[^>]*>/gi, "");
  return out;
};

const stripCodeBlocks = (html) => {
  // Ignore code examples; they may intentionally contain absolute URLs (e.g. schema references)
  // or strings that look like HTML attributes (href/src) but are just example text.
  return html.replace(/<pre\b[^>]*>[\s\S]*?<\/pre>/gi, "");
};

const findViolations = (html) => {
  const matches = [];
  const regex =
    /(href|src)=["'](https?:\/\/lex0\.org\/[^"']*|\/[^"']*)["']/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    matches.push(match[0]);
  }
  return matches;
};

const main = async () => {
  try {
    await fs.access(ROOT_DIR);
  } catch {
    console.error(`Missing ${ROOT_DIR}. Run the build first.`);
    process.exit(1);
  }

  const files = await walkHtml(ROOT_DIR);
  const violations = [];

  for (const file of files) {
    const raw = await fs.readFile(file, "utf-8");
    const cleaned = stripAllowedMeta(raw);
    const matches = findViolations(stripCodeBlocks(cleaned));
    if (matches.length) {
      violations.push({ file, matches });
    }
  }

  if (violations.length === 0) {
    console.log("Link hygiene OK: no absolute internal links found.");
    return;
  }

  console.error("Link hygiene failed. Absolute internal links found:");
  for (const { file, matches } of violations) {
    console.error(`- ${path.relative(process.cwd(), file)}`);
    for (const match of matches) {
      console.error(`  ${match}`);
    }
  }
  process.exit(1);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
