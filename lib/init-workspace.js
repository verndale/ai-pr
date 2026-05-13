"use strict";

const fs = require("fs");
const path = require("path");

/**
 * Read recommended npm script name/command from this package’s package.json.
 * @returns {{ name: string, command: string }}
 */
function getRecommendedPrScript() {
  const pkgPath = path.join(__dirname, "..", "package.json");
  const raw = fs.readFileSync(pkgPath, "utf8");
  const pkg = JSON.parse(raw);
  const v = pkg.verndale && pkg.verndale.aiPr;
  return {
    name: (v && v.recommendedScriptName) || "pr:create",
    command: (v && v.recommendedScriptCommand) || "ai-pr",
  };
}

/** @param {Record<string, unknown>} pkg */
function packageJsonHasDotenv(pkg) {
  for (const field of ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"]) {
    const block = pkg[field];
    if (block && typeof block === "object" && Object.hasOwn(block, "dotenv")) {
      return true;
    }
  }
  return false;
}

function getBundledDotenvRange() {
  const pkgPath = path.join(__dirname, "..", "package.json");
  const raw = fs.readFileSync(pkgPath, "utf8");
  const pkg = JSON.parse(raw);
  const v = pkg.dependencies && pkg.dependencies.dotenv;
  return typeof v === "string" && v.trim() !== "" ? v : "^17.3.1";
}

/**
 * Ensure `pr:create` (or published `verndale.aiPr.recommendedScriptName`) runs `ai-pr`.
 * Does not replace an existing script with the same key.
 * Adds `dotenv` to `dependencies` when it is missing from all common dependency blocks.
 * @param {string} packageJsonPath
 * @returns {{ changed: boolean, scriptChanged: boolean, dotenvAdded: boolean }}
 */
function mergePackageJsonForAiPr(packageJsonPath) {
  const { name, command } = getRecommendedPrScript();
  const raw = fs.readFileSync(packageJsonPath, "utf8");
  const pkg = JSON.parse(raw);
  let changed = false;
  let scriptChanged = false;
  let dotenvAdded = false;

  pkg.scripts = pkg.scripts && typeof pkg.scripts === "object" ? pkg.scripts : {};
  if (!pkg.scripts[name]) {
    pkg.scripts[name] = command;
    changed = true;
    scriptChanged = true;
  }

  if (!packageJsonHasDotenv(pkg)) {
    pkg.dependencies = pkg.dependencies && typeof pkg.dependencies === "object" ? pkg.dependencies : {};
    pkg.dependencies.dotenv = getBundledDotenvRange();
    changed = true;
    dotenvAdded = true;
  }

  if (changed) {
    fs.writeFileSync(packageJsonPath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
  }

  return { changed, scriptChanged, dotenvAdded };
}

module.exports = {
  getRecommendedPrScript,
  mergePackageJsonForAiPr,
};
