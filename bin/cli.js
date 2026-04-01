#!/usr/bin/env node
"use strict";

const path = require("path");
const fs = require("fs");

const { mergeAiPrEnvFile } = require("../lib/init-env.js");
const { mergePackageJsonForAiPr } = require("../lib/init-workspace.js");

function printHelp() {
  process.stdout.write(`ai-pr — create or update a GitHub pull request from the current branch.

Usage:
  ai-pr [run]
  ai-pr init [--force] [--env-only] [--husky] [--workspace]
  ai-pr --help

Commands:
  run   Create or update a PR (default when no subcommand is given).
  init  Merge .env and .env-example from the bundled template, then optionally add the
        recommended pr:create script to package.json. --env-only stops after env files.
        --husky skips package.json merge (no Husky is installed by this package; same flag
        name as ai-commit for familiarity). --workspace includes package.json again when
        used with --husky. --force replaces .env / .env-example with the bundled template.

Environment:
  See .env-example after init, or the README. Loads .env then .env.local (override).

`);
}

function parseInitArgv(argv) {
  let force = false;
  let husky = false;
  let workspace = false;
  let envOnly = false;
  for (const a of argv) {
    if (a === "--force") {
      force = true;
    } else if (a === "--husky") {
      husky = true;
    } else if (a === "--workspace") {
      workspace = true;
    } else if (a === "--env-only") {
      envOnly = true;
    }
  }
  return { force, husky, workspace, envOnly };
}

function reportEnvResult(kind, envRel, packageName) {
  switch (kind) {
    case "replaced":
      process.stdout.write(`Replaced ${envRel} with bundled template (--force).\n`);
      break;
    case "wrote":
      process.stdout.write(`Wrote ${envRel} from bundled template.\n`);
      break;
    case "merged":
      process.stdout.write(`Appended missing ${packageName} keys to ${envRel}.\n`);
      break;
    case "unchanged":
      process.stdout.write(
        `No missing ${packageName} keys in ${envRel}; left unchanged. Use --force to replace the file with the bundled template.\n`,
      );
      break;
    default:
      break;
  }
}

function cmdInit(argv) {
  const { force, husky, workspace, envOnly } = parseInitArgv(argv);
  const cwd = process.cwd();
  /** Full package.json merge: default on, or \`--workspace\`; off for \`--husky\` alone (same as ai-commit). */
  const mergePackageJson = !husky || workspace;
  const examplePath = path.join(__dirname, "..", ".env-example");

  if (!fs.existsSync(examplePath)) {
    throw new Error("Missing bundled .env-example (corrupt install?).");
  }

  const envDest = path.join(cwd, ".env");
  const envResult = mergeAiPrEnvFile(envDest, examplePath, { force });
  const envRel = path.relative(cwd, envDest) || ".env";
  reportEnvResult(envResult.kind, envRel, "@verndale/ai-pr");

  const envExampleDest = path.join(cwd, ".env-example");
  const exResult = mergeAiPrEnvFile(envExampleDest, examplePath, { force });
  const exRel = path.relative(cwd, envExampleDest) || ".env-example";
  reportEnvResult(exResult.kind, exRel, "@verndale/ai-pr");

  if (envOnly) {
    return;
  }

  if (mergePackageJson) {
    const pkgPath = path.join(cwd, "package.json");
    if (fs.existsSync(pkgPath)) {
      const { changed } = mergePackageJsonForAiPr(pkgPath);
      if (changed) {
        process.stdout.write(
          "Updated package.json (pr:create script). Run your package manager install if you added dependencies.\n",
        );
      }
    } else {
      process.stdout.write("No package.json in this directory; skipped package.json merge.\n");
    }
  }
}

async function cmdRun() {
  require("dotenv").config();
  require("dotenv").config({ path: ".env.local", override: true });
  const { run } = require("../lib/run");
  await run();
}

async function main() {
  const argv = process.argv.slice(2);
  const cmd = argv[0];

  if (cmd === "-h" || cmd === "--help") {
    printHelp();
    process.exit(0);
  }

  if (!cmd || cmd === "run") {
    await cmdRun();
    return;
  }

  if (cmd === "init") {
    cmdInit(argv.slice(1));
    return;
  }

  throw new Error(`Unknown command: ${cmd}. Run ai-pr --help.`);
}

main().catch(err => {
  console.error(err?.message || err);
  process.exit(1);
});
