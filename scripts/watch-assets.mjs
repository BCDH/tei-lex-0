import { spawn } from "node:child_process";
import { watch } from "node:fs";
import { join } from "node:path";

const assetsDir = join(process.cwd(), "assets");
const watchTargets = [
  { dir: join(assetsDir, "css"), task: "assets:minify" },
  { dir: join(assetsDir, "js"), task: "assets:minify" },
  { dir: join(assetsDir, "images"), task: "assets:images" },
];
let pendingMinify = false;
let runningMinify = false;
let debounceMinify = null;
let pendingImages = false;
let runningImages = false;
let debounceImages = null;

const runTask = (task) => {
  const isMinify = task === "assets:minify";
  const running = isMinify ? runningMinify : runningImages;
  if (running) {
    if (isMinify) pendingMinify = true;
    else pendingImages = true;
    return;
  }
  if (isMinify) runningMinify = true;
  else runningImages = true;
  const child = spawn("npm", ["run", task], {
    stdio: "inherit",
    shell: true,
  });
  child.on("exit", () => {
    if (isMinify) {
      runningMinify = false;
      if (pendingMinify) {
        pendingMinify = false;
        runTask(task);
      }
    } else {
      runningImages = false;
      if (pendingImages) {
        pendingImages = false;
        runTask(task);
      }
    }
  });
};

const scheduleTask = (task) => {
  if (task === "assets:minify") {
    if (debounceMinify) clearTimeout(debounceMinify);
    debounceMinify = setTimeout(() => runTask(task), 200);
  } else {
    if (debounceImages) clearTimeout(debounceImages);
    debounceImages = setTimeout(() => runTask(task), 200);
  }
};

watchTargets.forEach(({ dir, task }) => {
  watch(
    dir,
    { recursive: true },
    (eventType, filename) => {
      if (!filename) return;
      if (eventType === "rename" || eventType === "change") {
        scheduleTask(task);
      }
    }
  );
});

console.log("Watching assets for changes:");
watchTargets.forEach(({ dir }) => console.log(`- ${dir}`));
