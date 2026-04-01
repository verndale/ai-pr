# @verndale/ai-pr

Deterministic GitHub **pull request** creation with an optional **AI-bounded** summary section. Generated copy is validated so each summary bullet references real short commit hashes from the branch range.

## Requirements

- **Node.js** `>=24.14.0`
- **pnpm** (`packageManager` is pinned in `package.json`; enable via Corepack: `corepack enable`)

## Install

```bash
pnpm add -D @verndale/ai-pr
```

## Environment

The CLI loads **`.env`** then **`.env.local`** from the current working directory (project root); values in `.env.local` override `.env` for the same key.

| Variable | Required | Description |
|----------|----------|-------------|
| `GH_TOKEN` or `GITHUB_TOKEN` | Yes | GitHub PAT with `repo` scope (use a bot token in CI if branch protection requires it) |
| `PR_BASE_BRANCH` | No | Base branch (default `main`) |
| `PR_DRAFT` | No | `true` / `false` — create PR as draft (default `true`) |
| `PR_AI` | No | Set to `true` to enable AI summary (requires endpoint + API key) |
| `PR_AI_ENDPOINT` | If `PR_AI=true` | e.g. `https://api.openai.com/v1/responses` or your gateway |
| `PR_AI_API_KEY` | If `PR_AI=true` | Bearer token for the endpoint |
| `PR_AI_MODEL` | No | Model id (default `default`) |

### AI behavior

- AI may only fill the **Summary (AI, bounded)** section with markdown bullets (`- `…).
- Each bullet must include at least one **allowed** 7-character commit hash from the PR range; invented hashes cause validation to fall back to the deterministic placeholder.
- A second optional call may append **Suggested labels / Review checklist** markdown.

## Commands

| Command | Purpose |
|---------|---------|
| `pnpm exec ai-pr` | From a feature branch, create or update an open PR against `PR_BASE_BRANCH` (default `main`) |

**Example** (`package.json`):

```json
{
  "scripts": {
    "pr:create": "ai-pr"
  }
}
```

## Development (this repository)

```bash
corepack enable
pnpm install
pnpm exec husky
```

The **`husky`** step sets `core.hooksPath` for this checkout (it is not part of the published `@verndale/ai-pr` package). Omit it if you only need the CLI, not Git hooks.

Copy `.env.example` to `.env` and set **`GH_TOKEN`**. On a feature branch with commits ahead of `main`, run **`pnpm pr`**.

### Commits (maintainers — not shipped in `@verndale/ai-pr`)

This repo’s **devDependencies** include [**@verndale/ai-commit**](https://www.npmjs.com/package/@verndale/ai-commit) for [Conventional Commits](https://www.conventionalcommits.org/) and commitlint-aligned hooks. The **published npm package** is still only the **`ai-pr` CLI** (`bin/` + `lib/`); `ai-commit` is for working **in this repository**, not for consumers of `@verndale/ai-pr`.

| Command | Purpose |
|---------|---------|
| `pnpm run commit` | Stage changes, then run **`ai-commit`** (`run`). Prefer this form (see below). |
| `git commit` | Uses `.husky/prepare-commit-msg` and `.husky/commit-msg` with the same rules. |

Set **`OPENAI_API_KEY`** (and optional **`COMMIT_AI_MODEL`**) in `.env` (see `ai-commit` docs). Hooks use **`ai-commit`**’s bundled preset; add a root **`commitlint.config.cjs`** only if you want editor extensions or `commitlint` CLI to use the same rules.

**Why `pnpm commit` can fail with `ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL`:** pnpm may resolve that as “run a binary named `commit`” (`pnpm exec commit`) instead of the **`commit` npm script**—and there is no `commit` binary. **`pnpm run commit`** always runs the script in `package.json`. Also avoid a **`:`** in the project directory name (e.g. `@verndale:ai-pr`); on some setups pnpm cannot put `node_modules/.bin` on `PATH`, which breaks `pnpm exec` and similar. Use a path like **`ai-pr`** for the repo folder.

### Repository automation

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `.github/workflows/pr.yml` | Pushes to non-`main`, `workflow_dispatch` | Dogfood: install deps, run **`pnpm exec ai-pr`** |
| `.github/workflows/release.yml` | Push to **`main`** | **semantic-release** — version bump, `CHANGELOG.md`, git tag, npm publish (with provenance), GitHub Release |

Set **`PR_BOT_TOKEN`** (classic PAT with `repo`) if the default `GITHUB_TOKEN` cannot open PRs across your org’s rules.

## Publishing (maintainers)

Releases are automated with **semantic-release** on every push to **`main`** (see `.releaserc.json`).

### Secrets and registry

- **`NPM_TOKEN`** — must allow **`npm publish`** this package in CI without an interactive OTP. Use an **Automation** classic token or a granular token with **Bypass 2FA** for publishing, or complete **Trusted Publishing** for this repo on npm.
- **`GITHUB_TOKEN`** — provided by Actions. If **`main`** is protected and the default token cannot push release commits, add **`SEMANTIC_RELEASE_TOKEN`** (PAT with **Contents** write).

**npm provenance:** `@semantic-release/npm` is configured with `"provenance": true`. Link **Trusted Publishing** on npm to **`verndale/ai-pr`**, or set `"provenance": false` temporarily if publish fails until setup is complete.

## License

MIT — see [LICENSE](LICENSE).
