# @verndale/ai-pr

Deterministic GitHub **pull request** creation with an optional **AI-bounded** summary section. Generated copy is validated so each summary bullet references real short commit hashes from the branch range.

---

## Requirements

| | |
| --- | --- |
| **Node.js** | `>=24.14.0` |
| **Package manager** | This repo pins **pnpm** in `package.json`. Enable with [Corepack](https://nodejs.org/api/corepack.html): `corepack enable`. |

---

## Install

```bash
pnpm add -D @verndale/ai-pr
```

**npm** and **yarn** work too (`npm install -D @verndale/ai-pr`). Where this doc says `pnpm exec`, use your tool’s equivalent (`npx`, `yarn exec`, etc.).

---

## Setup

Do these **in order** from your **git repository root** (the directory that contains `package.json`).

### 1. Install the package

See [Install](#install).

### 2. Run init

```bash
pnpm exec ai-pr init
```

**What init does (by default):**

| Action | Detail |
| --- | --- |
| Env files | Merges **`.env`** and **`.env-example`**; creates **`.env-example`** when missing. The **@verndale/ai-pr** keys are defined in code; **[`.env-example`](.env-example)** in the package matches that template for reference. |
| `package.json` | Adds **`scripts.pr:create`** when absent (see **`verndale.aiPr`** in this package’s `package.json`). |

If **`package.json`** changed, run **`pnpm install`** (or `npm install`) again.

**Secrets:** If you run the CLI **locally**, set **`GH_TOKEN`** or **`GITHUB_TOKEN`** in **`.env`** / **`.env.local`**. If you only create PRs **in GitHub Actions**, supply the token in the workflow — you do not need a local **`.env`** for that.

### 3. Run PR create

Use **`pnpm run pr:create`** (or **`npm run pr:create`**). Prefer that over bare **`pnpm exec ai-pr`** so script names stay consistent in scripts, CI, and runbooks.

**Script name:** Use **`pr:create`** in consuming repos so commands match this package and internal docs. The CLI binary remains **`ai-pr`**. **You cannot enforce this from npm** — each repository owns its `package.json`. To align teams: use org starter templates, **`ai-pr init`**, or a CI check that `package.json` includes `scripts["pr:create"]`.

---

### Init: flags and shortcuts

| Flag | Use when |
| --- | --- |
| *(none)* | Env merge + **`pr:create`** in **`package.json`** when the file exists and merge is enabled. |
| `--env-only` | You only want env / **`.env-example`** updates — no **`package.json`** merge. |
| `--husky` | Skips **`package.json`** (same flag name as [**@verndale/ai-commit**](https://www.npmjs.com/package/@verndale/ai-commit); this package does **not** install Husky). Combine with **`--workspace`** if you need **`package.json`** merged again. |
| `--force` | Replace **`.env`** and **`.env-example`** with the built-in **@verndale/ai-pr** template **(destructive)**. |

**Edge cases**

| Situation | Behavior |
| --- | --- |
| Without **`--force`** | Missing **`.env-example`** is created; otherwise missing **@verndale/ai-pr** keys are **appended** to **`.env`** and **`.env-example`** without wiping the file. |
| Template filename | The reference file is **`.env-example`** (hyphen), not **`.env.example`**. |
| Git hooks / commits | For **Git hooks** and conventional commits, use [**@verndale/ai-commit**](https://www.npmjs.com/package/@verndale/ai-commit) and **`ai-commit init`** — not **`ai-pr init`**. |

---

### Setup — command cheat sheet

```bash
pnpm add -D @verndale/ai-pr
pnpm exec ai-pr init
# Set GH_TOKEN / GITHUB_TOKEN in .env or .env.local for local CLI runs
```

Optional variants:

```bash
pnpm exec ai-pr init --env-only
pnpm exec ai-pr init --husky
pnpm exec ai-pr init --husky --workspace
pnpm exec ai-pr init --force
```

---

## Environment variables

The CLI loads **`.env`**, then **`.env.local`** from the **current working directory** (run from the repo root). Values in **`.env.local`** override **`.env`** for the same key.

Copy **[`.env-example`](.env-example)** to **`.env`** and fill in what you need, or run **`pnpm exec ai-pr init`** so missing keys are merged.

**Comments:** If another tool already documents **`GH_TOKEN`** or **`PR_*`**, **`ai-pr init`** inserts a `# @verndale/ai-pr — …` line above the assignment when that line is missing. It does not remove existing comments.

### `@verndale/ai-pr` (published CLI)

| Variable | Required | Description |
| --- | --- | --- |
| **`GH_TOKEN`** or **`GITHUB_TOKEN`** | Yes, whenever the CLI runs | GitHub PAT with **`repo`** scope — set in **`.env`** for local runs, or in the **workflow env** for CI. In Actions, map a bot PAT to **`GH_TOKEN`** if the default **`GITHUB_TOKEN`** cannot open or update PRs under your rules. |
| **`PR_BASE_BRANCH`** | No | Base branch to merge into (default **`main`**). |
| **`PR_DRAFT`** | No | If **`true`** (default), new PRs are drafts. Any other value is treated as not draft. Comparison is case-insensitive. |
| **`PR_AI`** | No | Set to **`true`** (case-insensitive) to enable the AI summary and optional labels/checklist. If unset or not `true`, only deterministic PR body content is used. |
| **`PR_AI_ENDPOINT`** | If `PR_AI=true` | HTTP URL for the AI API (e.g. OpenAI **Responses**-compatible `…/v1/responses` or your gateway). |
| **`PR_AI_API_KEY`** | If `PR_AI=true` | Bearer token sent as `Authorization: Bearer …`. |
| **`PR_AI_MODEL`** | No | Model id passed through to the API (default string **`default`**). |

**Branch selection:** The **head** branch is always the **current Git branch** from Git (`git rev-parse --abbrev-ref HEAD`). It is not configured via an environment variable. Checkout the branch you want to PR before running the CLI.

#### AI behavior

- AI may only fill the **Summary (AI, bounded)** section with markdown bullets (`- `…).
- Each bullet must include at least one **allowed** 7-character commit hash from the PR range; invented hashes cause validation to fall back to the deterministic placeholder.
- A second optional call may append **Suggested labels / Review checklist** markdown.

### Maintainers — `@verndale/ai-commit` (this repository only)

Not part of the published **`@verndale/ai-pr`** package. Used for **`pnpm run commit`** and Husky hooks.

| Variable | Required | Description |
| --- | --- | --- |
| **`OPENAI_API_KEY`** | For AI-generated commit messages | See [**@verndale/ai-commit**](https://www.npmjs.com/package/@verndale/ai-commit). |
| **`COMMIT_AI_MODEL`** | No | Optional model override for `ai-commit`. |

### GitHub Actions (`pr.yml`)

The workflow can set **`GH_TOKEN`** from the **`PR_BOT_TOKEN`** secret and pass optional AI settings from **repository variables** / **secrets**:

| Set in GitHub | Becomes |
| --- | --- |
| Secret **`PR_BOT_TOKEN`** | `GH_TOKEN` |
| Variable **`PR_AI`** | `PR_AI` |
| Variable **`PR_AI_ENDPOINT`** | `PR_AI_ENDPOINT` |
| Variable **`PR_AI_MODEL`** | `PR_AI_MODEL` |
| Secret **`PR_AI_API_KEY`** | `PR_AI_API_KEY` |

Workflow inputs / context also set **`PR_BASE_BRANCH`**, **`PR_DRAFT`**, and **`PR_HEAD_BRANCH`** for the job; the CLI does not read **`PR_HEAD_BRANCH`** — the checked-out ref determines the head branch in CI.

---

## CLI reference

| Command | Purpose |
| --- | --- |
| **`pnpm run pr:create`** | **In this repository:** create or update an open PR against **`PR_BASE_BRANCH`** (default **`main`**). The root package’s `bin` is not linked into `node_modules/.bin`, so use this script instead of **`pnpm exec ai-pr`**. |
| **`pnpm exec ai-pr`** | Directly invokes the **`ai-pr`** binary (same as the **`pr:create`** script). Prefer **`pnpm run pr:create`** when that script exists. |
| **`pnpm exec ai-pr init`** | Env merge (**`.env`** / **`.env-example`**), optionally add **`pr:create`**. See [flags](#init-flags-and-shortcuts). |
| **`ai-pr`** / **`ai-pr run`** | Same as **`pr:create`** when run via **`node_modules/.bin`**. |

---

## Development (this repository)

```bash
corepack enable
pnpm install
pnpm exec husky
```

The **`husky`** step sets `core.hooksPath` for this checkout (it is not part of the published **`@verndale/ai-pr`** package). Omit it if you only need the CLI, not Git hooks.

Copy **[`.env-example`](.env-example)** to **`.env`** (or run **`pnpm exec ai-pr init`**) and set **`GH_TOKEN`** if you run the CLI locally. On a feature branch with commits ahead of **`main`**, run **`pnpm run pr:create`**.

### Commits (maintainers — not shipped in `@verndale/ai-pr`)

This repo’s **devDependencies** include [**@verndale/ai-commit**](https://www.npmjs.com/package/@verndale/ai-commit) for [Conventional Commits](https://www.conventionalcommits.org/) and commitlint-aligned hooks. The **published npm package** is still only the **`ai-pr` CLI** (`bin/` + `lib/`); **`ai-commit`** is for working **in this repository**, not for consumers of **`@verndale/ai-pr`.

| Command | Purpose |
| --- | --- |
| **`pnpm run commit`** | Stage changes, then run **`ai-commit`** (`run`). Prefer this form. |
| **`git commit`** | Uses **`.husky/prepare-commit-msg`** and **`.husky/commit-msg`** with the same rules. |

Hooks use **`ai-commit`**’s bundled preset; add a root **`commitlint.config.cjs`** only if you want editor extensions or **`commitlint` CLI** to use the same rules. Use the **`OPENAI_API_KEY`** / **`COMMIT_AI_MODEL`** row in **Maintainers — `@verndale/ai-commit`** above.

**Why `pnpm commit` can fail with `ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL`:** pnpm may resolve that as **`pnpm exec commit`** instead of the **`commit`** npm script. **`pnpm run commit`** always runs the script in **`package.json`**. Also avoid a **`:`** in the project directory name on some setups.

### Repository automation

| Workflow | Trigger | Purpose |
| --- | --- | --- |
| [`.github/workflows/pr.yml`](.github/workflows/pr.yml) | Pushes to non-`main`, `workflow_dispatch` | Dogfood: install deps, run **`pnpm run pr:create`** |
| [`.github/workflows/release.yml`](.github/workflows/release.yml) | Push to **`main`** | **semantic-release** — version bump, **`CHANGELOG.md`**, git tag, npm publish (with provenance), GitHub Release |

Add repository secret **`PR_BOT_TOKEN`** (classic PAT with **`repo`**) and any AI variables from **GitHub Actions** if the default **`GITHUB_TOKEN`** is not enough or you want AI in CI.

---

## Publishing (maintainers)

Releases are automated with **semantic-release** on every push to **`main`** (see [`.releaserc.json`](.releaserc.json)).

### Secrets and registry

- **`NPM_TOKEN`** — must allow **`npm publish`** this package in CI without an interactive OTP. Use an **Automation** classic token or a granular token with **Bypass 2FA** for publishing, or complete **Trusted Publishing** for this repo on npm.
- **`GITHUB_TOKEN`** — provided by Actions. If **`main`** is protected and the default token cannot push release commits, add **`SEMANTIC_RELEASE_TOKEN`** (PAT with **Contents** write).

**npm provenance:** **`@semantic-release/npm`** is configured with **`"provenance": true`**. Link **Trusted Publishing** on npm to **`verndale/ai-pr`**, or set **`"provenance": false`** temporarily if publish fails until setup is complete.

---

## License

MIT — see [LICENSE](./LICENSE).
