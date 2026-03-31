import fs from "node:fs";
import path from "node:path";

const ENV_FILES = [".env", ".env.local"];
const ENV_KEY_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

const stripInlineComment = (value) => {
  let out = "";
  let quote = null;
  for (let i = 0; i < value.length; i += 1) {
    const char = value[i];
    if ((char === "'" || char === '"') && value[i - 1] !== "\\") {
      quote = quote === char ? null : quote || char;
    }
    if (char === "#" && quote === null) {
      break;
    }
    out += char;
  }
  return out.trim();
};

const unquote = (value) => {
  if (
    value.length >= 2 &&
    ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'")))
  ) {
    return value.slice(1, -1);
  }
  return value;
};

const expandValue = (value) => {
  const expandedHome = value.startsWith("~/")
    ? path.join(process.env.HOME || "", value.slice(2))
    : value;

  return expandedHome.replace(/\$([A-Za-z_][A-Za-z0-9_]*)|\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (_, bare, wrapped) => {
    const key = bare || wrapped;
    return process.env[key] ?? "";
  });
};

const applyEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) return;
  const source = fs.readFileSync(filePath, "utf8");
  for (const rawLine of source.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const withoutExport = line.startsWith("export ") ? line.slice(7).trim() : line;
    const separator = withoutExport.indexOf("=");
    if (separator === -1) continue;

    const key = withoutExport.slice(0, separator).trim();
    if (!ENV_KEY_PATTERN.test(key)) continue;

    const rawValue = withoutExport.slice(separator + 1).trim();
    const value = expandValue(unquote(stripInlineComment(rawValue)));
    process.env[key] = value;
  }
};

export const loadLocalEnv = (repoRoot) => {
  for (const file of ENV_FILES) {
    applyEnvFile(path.join(repoRoot, file));
  }
};
