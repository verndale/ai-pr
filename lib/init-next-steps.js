"use strict";

/**
 * @param {{ envOnly: boolean, packageManager: "pnpm" | "npm", workflowKind?: "wrote" | "replaced" | "unchanged" }} opts
 */
function printInitNextSteps(opts) {
  const { envOnly, packageManager, workflowKind } = opts;
  const lines = ["", "--- Next steps ---"];

  if (!envOnly) {
    const installCmd = packageManager === "npm" ? "npm install" : "pnpm install";
    lines.push(`• Run ${installCmd} if you changed package.json or are setting up a fresh clone.`);
    lines.push(
      "• GitHub: Settings → Secrets and variables → Actions → repository secret PR_BOT_TOKEN (classic PAT with repo scope; use a bot if GITHUB_TOKEN cannot open PRs under branch protection).",
    );
    lines.push(
      "• Optional AI in CI: repository variables PR_AI, PR_AI_ENDPOINT, PR_AI_MODEL; secret PR_AI_API_KEY.",
    );
    if (packageManager === "npm") {
      lines.push(
        "• npm workflow runs npm ci — commit package-lock.json. Switch template: pnpm exec ai-pr init --force --pnpm",
      );
    } else {
      lines.push(
        "• pnpm workflow runs pnpm install --frozen-lockfile — commit pnpm-lock.yaml. Switch template: pnpm exec ai-pr init --force --npm",
      );
    }
    if (workflowKind === "unchanged") {
      lines.push(
        "• .github/workflows/pr.yml was not modified. Use --force with --pnpm or --npm to replace it with the bundled template.",
      );
    }
  } else {
    lines.push(
      "• --env-only: no workflow or package.json changes. Run ai-pr init (without --env-only) to add .github/workflows/pr.yml.",
    );
  }

  lines.push("• Local CLI: set GH_TOKEN or GITHUB_TOKEN in .env or .env.local.");
  lines.push("• CI: push a non-main branch, or run Create or update PR from the Actions tab.");
  lines.push("");
  process.stdout.write(lines.join("\n"));
}

module.exports = {
  printInitNextSteps,
};
