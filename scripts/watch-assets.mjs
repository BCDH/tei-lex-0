import { spawn } from "node:child_process";
import { join, basename } from "node:path";
import chokidar from "chokidar";

const debug =
  process.env.WATCH_DEBUG === "1" || process.env.WATCH_DEBUG === "true";
const logDebug = (...args) => {
  if (debug) console.log(...args);
};

const playNotificationSound = () => {
  if (process.platform === "darwin") {
    // macOS system sound; ignore errors if afplay not available
    spawn("afplay", ["/System/Library/Sounds/Glass.aiff"], {
      stdio: "ignore",
      shell: true,
    }).on("error", () => {
      process.stdout.write("\u0007");
    });
  } else {
    process.stdout.write("\u0007");
  }
};

const cwd = process.cwd();
const assetsDir = join(cwd, "assets");
const watchTargets = [
  { dir: join(assetsDir, "css"), task: "assets:minify" },
  { dir: join(assetsDir, "js"), task: "assets:minify" },
  { dir: join(assetsDir, "images"), task: "assets:images" },
  { dir: join(cwd, "odd"), task: "assets:odd" },
  { dir: join(cwd, "xslt"), task: "assets:odd" },
  // { dir: join(cwd, "xproc"), task: "assets:odd" },
];

// Ignore generated artifacts and temp files that may retrigger assets:odd
const shouldIgnore = (fullPath = "") => {
  const base = basename(fullPath);
  return (
    base === ".DS_Store" ||
    base.startsWith("._") ||
    base.startsWith(".#") ||
    base.endsWith(".stripped.xml") ||
    base.endsWith("~") ||
    base.endsWith(".swp") ||
    base.endsWith(".swo") ||
    base.endsWith(".swn") ||
    base.endsWith(".swx") ||
    base.endsWith(".tmp") ||
    base.endsWith(".temp") ||
    base.endsWith(".bak") ||
    base.endsWith(".orig") ||
    base.startsWith("#") ||
    base.endsWith("#")
  );
};

const taskState = new Map();
const getState = (task) => {
  if (!taskState.has(task)) {
    taskState.set(task, { running: false, pending: false, debounce: null });
  }
  return taskState.get(task);
};

const runTask = (task) => {
  const state = getState(task);
  const running = state.running;
  if (running) {
    state.pending = true;
    return;
  }
  state.running = true;
  const child = spawn("npm", ["run", task], {
    stdio: "inherit",
    shell: true,
  });
  child.on("exit", () => {
    if (task === "assets:odd") {
      console.log("✅ assets:odd finished");
      playNotificationSound();
    }
    state.running = false;
    if (state.pending) {
      state.pending = false;
      runTask(task);
    }
  });
};

const scheduleTask = (task) => {
  const state = getState(task);
  if (state.debounce) clearTimeout(state.debounce);
  state.debounce = setTimeout(() => runTask(task), 200);
};

// NOTE: Node's built-in `fs.watch({ recursive: true })` has proven unreliable
// on macOS for directory trees (missed events under `odd/includes/`).
// `chokidar` uses the best available backend per platform (incl. fsevents on
// macOS) and handles atomic/safe-write editor patterns reliably.
const watchers = watchTargets.map(({ dir, task }) =>
  chokidar
    .watch(dir, {
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 150, pollInterval: 50 },
      ignored: (path) => shouldIgnore(path),
    })
    .on("all", (eventType, path) => {
      logDebug(`[watch] ${task}: ${eventType} ${path}`);
      scheduleTask(task);
    }),
);

process.on("SIGINT", () => {
  for (const w of watchers) w.close();
  process.exit(0);
});

console.log("Watching assets for changes:");
watchTargets.forEach(({ dir }) => console.log(`- ${dir}`));
