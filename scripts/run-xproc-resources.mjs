import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const pipeline = path.join(repoRoot, "xproc", "resources.xpl");
const extraArgs = process.argv.slice(2);

const runCommand = (command, args, options = {}) => {
  const result = spawnSync(command, args, { stdio: "inherit", ...options });
  if (result.error) {
    throw result.error;
  }
  return result.status ?? 1;
};

const tryCommand = (command, args) => {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.error) {
    if (result.error.code === "ENOENT") {
      return null;
    }
    throw result.error;
  }
  return result.status ?? 1;
};

const exitWithStatus = (status) => {
  process.exit(status ?? 1);
};

const ensureOutputDirs = () => {
  fs.mkdirSync(path.join(repoRoot, "tei", "stylesheet"), { recursive: true });
  fs.mkdirSync(path.join(repoRoot, "tei", "odd"), { recursive: true });
};

ensureOutputDirs();

const envCmd = process.env.XMLCALABASH_CMD;
if (envCmd) {
  const command = envCmd.includes("{PIPELINE}")
    ? envCmd.replace("{PIPELINE}", pipeline)
    : `${envCmd} ${[...extraArgs, pipeline].join(" ")}`;
  const result = spawnSync(command, { stdio: "inherit", shell: true });
  exitWithStatus(result.status);
}

const xmlcalabashStatus = tryCommand("xmlcalabash", [...extraArgs, pipeline]);
if (xmlcalabashStatus !== null) {
  exitWithStatus(xmlcalabashStatus);
}

const calabashStatus = tryCommand("calabash", [...extraArgs, pipeline]);
if (calabashStatus !== null) {
  exitWithStatus(calabashStatus);
}

const jarPath = process.env.XMLCALABASH_JAR || process.env.CALABASH_JAR;
if (jarPath) {
  if (!fs.existsSync(jarPath)) {
    console.error(`XML Calabash jar not found at: ${jarPath}`);
    process.exit(1);
  }
  const classpath = [jarPath].join(path.delimiter);
  const status = runCommand("java", [
    "-cp",
    classpath,
    "com.xmlcalabash.app.Main",
    ...extraArgs,
    pipeline,
  ]);
  exitWithStatus(status);
}

console.error(
  'XML Calabash not found. Set XMLCALABASH_CMD (e.g. "xmlcalabash") or XMLCALABASH_JAR.'
);
process.exit(1);

