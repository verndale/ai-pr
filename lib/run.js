"use strict";

const { getRepo, getBranchInfo, getCommits, getFileChanges, pickTitle } = require("./git");
const { buildBody, replaceSummarySection } = require("./body");
const {
  isAiEnabled,
  extractAllowedShortHashes,
  validateAiBullets,
  generateAiSummary,
  generateAiLabelsAndChecklist,
} = require("./ai");
const { createOrUpdatePr } = require("./github");

async function run() {
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (!token) throw new Error("Missing GH_TOKEN or GITHUB_TOKEN.");

  const draft = (process.env.PR_DRAFT || "true").toLowerCase() === "true";

  const { owner, repo } = getRepo();
  const { baseBranch, headBranch } = getBranchInfo("main");

  const commits = getCommits(baseBranch, headBranch);
  if (commits.length === 0) {
    throw new Error(`No commits found in ${baseBranch}..${headBranch}. Nothing to PR.`);
  }

  const title = pickTitle(commits);
  const fileChanges = getFileChanges(baseBranch, headBranch);

  let body = buildBody({ title, commits, fileChanges, baseBranch, headBranch });

  if (isAiEnabled()) {
    const allowedHashes = extractAllowedShortHashes(commits);

    try {
      const bullets = await generateAiSummary({ title, commits, fileChanges, allowedHashes });

      if (validateAiBullets(bullets, allowedHashes)) {
        body = replaceSummarySection(body, bullets);
      } else {
        console.log("AI summary rejected by validator; using deterministic placeholder.");
      }
    } catch (e) {
      console.log(`AI summary failed; using deterministic placeholder. (${e?.message || e})`);
    }

    try {
      const labelsChecklist = await generateAiLabelsAndChecklist({ title, body, commits });
      if (labelsChecklist) {
        body = body.trimEnd() + "\n\n" + labelsChecklist + "\n";
      }
    } catch (e) {
      console.log(`AI labels/checklist skipped. (${e?.message || e})`);
    }
  }

  const result = await createOrUpdatePr({
    owner,
    repo,
    baseBranch,
    headBranch,
    title,
    body,
    token,
    draft,
  });

  console.log(`${result.action.toUpperCase()}: ${result.pr.html_url}`);
}

module.exports = { run };
