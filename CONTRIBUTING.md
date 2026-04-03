# Contributing to `@verndale/ai-pr`

This document is for **working in this repository** (local dev, our GitHub Actions, npm releases). For **installing and using** the published package in your own project, see [README.md](./README.md).

---

## Development

```bash
corepack enable
pnpm install
pnpm exec husky
```

The **`husky`** step sets `core.hooksPath` for this checkout — it is **not** part of the published **`@verndale/ai-pr`** package. Omit it if you only need the CLI, not Git hooks.

Copy **[`.env-example`](.env-example)** to **`.env`** (or run **`pnpm exec ai-pr init`**) and set **`GH_TOKEN`** if you run the CLI locally. On a feature branch with commits ahead of **`main`**, run **`pnpm run pr:create`**.

This repository wires the CLI as **`node ./bin/cli.js`** via the **`pr:create`** script in `package.json`. Published installs use the **`ai-pr`** binary under **`node_modules/.bin`**.

---

## Commits (maintainers)

This repo’s **devDependencies** include [**@verndale/ai-commit**](https://www.npmjs.com/package/@verndale/ai-commit) for [Conventional Commits](https://www.conventionalcommits.org/) and commitlint-aligned hooks. The **published npm package** is still only the **`ai-pr` CLI** (`bin/` + `lib/`); **`ai-commit`** is for working **in this repository**, not for consumers of **`@verndale/ai-pr`.

| Command | Purpose |
| --- | --- |
| **`pnpm run commit`** | Stage changes, then run **`ai-commit`** (`run`). Prefer this form. |
| **`git commit`** | Uses **`.husky/prepare-commit-msg`** and **`.husky/commit-msg`** with the same rules. |

Hooks use **`ai-commit`**’s bundled preset; add a root **`commitlint.config.cjs`** only if you want editor extensions or **`commitlint` CLI** to use the same rules. Set **`OPENAI_API_KEY`** (and optionally **`COMMIT_AI_MODEL`**) for AI-generated commit messages — see [**@verndale/ai-commit**](https://www.npmjs.com/package/@verndale/ai-commit).

**Why `pnpm commit` can fail with `ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL`:** pnpm may resolve that as **`pnpm exec commit`** instead of the **`commit`** npm script. **`pnpm run commit`** always runs the script in **`package.json`**. Also avoid a **`:`** in the project directory name on some setups.

---

## Repository automation

| Workflow | Trigger | Purpose |
| --- | --- | --- |
| [`.github/workflows/pr.yml`](.github/workflows/pr.yml) | Pushes to non-`main`, `workflow_dispatch` | Dogfood: install deps, run **`pnpm run pr:create`** |
| [`.github/workflows/release.yml`](.github/workflows/release.yml) | Push to **`main`** | **semantic-release** — version bump, **`CHANGELOG.md`**, git tag, npm publish (with provenance), GitHub Release |

Add repository secret **`PR_BOT_TOKEN`** (classic PAT with **`repo`**) and any AI variables described under [GitHub Actions (`pr.yml`)](./README.md#github-actions-pryml) if the default **`GITHUB_TOKEN`** is not enough or you want AI in CI.

**Local `pnpm run pr:create`:** set **`GH_TOKEN`** / **`GITHUB_TOKEN`** and **`PR_BASE_BRANCH`** / **`PR_HEAD_BRANCH`** as needed (see [Environment variables](./README.md#environment-variables)).

---

## Publishing (maintainers)

Releases run via **[semantic-release](https://github.com/semantic-release/semantic-release)** on push to **`main`** ([`.releaserc.json`](.releaserc.json)).

### Secrets and registry

- **`NPM_TOKEN`** (repo or org secret) — must allow **`npm publish`** in CI **without** an interactive OTP. The Release workflow sets **`NPM_TOKEN`** and **`NODE_AUTH_TOKEN`** from it.
  - **If the job fails with `EOTP` / “one-time password”:** 2FA is enforced on publish and the token cannot skip OTP. Fix in one of these ways:
    - **Classic token:** [npmjs.com](https://www.npmjs.com/) → **Access Tokens** → **Generate New Token** (classic) → type **Automation** (not “Publish”). Store as **`NPM_TOKEN`**.
    - **Granular token:** **New Granular Access Token** → enable **Bypass two-factor authentication (2FA)**. Under **Packages and scopes**, **Read and write** for **`@verndale/ai-pr`**. Leave **Allowed IP ranges** empty unless required (Actions egress is not a single fixed IP).
  - Or finish **[Trusted Publishing](https://docs.npmjs.com/trusted-publishers)** for this repo and package (OIDC); you may still need npm-side setup—see npm’s docs for your account.
- **`GITHUB_TOKEN`** — Provided by Actions. Checkout and **`@semantic-release/git`** use **`SEMANTIC_RELEASE_TOKEN`** when set; otherwise **`GITHUB_TOKEN`**.

**npm provenance:** [`.releaserc.json`](.releaserc.json) sets **`"provenance": true`** on **`@semantic-release/npm`**, which matches **npm Trusted Publishing** from this GitHub repo. On [npmjs.com](https://www.npmjs.com/), enable **Trusted Publishing** for this package linked to **`verndale/ai-pr`** (or your fork). If publish fails until that works, finish Trusted Publishing or temporarily set **`"provenance": false`** in **`.releaserc.json`** (you lose the provenance badge).

### Branch protection

semantic-release pushes a **release commit** and **tag** back to **`main`** via **`@semantic-release/git`**. If **`main`** is protected and the default token cannot push, either allow **GitHub Actions** to bypass protection for this repository, or add a PAT (classic: **`repo`**; fine-grained: **Contents** read/write) as **`SEMANTIC_RELEASE_TOKEN`**. The Release workflow passes **`SEMANTIC_RELEASE_TOKEN || GITHUB_TOKEN`** to checkout and to semantic-release as **`GITHUB_TOKEN`**.

### Commits that produce releases

**Conventional Commits** on **`main`** drive the analyzer (patch / minor / major) using each commit’s **first line**; PR bodies do not replace that.

With default [`.releaserc.json`](.releaserc.json) (no custom **`releaseRules`**), types like **`chore`**, **`docs`**, **`ci`**, **`style`**, **`test`**, **`build`** do **not** bump version or update **`CHANGELOG.md`**. For user-facing releases, use **`feat`**, **`fix`**, **`perf`**, **`revert`**, or breaking markers. With **squash merge**, the merged message is usually the **PR title**—keep it commitlint-clean.

To release from **`chore`**/**`docs`**-only merges, maintainers can add **`releaseRules`** to **`@semantic-release/commit-analyzer`** in **`.releaserc.json`**; the default skips those types so releases stay signal-heavy.

Tag-only npm publish was removed in favor of this flow to avoid double publishes. **Local try:** `pnpm release` (needs tokens and git state; use a fork or **`--dry-run`** as appropriate).
