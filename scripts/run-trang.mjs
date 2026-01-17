import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const schemaDir = path.join(repoRoot, "build", "html", "schema");
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

const buildTemplateCommand = (template, input, output) => {
  const replaced = template
    .replaceAll("{INPUT}", input)
    .replaceAll("{OUTPUT}", output);
  if (replaced === template) {
    return `${template} ${[...extraArgs, input, output].join(" ")}`;
  }
  return `${replaced} ${extraArgs.join(" ")}`.trim();
};

const runTrang = (input, output, format) => {
  const envCmd = process.env.TRANG_CMD;
  if (envCmd) {
    const command = buildTemplateCommand(envCmd, input, output);
    const status = spawnSync(command, { stdio: "inherit", shell: true }).status;
    return status ?? 1;
  }

  const formatArgs = ["-I", "rng", "-O", format, ...extraArgs, input, output];
  const trangStatus = tryCommand("trang", formatArgs);
  if (trangStatus !== null) {
    return trangStatus;
  }

  const jarPath = process.env.TRANG_JAR;
  if (jarPath) {
    if (!fs.existsSync(jarPath)) {
      console.error(`Trang jar not found at: ${jarPath}`);
      return 1;
    }
    return runCommand("java", ["-jar", jarPath, ...formatArgs]);
  }

  console.error(
    'Trang not found. Set TRANG_CMD (e.g. "trang") or TRANG_JAR.'
  );
  return 1;
};

if (!fs.existsSync(schemaDir)) {
  console.error(`Schema folder not found: ${schemaDir}`);
  console.error("Run the build first to generate RNG.");
  process.exit(1);
}

const rngFiles = fs
  .readdirSync(schemaDir)
  .filter((file) => file.toLowerCase().endsWith(".rng"));

if (rngFiles.length === 0) {
  console.error(`No RNG files found in: ${schemaDir}`);
  process.exit(1);
}

for (const file of rngFiles) {
  const input = path.join(schemaDir, file);
  const base = path.join(schemaDir, path.basename(file, ".rng"));
  const rncStatus = runTrang(input, `${base}.rnc`, "rnc");
  if (rncStatus !== 0) {
    process.exit(rncStatus);
  }
  const xsdStatus = runTrang(input, `${base}.xsd`, "xsd");
  if (xsdStatus !== 0) {
    process.exit(xsdStatus);
  }
}

console.log("Generated RNC and XSD from RNG schemas.");
