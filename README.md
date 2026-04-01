# @verndale/ai-pr

Deterministic GitHub **pull request** creation with an optional **AI-bounded** summary section. Generated copy is validated so each summary bullet references real short commit hashes from the branch range.

## Requirements

- **Node.js** `>=24.14.0`
- **pnpm** (`packageManager` is pinned in `package.json`; enable via Corepack: `corepack enable`)

## Install

```bash
pnpm add -D @verndale/ai-pr
```

The same package works with **npm** or **yarn** (for example `npm install -D @verndale/ai-pr`); use your package manager’s `exec` / `npx` equivalent where the docs show `pnpm exec`.

## Quick setup (deterministic order)

1. **Install** the dev dependency (see [Install](#install)).
2. **Init** — From the **git repo root** (where **`package.json`** lives), run **`pnpm exec ai-pr init`**. That merges **`.env`** and **`.env-example`** (creates **`.env-example`** from the bundled template if it is missing; see [`.env-example`](.env-example) for keys and comments) and adds the recommended **`pr:create`** script to **`package.json`** when the file exists and the merge is enabled. **Install dependencies** afterward if **`package.json`** changed (`pnpm install`, `npm install`, etc.).
   - **Env files only?** Use **`pnpm exec ai-pr init --env-only`**.
   - **Skip `package.json`?** Use **`pnpm exec ai-pr init --husky`** (same flag name as [**@verndale/ai-commit**](https://www.npmjs.com/package/@verndale/ai-commit); this package does **not** install Husky or Git hooks — the flag only skips the **`pr:create`** script merge). To merge **`package.json`** again while using **`--husky`**, add **`--workspace`** (same as ai-commit: **`--husky --workspace`**).
3. **Secrets** — If you run the CLI **locally**, set **`GH_TOKEN`** or **`GITHUB_TOKEN`** in **`.env`** / **`.env.local`** (overrides apply for duplicate keys). If you only create PRs **in GitHub Actions**, supply the token via the workflow (for example map a secret to **`GH_TOKEN`**) — you do not need a local **`.env`** for that.

Use **`ai-pr init --force`** to replace **`.env`** and **`.env-example`** with the bundled template (destructive). Without **`--force`**, **init** creates **`.env-example`** when missing and otherwise appends missing **`@verndale/ai-pr`** keys (same as **`.env`**). The published template file is **`.env-example`** (hyphen, not **`.env.example`**).

**Script name:** Use **`pr:create`** in consuming repos so commands match this package and internal docs. The CLI binary remains **`ai-pr`**; only the npm script key is standardized. **`ai-pr init`** adds **`scripts.pr:create`** when absent (see **`verndale.aiPr`** in this package’s `package.json`).

Run **`pnpm run pr:create`** (or **`npm run pr:create`**). Prefer that over bare **`pnpm exec ai-pr`** so script names stay consistent in scripts, CI, and runbooks.

**You cannot enforce this from npm** — each repository owns its `package.json`. To align teams: use **org starter templates**, **`ai-pr init`**, or a **CI check** that `package.json` includes `scripts["pr:create"]` (for example `node -e "require('./package.json').scripts['pr:create'] || process.exit(1)"`). This package publishes **`verndale.aiPr`** metadata (`recommendedScriptName` / `recommendedScriptCommand`) if internal tooling wants to read the convention programmatically via `require('@verndale/ai-pr/package.json').verndale`.

For **Git hooks** and conventional commits, use [**@verndale/ai-commit**](https://www.npmjs.com/package/@verndale/ai-commit) and **`ai-commit init`** — not **`ai-pr init`**.

## Environment

The CLI loads **`.env`** then **`.env.local`** from the **current working directory** (run it from the repo root). Values in **`.env.local`** override **`.env`** for the same key.

Copy **[`.env-example`](.env-example)** to **`.env`** and fill in what you need, or run **`pnpm exec ai-pr init`** so missing keys are merged from the bundled template.

- **Shared env vars** — If another tool already documents **`GH_TOKEN`** or **`PR_*`**, **`ai-pr init`** adds its own `# @verndale/ai-pr — …` line immediately above the assignment when missing; it does not remove or replace existing comment lines.

### `@verndale/ai-pr` (published CLI)

| Variable | Required | Description |
|----------|----------|-------------|
| `GH_TOKEN` or `GITHUB_TOKEN` | Yes, whenever the CLI runs | GitHub PAT with **`repo`** scope — set in **`.env`** for local runs, or in the **workflow env** for CI. In Actions, map a bot PAT to `GH_TOKEN` if the default `GITHUB_TOKEN` cannot open or update PRs under your rules. |
| `PR_BASE_BRANCH` | No | Base branch to merge into (default **`main`**). |
| `PR_DRAFT` | No | If **`true`** (default), new PRs are created as drafts. Any other value is treated as not draft. Comparison is case-insensitive. |
| `PR_AI` | No | Set to **`true`** (case-insensitive) to enable the AI summary and optional labels/checklist block. If unset or not `true`, only deterministic PR body content is used. |
| `PR_AI_ENDPOINT` | If `PR_AI=true` | HTTP URL for the AI API (e.g. OpenAI **Responses**-compatible `…/v1/responses` or your gateway). Required whenever `PR_AI` is enabled. |
| `PR_AI_API_KEY` | If `PR_AI=true` | Bearer token sent as `Authorization: Bearer …`. Required whenever `PR_AI` is enabled. |
| `PR_AI_MODEL` | No | Model id passed through to the API (default string **`default`**). |

**Branch selection:** The **head** branch is always the **current Git branch** from Git (`git rev-parse --abbrev-ref HEAD`). It is not configured via an environment variable. Checkout the branch you want to PR before running the CLI.

#### AI behavior

- AI may only fill the **Summary (AI, bounded)** section with markdown bullets (`- `…).
- Each bullet must include at least one **allowed** 7-character commit hash from the PR range; invented hashes cause validation to fall back to the deterministic placeholder.
- A second optional call may append **Suggested labels / Review checklist** markdown.

### Maintainers — `@verndale/ai-commit` (this repository only)

Not part of the published **`@verndale/ai-pr`** package. Used for **`pnpm run commit`** and Husky hooks.

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | For AI-generated commit messages | See [**@verndale/ai-commit**](https://www.npmjs.com/package/@verndale/ai-commit). |
| `COMMIT_AI_MODEL` | No | Optional model override for `ai-commit`. |

### GitHub Actions (`.github/workflows/pr.yml`)

The workflow sets **`GH_TOKEN`** from the **`PR_BOT_TOKEN`** secret and passes optional AI settings from **repository variables** / **secrets**:

| Set in GitHub | Becomes |
|---------------|---------|
| Secret **`PR_BOT_TOKEN`** | `GH_TOKEN` |
| Variable **`PR_AI`** | `PR_AI` |
| Variable **`PR_AI_ENDPOINT`** | `PR_AI_ENDPOINT` |
| Variable **`PR_AI_MODEL`** | `PR_AI_MODEL` |
| Secret **`PR_AI_API_KEY`** | `PR_AI_API_KEY` |

Workflow inputs / context also set **`PR_BASE_BRANCH`**, **`PR_DRAFT`**, and a **`PR_HEAD_BRANCH`** value for the job; the CLI does not read **`PR_HEAD_BRANCH`**—the checked-out ref determines the head branch in CI.

## Commands

| Command | Purpose |
|---------|---------|
| `pnpm run pr:create` | **In this repository:** create or update an open PR against `PR_BASE_BRANCH` (default `main`). The root package’s `bin` is not linked into `node_modules/.bin`, so use this script instead of `pnpm exec ai-pr`. |
| `pnpm exec ai-pr` | Directly invokes the **`ai-pr`** binary (same as the **`pr:create`** script). Prefer **`pnpm run pr:create`** when that script exists. |
| `pnpm exec ai-pr init [--force] [--env-only] [--husky] [--workspace]` | Merge **`.env`** / **`.env-example`**, optionally add **`pr:create`** to **`package.json`**. **`--env-only`** stops after env files. **`--husky`** skips **`package.json`** (no Husky installed). **`--husky --workspace`** includes **`package.json`** again. **`--force`** replaces env files with the bundled template. |
| `ai-pr` / `ai-pr run` | Same as **`pr:create`** when run via **`node_modules/.bin`**. |

## Development (this repository)

```bash
corepack enable
pnpm install
pnpm exec husky
```

The **`husky`** step sets `core.hooksPath` for this checkout (it is not part of the published `@verndale/ai-pr` package). Omit it if you only need the CLI, not Git hooks.

Copy **[`.env-example`](.env-example)** to **`.env`** (or run **`pnpm exec ai-pr init`**) and set **`GH_TOKEN`** if you run the CLI locally. On a feature branch with commits ahead of `main`, run **`pnpm run pr:create`**.

### Commits (maintainers — not shipped in `@verndale/ai-pr`)

This repo’s **devDependencies** include [**@verndale/ai-commit**](https://www.npmjs.com/package/@verndale/ai-commit) for [Conventional Commits](https://www.conventionalcommits.org/) and commitlint-aligned hooks. The **published npm package** is still only the **`ai-pr` CLI** (`bin/` + `lib/`); `ai-commit` is for working **in this repository**, not for consumers of `@verndale/ai-pr`.

| Command | Purpose |
|---------|---------|
| `pnpm run commit` | Stage changes, then run **`ai-commit`** (`run`). Prefer this form (see below). |
| `git commit` | Uses `.husky/prepare-commit-msg` and `.husky/commit-msg` with the same rules. |

Hooks use **`ai-commit`**’s bundled preset; add a root **`commitlint.config.cjs`** only if you want editor extensions or `commitlint` CLI to use the same rules. Use the **`OPENAI_API_KEY`** / **`COMMIT_AI_MODEL`** row in **Maintainers — `@verndale/ai-commit`** above.

**Why `pnpm commit` can fail with `ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL`:** pnpm may resolve that as “run a binary named `commit`” (`pnpm exec commit`) instead of the **`commit` npm script**—and there is no `commit` binary. **`pnpm run commit`** always runs the script in `package.json`. Also avoid a **`:`** in the project directory name (e.g. `@verndale:ai-pr`); on some setups pnpm cannot put `node_modules/.bin` on `PATH`, which breaks `pnpm exec` and similar. Use a path like **`ai-pr`** for the repo folder.

### Repository automation

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `.github/workflows/pr.yml` | Pushes to non-`main`, `workflow_dispatch` | Dogfood: install deps, run **`pnpm run pr:create`** |
| `.github/workflows/release.yml` | Push to **`main`** | **semantic-release** — version bump, `CHANGELOG.md`, git tag, npm publish (with provenance), GitHub Release |

Add repository secret **`PR_BOT_TOKEN`** (classic PAT with **`repo`**) and any AI variables from **GitHub Actions** in the Environment section if the default `GITHUB_TOKEN` is not enough or you want AI in CI.

## Publishing (maintainers)

Releases are automated with **semantic-release** on every push to **`main`** (see `.releaserc.json`).

### Secrets and registry

- **`NPM_TOKEN`** — must allow **`npm publish`** this package in CI without an interactive OTP. Use an **Automation** classic token or a granular token with **Bypass 2FA** for publishing, or complete **Trusted Publishing** for this repo on npm.
- **`GITHUB_TOKEN`** — provided by Actions. If **`main`** is protected and the default token cannot push release commits, add **`SEMANTIC_RELEASE_TOKEN`** (PAT with **Contents** write).

**npm provenance:** `@semantic-release/npm` is configured with `"provenance": true`. Link **Trusted Publishing** on npm to **`verndale/ai-pr`**, or set `"provenance": false` temporarily if publish fails until setup is complete.

## License

MIT — see [LICENSE](LICENSE).
