# @verndale/ai-pr

Deterministic GitHub **pull request** creation with an optional **AI-bounded** summary section. Generated copy is validated so each summary bullet references real short commit hashes from the branch range.

---

## Requirements

| Requirement | Notes |
| --- | --- |
| **Node.js** | `>=24.14.0` (see `engines` in `package.json`) |
| **Package manager** | This repo pins **pnpm** in `package.json`. Enable with [Corepack](https://nodejs.org/api/corepack.html): `corepack enable`. |

---

## Quick start

Do this **from the directory that contains your app’s `package.json`** (in a monorepo that is often **not** the git repository root).

1. **Add the dependency**

   ```bash
   pnpm add -D @verndale/ai-pr
   ```

   **npm** and **yarn** work too (`npm install -D @verndale/ai-pr`). Where this doc says `pnpm exec`, use `npx`, `yarn exec`, or your usual equivalent.

2. **Run init** (merges env files, adds **`pr:create`** when missing, installs **`.github/workflows/pr.yml`** when missing)

   ```bash
   pnpm exec ai-pr init
   ```

3. **Install dependencies** if init changed `package.json` — init may print a reminder to run **`pnpm install`** / **`npm install`** (it picks **pnpm** / **npm** / **yarn** / **bun** from the nearest lockfile).

4. **Set tokens** in **`.env`** and/or **`.env.local`** (under the **package root** after init — see [How paths work](#how-paths-work)). Copy **[`.env-example`](.env-example)** or rely on init’s merge; set **`GH_TOKEN`** or **`GITHUB_TOKEN`** for local CLI runs, and optional **`PR_*`** / AI variables as needed. If both files define the same key, **`.env.local`** wins.

5. **Create or update the PR** with **`pnpm run pr:create`** (or **`npm run pr:create`**). Run from the directory whose **`.env`** / **`.env.local`** should load (see [How paths work](#how-paths-work)). Prefer **`pnpm run pr:create`** over bare **`pnpm exec ai-pr`** so names stay consistent in scripts, CI, and runbooks.

**Secrets:** If you only create PRs **in GitHub Actions**, supply the token in the workflow — you do not need a local **`.env`** for that. After **`init`**, the CLI prints **Next steps** (secret **`PR_BOT_TOKEN`**, optional AI vars, lockfile reminders).

---

## How paths work

| Term | Meaning |
| --- | --- |
| **Package root** | [`findPackageRoot`](lib/init-paths.js) walks from the current working directory toward the git root; the first directory with **`package.json`** wins (if there is no git root, **`cwd`** is used). Init uses this for merging **`.env`** / **`.env.local`**, updating **`package.json`**, and resolving the example env path. |
| **Git root** | Used for installing **[`.github/workflows/pr.yml`](.github/workflows/pr.yml)** at the repository root. In [`bin/cli.js`](bin/cli.js), **`workflowBase`** is **`gitRoot || packageRoot`**, so the workflow lands at the git root when you are in a repo. |
| **Run vs init** | **`ai-pr`** / **`ai-pr run`** loads **`.env`** then **`.env.local`** from the **current working directory** only ([`cmdRun`](bin/cli.js) uses `dotenv` with default paths). That differs from **`ai-pr init`**, which resolves env files under the **package root**. In a monorepo, run the CLI from the directory whose **`.env`** you intend to load, or rely on CI — **init** does not change where **`run`** looks for env files. |
| **Example env file** | [`resolveEnvExamplePath`](lib/init-paths.js) prefers **`.env.example`**, else **`.env-example`**, and prints a warning if both exist. The published template in the package remains hyphenated: **[`.env-example`](.env-example)**. |

---

## What `ai-pr init` does (default)

### Environment

- Merges **@verndale/ai-pr** keys into **`.env.local`** if that file exists; otherwise into **`.env`** (creates **`.env`** from the bundled template when missing). **`--force`** does not wholesale-replace **`.env.local`** (keys are merged / documented only).
- Updates the **example env file** on disk: [`resolveEnvExamplePath`](lib/init-paths.js) chooses **`.env.example`** or **`.env-example`** as above; if both dot forms exist, **`.env.example`** is used and a warning is printed.
- The **npm package** ships the hyphenated template as **[`.env-example`](.env-example)**.

### `package.json` (at package root)

- Adds **`scripts.pr:create`** when absent (runs **`ai-pr`**). Skipped with **`--env-only`** or **`--husky`** without **`--workspace`**.

### Workflow

- Writes the bundled **`.github/workflows/pr.yml`** when **`pr.yml`** is missing (**pnpm** or **npm** template: **`pnpm run pr:create`** / **`npm run pr:create`**). Template follows **`packageManager`** / lockfiles, or **`--pnpm`**, **`--npm`**, **`--workflow=`**. **`--force`** can overwrite an existing workflow. Skipped with **`--env-only`**.

If **`package.json`** changed, run **`pnpm install`** or **`npm install`** again.

---

## Init flags

| Flag | Use when |
| --- | --- |
| *(none)* | Env merge + **`pr:create`** in **`package.json`** when the file exists and merge is enabled + install **`.github/workflows/pr.yml`** when missing. |
| **`--env-only`** | Env / example file only — no **`package.json`**, no workflow file. |
| **`--husky`** | Skips **`package.json`** (same flag name as [**@verndale/ai-commit**](https://www.npmjs.com/package/@verndale/ai-commit); this package does **not** install Husky). Workflow **`pr.yml`** is still installed when missing. Combine with **`--workspace`** if you need **`package.json`** merged again. |
| **`--force`** | Replace **`.env`** / the resolved example file with the built-in template **and** overwrite **`.github/workflows/pr.yml`** if it exists (**destructive**), subject to **`.env.local`** merge rules above. |
| **`--pnpm`**, **`--npm`**, **`--workflow=pnpm`**, **`--workflow=npm`** | Force which bundled workflow template is used (otherwise: **`packageManager`** in **`package.json`**, then **`pnpm-lock.yaml`** / **`package-lock.json`**, default **pnpm**). |

### When behavior differs

| Situation | Behavior |
| --- | --- |
| Without **`--force`** | Missing **`.env-example`** / resolved example is created; otherwise missing **@verndale/ai-pr** keys are **appended** to **`.env`** and the example file without wiping existing values. **`pr.yml`** is written only if **`.github/workflows/pr.yml`** does not exist. |
| **npm workflow** | Uses **`npm ci`** — commit **`package-lock.json`**. |
| **pnpm workflow** | Uses **`pnpm install --frozen-lockfile`** — commit **`pnpm-lock.yaml`**. |
| Template filename | The reference file is **`.env-example`** (hyphen), not **`.env.example`**, unless you only use **`.env.example`** (see [How paths work](#how-paths-work)). |
| Git hooks / commits | For **Git hooks** and conventional commits, use [**@verndale/ai-commit**](https://www.npmjs.com/package/@verndale/ai-commit) and **`ai-commit init`** — not **`ai-pr init`**. |

---

## Command cheat sheet

```bash
pnpm add -D @verndale/ai-pr
pnpm exec ai-pr init
# Set GH_TOKEN / GITHUB_TOKEN in .env or .env.local for local CLI runs (see How paths work)
```

Optional variants:

```bash
pnpm exec ai-pr init --env-only
pnpm exec ai-pr init --husky
pnpm exec ai-pr init --husky --workspace
pnpm exec ai-pr init --force
pnpm exec ai-pr init --npm
pnpm exec ai-pr init --workflow=pnpm
```

---

## Environment variables

The **`run`** command loads **`.env`**, then **`.env.local`** from the **current working directory** (later file wins on duplicate keys). **`init`** merges under the **package root** — see [How paths work](#how-paths-work).

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

---

## CLI reference

| Command | Purpose |
| --- | --- |
| **`pnpm run pr:create`** | Create or update an open PR against **`PR_BASE_BRANCH`** (default **`main`**). Same as invoking the **`ai-pr`** binary from **`node_modules/.bin`** when your script is wired that way. |
| **`pnpm exec ai-pr`** | Directly invokes the **`ai-pr`** binary. Prefer **`pnpm run pr:create`** when that script exists so commands stay consistent. |
| **`pnpm exec ai-pr init`** | Env merge, optional **`package.json`** and workflow install. See [Init flags](#init-flags). |
| **`ai-pr`** / **`ai-pr run`** | Same as **`pr:create`** when run via **`node_modules/.bin`**. |

### `package.json` script (example)

```json
{
  "scripts": {
    "pr:create": "ai-pr"
  }
}
```

**Script name:** Use **`pr:create`** in consuming repos so commands match this package and internal docs. The CLI binary remains **`ai-pr`**. **You cannot enforce this from npm** — each repository owns its `package.json`. To align teams: use org starter templates, **`ai-pr init`**, or a CI check that `package.json` includes `scripts["pr:create"]`.

---

## GitHub Actions (`pr.yml`)

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

## Contributing

Local development, workflows in this repo, and publishing are documented in [CONTRIBUTING.md](./CONTRIBUTING.md).

---

## License

MIT — see [LICENSE](./LICENSE).
