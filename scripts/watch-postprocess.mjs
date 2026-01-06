import { spawn } from "node:child_process";
import { watch } from "node:fs";
import path from "node:path";

const target = path.join(process.cwd(), "scripts", "postprocess-html.mjs");
let running = false;
let pending = false;
let debounce = null;

const runPostprocess = () => {
  if (running) {
    pending = true;
    return;
  }
  running = true;
  const child = spawn("npm", ["run", "postprocess:html", "--", "--mode=dev"], {
    stdio: "inherit",
    shell: true,
  });
  child.on("exit", () => {
    running = false;
    if (pending) {
      pending = false;
      runPostprocess();
    }
  });
};

const schedule = () => {
  if (debounce) clearTimeout(debounce);
  debounce = setTimeout(runPostprocess, 200);
};

watch(target, (eventType) => {
  if (eventType === "rename" || eventType === "change") {
    schedule();
  }
});

console.log(`Watching ${target} (runs postprocess:html --mode=dev on change).`);
