#!/usr/bin/env node
"use strict";

const path = require("path");
const fs = require("fs");

const { mergeAiPrEnvFile } = require("../lib/init-env.js");
const { mergePackageJsonForAiPr } = require("../lib/init-workspace.js");
const { installBundledPrWorkflow } = require("../lib/init-workflow.js");
const { detectWorkflowPackageManager } = require("../lib/workflow-pm.js");
const { printInitNextSteps } = require("../lib/init-next-steps.js");

function printHelp() {
  process.stdout.write(`ai-pr — create or update a GitHub pull request from the current branch.

Usage:
  ai-pr [run]
  ai-pr init [--force] [--env-only] [--husky] [--workspace] [--pnpm | --npm | --workflow=pnpm|npm]
  ai-pr --help

Commands:
  run   Create or update a PR (default when no subcommand is given).
  init  Merge .env and .env-example, add pr:create to package.json when applicable, and
        install .github/workflows/pr.yml when missing (pnpm or npm template). Package manager
        for the workflow is auto-detected from packageManager / lockfiles, or set with --pnpm,
        --npm, or --workflow=. --env-only stops after env files. --husky skips package.json;
        --workspace includes it again. --force replaces .env / .env-example and can overwrite
        pr.yml.

Environment:
  See .env-example after init, or the README. Loads .env then .env.local (override).

`);
}

function parseInitArgv(argv) {
  let force = false;
  let husky = false;
  let workspace = false;
  let envOnly = false;
  let workflowEq = null;
  let pnpmFlag = false;
  let npmFlag = false;
  for (const a of argv) {
    if (a === "--force") {
      force = true;
    } else if (a === "--husky") {
      husky = true;
    } else if (a === "--workspace") {
      workspace = true;
    } else if (a === "--env-only") {
      envOnly = true;
    } else if (a === "--pnpm") {
      pnpmFlag = true;
    } else if (a === "--npm") {
      npmFlag = true;
    } else if (a.startsWith("--workflow=")) {
      const v = a.slice("--workflow=".length).trim().toLowerCase();
      workflowEq = v === "" ? null : v;
    }
  }
  if (pnpmFlag && npmFlag) {
    throw new Error("Use either --pnpm or --npm, not both.");
  }
  const fromShortcut = pnpmFlag ? "pnpm" : npmFlag ? "npm" : null;
  if (workflowEq && fromShortcut && workflowEq !== fromShortcut) {
    throw new Error("Conflicting --workflow= value and --pnpm/--npm.");
  }
  const workflowExplicit = workflowEq || fromShortcut || undefined;
  return { force, husky, workspace, envOnly, workflowExplicit };
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
  const { force, husky, workspace, envOnly, workflowExplicit } = parseInitArgv(argv);
  const cwd = process.cwd();
  const packageManager = detectWorkflowPackageManager(cwd, workflowExplicit);
  /** Full package.json merge: default on, or \`--workspace\`; off for \`--husky\` alone (same as ai-commit). */
  const mergePackageJson = !husky || workspace;
  const examplePath = path.join(__dirname, "..", ".env-example");

  if (!fs.existsSync(examplePath)) {
    throw new Error("Missing bundled .env-example (corrupt install?).");
  }

  const envDest = path.join(cwd, ".env");
  const envResult = mergeAiPrEnvFile(envDest, { force });
  const envRel = path.relative(cwd, envDest) || ".env";
  reportEnvResult(envResult.kind, envRel, "@verndale/ai-pr");

  const envExampleDest = path.join(cwd, ".env-example");
  const exResult = mergeAiPrEnvFile(envExampleDest, { force });
  const exRel = path.relative(cwd, envExampleDest) || ".env-example";
  reportEnvResult(exResult.kind, exRel, "@verndale/ai-pr");

  if (envOnly) {
    printInitNextSteps({
      envOnly: true,
      packageManager,
    });
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

  const wfResult = installBundledPrWorkflow(cwd, { force, packageManager });
  const wfRel = path.relative(cwd, path.join(cwd, ".github", "workflows", "pr.yml")) || ".github/workflows/pr.yml";
  const pmLabel = wfResult.packageManager === "npm" ? "npm" : "pnpm";
  switch (wfResult.kind) {
    case "wrote":
      process.stdout.write(`Wrote ${wfRel} from bundled template (${pmLabel}).\n`);
      break;
    case "replaced":
      process.stdout.write(`Replaced ${wfRel} with bundled template (${pmLabel}) (--force).\n`);
      break;
    case "unchanged":
      process.stdout.write(
        `${wfRel} already exists; left unchanged. Use --force with --pnpm or --npm to replace the bundled workflow.\n`,
      );
      break;
    default:
      break;
  }

  printInitNextSteps({
    envOnly: false,
    packageManager,
    workflowKind: wfResult.kind,
  });
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
