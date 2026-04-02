"use strict";

const fs = require("fs");
const path = require("path");

/**
 * @param {string} cwd
 * @param {string | undefined} explicit `pnpm`, `npm`, or undefined to auto-detect
 * @returns {"pnpm" | "npm"}
 */
function detectWorkflowPackageManager(cwd, explicit) {
  const e = explicit && String(explicit).toLowerCase();
  if (e === "pnpm" || e === "npm") {
    return e;
  }
  if (explicit) {
    throw new Error(
      `Invalid workflow package manager: ${explicit}. Use --pnpm, --npm, or --workflow=pnpm|npm.`,
    );
  }

  const pkgPath = path.join(cwd, "package.json");
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      const pm = pkg.packageManager;
      if (typeof pm === "string") {
        if (pm.startsWith("pnpm@")) {
          return "pnpm";
        }
        if (pm.startsWith("npm@")) {
          return "npm";
        }
      }
    } catch (_) {
      /* ignore */
    }
  }

  if (fs.existsSync(path.join(cwd, "pnpm-lock.yaml"))) {
    return "pnpm";
  }
  if (fs.existsSync(path.join(cwd, "package-lock.json"))) {
    return "npm";
  }

  return "pnpm";
}

module.exports = {
  detectWorkflowPackageManager,
};
