import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import readline from "node:readline/promises";

const MEDIA_EXTS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".svg",
  ".gif",
  ".webp",
  ".ico",
  ".mp4",
  ".mov",
  ".mp3",
  ".wav",
  ".pdf",
]);

const TEXT_EXTS = new Set([
  ".md",
  ".html",
  ".htm",
  ".xml",
  ".xsl",
  ".xslt",
  ".xproc",
  ".js",
  ".mjs",
  ".cjs",
  ".ts",
  ".tsx",
  ".jsx",
  ".css",
  ".scss",
  ".json",
  ".yml",
  ".yaml",
  ".txt",
]);

const EXCLUDED_DIRS = new Set([".git", "node_modules", "build"]);
const EXCLUDED_FILES_REL_POSIX = new Set(["docs/unused-media.md"]);

async function* walkFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith(".") && entry.name !== ".github") continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) continue;
      yield* walkFiles(fullPath);
      continue;
    }
    if (entry.isFile()) yield fullPath;
  }
}

function toPosix(p) {
  return p.split(path.sep).join("/");
}

function getMediaReferenceCandidates(assetRelPosix) {
  const candidates = new Set([assetRelPosix, `/${assetRelPosix}`]);

  const parts = assetRelPosix.split("/");
  const basename = parts.at(-1);
  candidates.add(basename);

  if (assetRelPosix.startsWith("assets/images/")) {
    const fromImages = assetRelPosix.slice("assets/images/".length);
    candidates.add(`images/${fromImages}`);
    candidates.add(`/images/${fromImages}`);
  }

  if (assetRelPosix.startsWith("assets/media/")) {
    const fromMedia = assetRelPosix.slice("assets/media/".length);
    candidates.add(`media/${fromMedia}`);
    candidates.add(`/media/${fromMedia}`);
  }

  return [...candidates].filter(Boolean);
}

async function indexTextFiles(rootDir) {
  const textFiles = [];
  for await (const filePath of walkFiles(rootDir)) {
    const ext = path.extname(filePath).toLowerCase();
    if (!TEXT_EXTS.has(ext)) continue;
    const relPosix = toPosix(path.relative(rootDir, filePath));
    if (EXCLUDED_FILES_REL_POSIX.has(relPosix)) continue;
    textFiles.push(filePath);
  }

  const contentsByFile = new Map();
  await Promise.all(
    textFiles.map(async (filePath) => {
      const content = await fs.readFile(filePath, "utf8");
      contentsByFile.set(filePath, content);
    }),
  );

  return contentsByFile;
}

async function main() {
  const rootDir = process.cwd();
  const args = new Set(process.argv.slice(2));
  const wantsDelete = args.has("--delete") || args.has("--remove");
  const assumeYes = args.has("--yes");

  const assetsDir = path.join(rootDir, "assets");
  const mediaFiles = [];

  for await (const filePath of walkFiles(assetsDir)) {
    const ext = path.extname(filePath).toLowerCase();
    if (!MEDIA_EXTS.has(ext)) continue;
    mediaFiles.push(filePath);
  }

  const contentsByFile = await indexTextFiles(rootDir);

  const unused = [];

  for (const filePath of mediaFiles) {
    const relPosix = toPosix(path.relative(rootDir, filePath));
    const candidates = getMediaReferenceCandidates(relPosix);

    let used = false;
    for (const [textPath, content] of contentsByFile.entries()) {
      // Avoid matching within the asset file path itself.
      if (toPosix(path.relative(rootDir, textPath)) === relPosix) continue;
      if (candidates.some((c) => content.includes(c))) {
        used = true;
        break;
      }
    }

    if (!used) unused.push(relPosix);
  }

  unused.sort();

  if (unused.length === 0) {
    console.log("No unused media found under assets/.");
    return;
  }

  const unusedWithSizes = await Promise.all(
    unused.map(async (relPosix) => {
      const stat = await fs.stat(path.join(rootDir, relPosix));
      return { relPosix, bytes: stat.size };
    }),
  );

  const totalBytes = unusedWithSizes.reduce((sum, item) => sum + item.bytes, 0);

  console.log(`Unused media under assets/ (${unused.length}):`);
  for (const { relPosix, bytes } of unusedWithSizes) {
    const mb = bytes / (1024 * 1024);
    console.log(`- ${relPosix} (${mb.toFixed(2)} MB)`);
  }
  const totalMb = totalBytes / (1024 * 1024);
  console.log(`Total: ${totalMb.toFixed(2)} MB`);

  if (wantsDelete) {
    const isInteractive =
      process.stdout.isTTY && process.stdin.isTTY && process.env.CI !== "true";

    if (!isInteractive && !assumeYes) {
      console.log(
        "Not running interactively; re-run with --yes to remove these files.",
      );
      process.exitCode = 1;
      return;
    }

    let confirmed = assumeYes;
    if (!confirmed) {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      const answer = await rl.question("Remove these files now? (y/N) ");
      rl.close();
      confirmed = answer.trim().toLowerCase() === "y";
    }

    if (confirmed) {
      for (const { relPosix } of unusedWithSizes) {
        await fs.unlink(path.join(rootDir, relPosix));
      }
      console.log(`Removed ${unusedWithSizes.length} file(s).`);
      process.exitCode = 0;
      return;
    }
  }

  console.log("To remove them: npm run assets:unused -- --delete");
  process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
