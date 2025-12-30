import { spawn } from "node:child_process";
import { watch } from "node:fs";
import { join } from "node:path";

const assetsDir = join(process.cwd(), "assets");
const watchDirs = [join(assetsDir, "css"), join(assetsDir, "js")];
let pending = false;
let running = false;
let debounceTimer = null;

const runBuild = () => {
  if (running) {
    pending = true;
    return;
  }
  running = true;
  const child = spawn("npm", ["run", "assets:minify"], {
    stdio: "inherit",
    shell: true,
  });
  child.on("exit", () => {
    running = false;
    if (pending) {
      pending = false;
      runBuild();
    }
  });
};

const scheduleBuild = () => {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(runBuild, 200);
};

watchDirs.forEach((dir) => {
  watch(
    dir,
    { recursive: true },
    (eventType, filename) => {
      if (!filename) return;
      if (!filename.endsWith(".css") && !filename.endsWith(".js")) return;
      if (eventType === "rename" || eventType === "change") {
        scheduleBuild();
      }
    }
  );
});

console.log("Watching assets for changes:");
watchDirs.forEach((dir) => console.log(`- ${dir}`));
