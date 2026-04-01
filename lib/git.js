"use strict";

const { execSync } = require("node:child_process");

function sh(cmd) {
  return execSync(cmd, { stdio: ["ignore", "pipe", "pipe"] }).toString("utf8").trim();
}

function parseHeader(message) {
  const first = (message || "").split("\n")[0].trim();
  const m = first.match(/^(\w+)(\(([^)]+)\))?:\s(.+)$/);
  if (!m) return { type: null, scope: null, subject: first };
  return { type: m[1], scope: m[3] || null, subject: m[4] || "" };
}

function getRepo() {
  const remote = sh("git config --get remote.origin.url");
  const m =
    remote.match(/github\.com[/:]([^/]+)\/([^/.]+)(\.git)?$/i) ||
    remote.match(/github\.com\/([^/]+)\/([^/.]+)(\.git)?$/i);
  if (!m) throw new Error(`Could not parse GitHub repo from origin: ${remote}`);
  return { owner: m[1], repo: m[2] };
}

function getBranchInfo(defaultBase = "main") {
  const baseBranch = process.env.PR_BASE_BRANCH || defaultBase;
  const headBranch = sh("git rev-parse --abbrev-ref HEAD");
  if (headBranch === baseBranch) {
    throw new Error(`Refusing to open PR from ${baseBranch}. Checkout a feature branch.`);
  }
  return { baseBranch, headBranch };
}

function getCommits(baseBranch, headBranch) {
  sh(`git fetch origin ${baseBranch}:${baseBranch} --quiet || true`);
  const log = sh(`git log ${baseBranch}..${headBranch} --pretty=format:%H%x09%s`);
  if (!log) return [];
  return log.split("\n").map(line => {
    const [hash, subjectLine] = line.split("\t");
    return { hash, subjectLine };
  });
}

function getFileChanges(baseBranch, headBranch) {
  const raw = sh(`git diff --name-status ${baseBranch}...${headBranch}`);
  const files = raw
    ? raw.split("\n").map(l => {
        const [status, ...rest] = l.split("\t");
        return { status, path: rest.join("\t") };
      })
    : [];
  const stat = sh(`git diff --stat ${baseBranch}...${headBranch}`) || "";
  return { files, stat };
}

function pickTitle(commits) {
  const precedence = ["feat", "fix", "docs", "refactor", "test", "ci", "build", "chore"];
  const parsed = commits.map(c => ({ ...c, h: parseHeader(c.subjectLine) }));

  for (const t of precedence) {
    const match = parsed.find(p => p.h.type === t);
    if (match && match.h.subject) {
      const scope = match.h.scope ? `(${match.h.scope})` : "";
      return `${match.h.type}${scope}: ${match.h.subject}`.slice(0, 72);
    }
  }

  const branch = sh("git rev-parse --abbrev-ref HEAD");
  return `chore(pr): ${branch}`.slice(0, 72);
}

module.exports = {
  sh,
  parseHeader,
  getRepo,
  getBranchInfo,
  getCommits,
  getFileChanges,
  pickTitle,
};
