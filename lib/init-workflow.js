"use strict";

const fs = require("fs");
const path = require("path");

/**
 * Install bundled `.github/workflows/pr.yml` for CI (`pnpm run pr:create` or `npm run pr:create`).
 * @param {string} cwd Repository root (usually `process.cwd()`).
 * @param {{ force?: boolean, packageManager?: "pnpm" | "npm" }} [options]
 * @returns {{ kind: 'wrote' | 'replaced' | 'unchanged', packageManager: 'pnpm' | 'npm' }}
 */
function installBundledPrWorkflow(cwd, options = {}) {
  const { force = false, packageManager = "pnpm" } = options;
  const pm = packageManager === "npm" ? "npm" : "pnpm";
  const bundled = path.join(
    __dirname,
    "..",
    "templates",
    "github",
    "workflows",
    `pr-${pm}.yml`,
  );
  if (!fs.existsSync(bundled)) {
    throw new Error(`Missing bundled pr workflow for ${pm} (corrupt install?).`);
  }
  const destDir = path.join(cwd, ".github", "workflows");
  const dest = path.join(destDir, "pr.yml");
  const content = fs.readFileSync(bundled, "utf8");

  const existed = fs.existsSync(dest);
  if (existed && !force) {
    return { kind: "unchanged", packageManager: pm };
  }

  fs.mkdirSync(destDir, { recursive: true });
  fs.writeFileSync(dest, content, "utf8");
  return { kind: existed ? "replaced" : "wrote", packageManager: pm };
}

module.exports = {
  installBundledPrWorkflow,
};
