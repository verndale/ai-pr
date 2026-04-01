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

/**
 * Ensure `pr:create` (or published `verndale.aiPr.recommendedScriptName`) runs `ai-pr`.
 * Does not replace an existing script with the same key.
 * @param {string} packageJsonPath
 * @returns {{ changed: boolean }}
 */
function mergePackageJsonForAiPr(packageJsonPath) {
  const { name, command } = getRecommendedPrScript();
  const raw = fs.readFileSync(packageJsonPath, "utf8");
  const pkg = JSON.parse(raw);
  let changed = false;

  pkg.scripts = pkg.scripts && typeof pkg.scripts === "object" ? pkg.scripts : {};
  if (!pkg.scripts[name]) {
    pkg.scripts[name] = command;
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(packageJsonPath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
  }

  return { changed };
}

module.exports = {
  getRecommendedPrScript,
  mergePackageJsonForAiPr,
};
