import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const args = new Set(process.argv.slice(2));

if (args.has("--help")) {
  console.log("Usage: node scripts/release-archives.mjs [--create] [--validate]");
  process.exit(0);
}

const shouldCreate = args.size === 0 || args.has("--all") || args.has("--create");
const shouldValidate = args.size === 0 || args.has("--all") || args.has("--validate");

if (!shouldCreate && !shouldValidate) {
  console.error("Nothing to do. Use --create, --validate, or --all.");
  process.exit(1);
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const buildHtmlDir = path.join(repoRoot, "build", "html");
const schemaDir = path.join(buildHtmlDir, "schema");

const archives = [
  {
    label: "guidelines+schemas",
    sourceDir: buildHtmlDir,
    zipPath: path.join(repoRoot, "guidelines+schemas.zip"),
    tarPath: path.join(repoRoot, "guidelines+schemas.tar.gz"),
  },
  {
    label: "schemas",
    sourceDir: schemaDir,
    zipPath: path.join(repoRoot, "schemas.zip"),
    tarPath: path.join(repoRoot, "schemas.tar.gz"),
  },
];

function run(cmd, cmdArgs, options = {}) {
  const result = spawnSync(cmd, cmdArgs, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  });
  if (result.status !== 0) {
    const stderr = (result.stderr || "").trim();
    throw new Error(`Command failed: ${cmd} ${cmdArgs.join(" ")}${stderr ? `\n${stderr}` : ""}`);
  }
  return result.stdout || "";
}

function assertDir(dir, label) {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    throw new Error(`${label} not found: ${dir}`);
  }
}

function walkFiles(rootDir) {
  const entries = [];

  function visit(currentDir) {
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const absolute = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        visit(absolute);
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }
      entries.push(path.relative(rootDir, absolute).split(path.sep).join("/"));
    }
  }

  visit(rootDir);
  return entries.sort();
}

function normalizeArchiveEntries(raw) {
  return raw
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => entry.replace(/^\.\//, ""))
    .filter((entry) => entry !== "" && entry !== "." && entry !== "./" && !entry.endsWith("/"))
    .sort();
}

function diffEntries(expected, actual) {
  const expectedSet = new Set(expected);
  const actualSet = new Set(actual);

  const missing = expected.filter((entry) => !actualSet.has(entry));
  const extra = actual.filter((entry) => !expectedSet.has(entry));

  return { missing, extra };
}

function createArchives() {
  assertDir(buildHtmlDir, "Build output directory");
  assertDir(schemaDir, "Schema directory");

  for (const archive of archives) {
    fs.rmSync(archive.zipPath, { force: true });
    fs.rmSync(archive.tarPath, { force: true });
    run("zip", ["-qr", archive.zipPath, "."], { cwd: archive.sourceDir });
    run("tar", ["-czf", archive.tarPath, "."], { cwd: archive.sourceDir });
    console.log(`Created ${path.basename(archive.zipPath)} and ${path.basename(archive.tarPath)}.`);
  }
}

function validateArchives() {
  assertDir(buildHtmlDir, "Build output directory");
  assertDir(schemaDir, "Schema directory");

  const expected = new Map(
    archives.map((archive) => [archive.label, walkFiles(archive.sourceDir)]),
  );

  for (const required of ["index.html", "schema/lex-0.rng"]) {
    if (!expected.get("guidelines+schemas").includes(required)) {
      throw new Error(`Full-site archive source is missing required file: ${required}`);
    }
  }

  for (const required of ["lex-0.rng", "lex-0.rnc", "lex-0.xsd"]) {
    if (!expected.get("schemas").includes(required)) {
      throw new Error(`Schema archive source is missing required file: ${required}`);
    }
  }

  for (const archive of archives) {
    if (!fs.existsSync(archive.zipPath)) {
      throw new Error(`Archive not found: ${archive.zipPath}`);
    }
    if (!fs.existsSync(archive.tarPath)) {
      throw new Error(`Archive not found: ${archive.tarPath}`);
    }

    const expectedEntries = expected.get(archive.label);
    const zipEntries = normalizeArchiveEntries(run("unzip", ["-Z1", archive.zipPath]));
    const tarEntries = normalizeArchiveEntries(run("tar", ["-tzf", archive.tarPath]));

    const zipDiff = diffEntries(expectedEntries, zipEntries);
    if (zipDiff.missing.length || zipDiff.extra.length) {
      throw new Error(
        `${path.basename(archive.zipPath)} contents mismatch. Expected ${expectedEntries.length} files, got ${zipEntries.length}. Missing: ${zipDiff.missing.join(", ") || "none"}. Extra: ${zipDiff.extra.join(", ") || "none"}.`,
      );
    }

    const tarDiff = diffEntries(expectedEntries, tarEntries);
    if (tarDiff.missing.length || tarDiff.extra.length) {
      throw new Error(
        `${path.basename(archive.tarPath)} contents mismatch. Expected ${expectedEntries.length} files, got ${tarEntries.length}. Missing: ${tarDiff.missing.join(", ") || "none"}. Extra: ${tarDiff.extra.join(", ") || "none"}.`,
      );
    }

    console.log(`Validated ${path.basename(archive.zipPath)} and ${path.basename(archive.tarPath)} (${expectedEntries.length} files).`);
  }
}

try {
  if (shouldCreate) {
    createArchives();
  }
  if (shouldValidate) {
    validateArchives();
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
