"use strict";

function buildBody({ title, commits, fileChanges, baseBranch, headBranch }) {
  const commitLines = commits.map(c => `- ${c.hash.slice(0, 7)} ${c.subjectLine}`);
  const fileLines = fileChanges.files.length
    ? fileChanges.files.map(f => `- \`${f.status}\` ${f.path}`)
    : ["- None"];

  return [
    `# ${title}`,
    ``,
    `## Summary (AI, bounded)`,
    `- _Reserved slot (AI may fill this)_`,
    ``,
    `## Changes`,
    ...commitLines,
    ``,
    `## Files changed`,
    ...fileLines,
    ``,
    `## Diff stats`,
    "```",
    fileChanges.stat || "(no diff)",
    "```",
    ``,
    `## Testing`,
    `- [ ] Manual smoke test`,
    `- [ ] CI green`,
    ``,
    `## Risk / Impact`,
    `- Risk level: Low / Medium / High`,
    `- Rollback plan:`,
    ``,
    `Base: \`${baseBranch}\`  →  Head: \`${headBranch}\``,
  ].join("\n");
}

function replaceSummarySection(body, summaryBullets) {
  const replacement = ["## Summary (AI, bounded)", ...summaryBullets, ""].join("\n");
  return body.replace(/## Summary \(AI, bounded\)[\s\S]*?\n\n/, `${replacement}\n`);
}

module.exports = {
  buildBody,
  replaceSummarySection,
};
