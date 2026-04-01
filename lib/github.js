"use strict";

async function githubRequest({ method, url, token, body }) {
  const res = await fetch(url, {
    method,
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token}`,
      "x-github-api-version": "2022-11-28",
      "content-type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API ${method} ${url} failed: ${res.status}\n${text}`);
  }
  return res.json();
}

async function findExistingPr({ owner, repo, headBranch, token }) {
  const url = `https://api.github.com/repos/${owner}/${repo}/pulls?state=open&head=${owner}:${encodeURIComponent(
    headBranch
  )}`;
  const prs = await githubRequest({ method: "GET", url, token });
  return Array.isArray(prs) && prs.length ? prs[0] : null;
}

async function createOrUpdatePr({ owner, repo, baseBranch, headBranch, title, body, token, draft }) {
  const existing = await findExistingPr({ owner, repo, headBranch, token });

  if (existing) {
    const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${existing.number}`;
    const updated = await githubRequest({ method: "PATCH", url, token, body: { title, body } });
    return { action: "updated", pr: updated };
  }

  const url = `https://api.github.com/repos/${owner}/${repo}/pulls`;
  const created = await githubRequest({
    method: "POST",
    url,
    token,
    body: { title, body, head: headBranch, base: baseBranch, draft },
  });
  return { action: "created", pr: created };
}

module.exports = {
  githubRequest,
  findExistingPr,
  createOrUpdatePr,
};
