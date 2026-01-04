import fs from "node:fs/promises";
import path from "node:path";

const SRC_DIR = path.join("assets", "images");
const DEST_DIR = path.join("build", "html", "images");

async function main() {
  try {
    await fs.access(SRC_DIR);
  } catch {
    console.warn(`Skipping image copy; source not found: ${SRC_DIR}`);
    return;
  }

  await fs.rm(DEST_DIR, { recursive: true, force: true });
  await fs.mkdir(path.dirname(DEST_DIR), { recursive: true });
  await fs.cp(SRC_DIR, DEST_DIR, { recursive: true });

  console.log(`Copied images from ${SRC_DIR} to ${DEST_DIR}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
