#!/usr/bin/env node
"use strict";

const path = require("path");
const fs = require("fs");

const { mergeAiPrEnvFile } = require("../lib/init-env.js");
const { resolveEnvExamplePath, findPackageRoot } = require("../lib/init-paths.js");
const { isInGitRepo, getGitRoot } = require("../lib/init-git.js");
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
  init  Merge env and example file, add pr:create to package.json when applicable, and
        install .github/workflows/pr.yml at the repo root when missing (pnpm or npm template).
        Env merge targets .env.local when that file exists, else .env under the nearest
        package.json (from cwd). --force replaces .env / the resolved example file and can
        overwrite pr.yml; it does not wholesale-replace .env.local (keys are merged only).
        Package manager for the workflow is detected from the package root (packageManager /
        lockfiles), or set with --pnpm, --npm, or --workflow=. --env-only stops after env files.
        --husky skips package.json; --workspace includes it again.

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

function reportEnvResult(kind, envRel, packageName, options = {}) {
  const { mergeEnvIntoLocal = false } = options;
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
        mergeEnvIntoLocal
          ? `No missing ${packageName} keys in ${envRel}; left unchanged.\n`
          : `No missing ${packageName} keys in ${envRel}; left unchanged. Use --force to replace the file with the bundled template.\n`,
      );
      break;
    default:
      break;
  }
}

function cmdInit(argv) {
  const { force, husky, workspace, envOnly, workflowExplicit } = parseInitArgv(argv);
  const cwd = process.cwd();
  const bundledExamplePath = path.join(__dirname, "..", ".env-example");

  if (!fs.existsSync(bundledExamplePath)) {
    throw new Error("Missing bundled .env-example (corrupt install?).");
  }

  const inGit = isInGitRepo(cwd);
  const gitRoot = inGit ? getGitRoot(cwd) : null;
  const packageRoot = findPackageRoot(cwd, gitRoot);
  const packageManager = detectWorkflowPackageManager(packageRoot, workflowExplicit);

  if (
    inGit &&
    gitRoot &&
    path.resolve(packageRoot) !== path.resolve(gitRoot)
  ) {
    process.stdout.write(
      `Note: env files are updated under ${packageRoot}; workflow is installed at ${gitRoot}/.github/workflows.\n`,
    );
  }

  const envLocalPath = path.join(packageRoot, ".env.local");
  const envPath = path.join(packageRoot, ".env");
  const envMergePath = fs.existsSync(envLocalPath) ? envLocalPath : envPath;
  const mergeEnvIntoLocal =
    path.resolve(envMergePath) === path.resolve(envLocalPath);
  const envForce = force && !mergeEnvIntoLocal;
  if (force && mergeEnvIntoLocal) {
    process.stderr.write(
      "note: --force does not replace .env.local with the bundled template; @verndale/ai-pr keys are merged (append / docs) only.\n",
    );
  }

  const envResult = mergeAiPrEnvFile(envMergePath, bundledExamplePath, {
    force: envForce,
  });
  const envRel = path.relative(cwd, envMergePath) || path.basename(envMergePath);
  reportEnvResult(envResult.kind, envRel, "@verndale/ai-pr", { mergeEnvIntoLocal });

  const envExampleDest = resolveEnvExamplePath(packageRoot);
  const exResult = mergeAiPrEnvFile(envExampleDest, bundledExamplePath, { force });
  const exRel = path.relative(cwd, envExampleDest) || path.basename(envExampleDest);
  reportEnvResult(exResult.kind, exRel, "@verndale/ai-pr");

  /** Full package.json merge: default on, or \`--workspace\`; off for \`--husky\` alone (same as ai-commit). */
  const mergePackageJson = !husky || workspace;

  if (envOnly) {
    printInitNextSteps({
      envOnly: true,
      packageManager,
    });
    return;
  }

  if (mergePackageJson) {
    const pkgPath = path.join(packageRoot, "package.json");
    if (fs.existsSync(pkgPath)) {
      const { changed } = mergePackageJsonForAiPr(pkgPath);
      if (changed) {
        process.stdout.write(
          "Updated package.json (pr:create script). Run your package manager install if you added dependencies.\n",
        );
      }
    } else {
      process.stdout.write(`No package.json at ${packageRoot}; skipped package.json merge.\n`);
    }
  }

  const workflowBase = gitRoot || packageRoot;
  const wfResult = installBundledPrWorkflow(workflowBase, { force, packageManager });
  const wfRel =
    path.relative(cwd, path.join(workflowBase, ".github", "workflows", "pr.yml")) ||
    ".github/workflows/pr.yml";
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
