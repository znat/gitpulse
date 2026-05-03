# gitpulse

**An editorial story feed for your repo's pull requests and direct pushes — published to GitHub Pages, Vercel, Netlify, or anywhere else you serve a static site.**

Every push, gitpulse walks your default branch, classifies each commit, writes a short editorial-style story for each, and rebuilds a static feed at your chosen URL.

No database. No external services beyond GitHub and your LLM provider.

> See it running on this repo: **https://znat.github.io/gitpulse/**

---

## How it works

Two pieces:

1. **`@gitpulse/cli`** — a tiny CLI on npm with two subcommands:
   - `gitpulse analyze` walks git history, calls an LLM for each new commit, writes JSON to `./.gitpulse/data/`.
   - `gitpulse build` clones the matching gitpulse site at runtime, injects your data, runs `next export`, writes a static site to `./.gitpulse/out/`.
2. **A static deploy** — Pages, Vercel, Netlify, S3, whatever serves HTML.

State is the deployed site itself. Each run fetches the previous `data/manifest.json` from your live URL, picks up where it left off, and only analyzes new commits. No database, no separate branch, no artifact chain.

---

## Quickstart

> Pre-1.0 — the CLI is at `0.x.y` and consumers pin `@gitpulse/cli@0` (npm) and `znat/gitpulse/.github/workflows/publish-pages.yaml@v0` (workflow). When the API stabilises, both move to `@1` / `@v0`.

You'll need a repository secret `OPENAI_API_KEY` (or whichever provider's key — see [LLM providers](#llm-providers) below).

### GitHub Pages — one-liner

In your repo's **Settings → Pages → Source: GitHub Actions**, then drop this in `.github/workflows/gitpulse.yml`:

```yaml
name: Gitpulse

on:
  push:
    branches: [main]
  release:
    types: [published]
  workflow_dispatch:

jobs:
  publish:
    uses: znat/gitpulse/.github/workflows/publish-pages.yaml@v0
    secrets: inherit
```

That's it. First run bootstraps from the last 30 days of history; subsequent runs are incremental.

### Vercel — build hook (no GitHub Actions)

Vercel auto-builds on every push if you connect the repo. Make gitpulse part of that build:

```json
// package.json
{
  "scripts": {
    "build": "gitpulse analyze && gitpulse build && next build"
  },
  "devDependencies": {
    "@gitpulse/cli": "^0"
  }
}
```

In Vercel's **Project Settings → Environment Variables**, set:

| Var | Value |
|---|---|
| `OPENAI_API_KEY` | Your provider key |
| `GITHUB_TOKEN` | A fine-grained token with `contents: read` on the repo (so the analyzer can fetch PR / release context) |
| `GITPULSE_BASE_PATH` | `none` (Vercel serves at root, not `/<repo>/`) |
| `GITPULSE_SITE_URL` | Your production URL (e.g. `https://my.app`) |

For Vercel's auto-detection to find `next build` output, make sure the framework preset is "Next.js" and the build output is `out` (or however your `next.config.js` is configured).

### Netlify — build hook

Same shape. In `netlify.toml`:

```toml
[build]
  command = "npx -y @gitpulse/cli@0 analyze && npx -y @gitpulse/cli@0 build"
  publish = ".gitpulse/out"

[build.environment]
  GITPULSE_BASE_PATH = "none"
  GITPULSE_SITE_URL = "https://my.netlify.app"
```

Set `OPENAI_API_KEY` and `GITHUB_TOKEN` in the Netlify dashboard's environment variables.

### Cloudflare Pages — build hook

In the Cloudflare Pages project:

- **Build command**: `npx -y @gitpulse/cli@0 analyze && npx -y @gitpulse/cli@0 build`
- **Build output directory**: `.gitpulse/out`
- **Environment variables**: same set as Vercel/Netlify above (`GITPULSE_BASE_PATH=none`, etc.)

### Anywhere else (S3, GitLab CI, custom Pages)

The CLI takes env vars, writes JSON, builds a static site. Wire it into whatever pipeline you have:

```yaml
# Generic GitHub Actions example for non-Pages targets
- uses: actions/checkout@v6
  with: { fetch-depth: 0 }
- uses: actions/setup-node@v6
  with: { node-version: 22 }

- run: npx -y @gitpulse/cli@0 analyze
  env:
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
    GITHUB_TOKEN:   ${{ secrets.GITHUB_TOKEN }}

- run: npx -y @gitpulse/cli@0 build
  env:
    GITPULSE_BASE_PATH: none
    GITPULSE_SITE_URL: https://my.bucket.example.com

- run: aws s3 sync ./.gitpulse/out s3://my-bucket --delete
```

---

## Configuration

All config is via environment variables. The CLI has no flags.

### Required

| Var | What it is |
|---|---|
| `OPENAI_API_KEY` | API key for whichever LLM provider you've configured (the env name is fixed, the value can be a Groq/MiniMax/etc. key). |
| `GITHUB_REPOSITORY` | `<owner>/<repo>`. Auto-set in GitHub Actions; on Vercel/Netlify you typically set this manually. |

### Common (optional)

| Var | Default | Purpose |
|---|---|---|
| `GITHUB_TOKEN` | (none) | Enables PR / release context lookups via GraphQL. Without it, every commit is treated as a direct push. |
| `AI_MODEL` | `gpt-4o-mini` | Model id used for story generation. |
| `AI_PROTOCOL` | `openai` | `openai` or `anthropic`. |
| `AI_BASE_URL` | (default OpenAI) | For OpenAI-compatible providers. See [LLM providers](#llm-providers). |
| `AI_TEMPERATURE` | `0` | Sampling temperature. |
| `GITPULSE_BOOTSTRAP_DAYS` | `30` | First-run history window in days. |
| `GITPULSE_CONCURRENCY` | `10` | Parallel commit analysis. Bound by your provider's rate limits. |
| `GITPULSE_RELEASES_CAP` | `20` | Max releases to process per run. `0` disables the releases pass. |
| `GITPULSE_INCLUDE_PRERELEASES` | `true` | Include prereleases in the feed. |
| `GITPULSE_BASE_PATH` | `auto` | `auto` = derive `/<repo>` from `GITHUB_REPOSITORY` (project Pages). `none` = root deployment (Vercel, user/org Pages, custom domain). Or a literal prefix like `/blog`. |
| `GITPULSE_SITE_URL` | derived | Absolute URL of the deployed site. Required when `GITPULSE_BASE_PATH` isn't `auto` (used for canonical URLs and incremental state restore). |
| `GITPULSE_DATA_DIR` | `./.gitpulse/data` | Where `analyze` writes JSON. `build` reads from here. |
| `GITPULSE_OUT_DIR` | `./.gitpulse/out` | Where `build` writes the static site. |

### LLM providers

The secret env var is always `OPENAI_API_KEY` — set it to whichever provider's key matches your `AI_BASE_URL` + `AI_PROTOCOL`.

**OpenAI** (default — no extra config):
```yaml
env:
  AI_MODEL: gpt-4o-mini
  OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

**MiniMax** (cheap, fast, OpenAI-compatible):
```yaml
env:
  AI_PROTOCOL: openai
  AI_BASE_URL: https://api.minimax.io/v1
  AI_MODEL: MiniMax-M2.7
  OPENAI_API_KEY: ${{ secrets.MINIMAX_API_KEY }}
```

**Groq**:
```yaml
env:
  AI_PROTOCOL: openai
  AI_BASE_URL: https://api.groq.com/openai/v1
  AI_MODEL: llama-3.3-70b-versatile
  OPENAI_API_KEY: ${{ secrets.GROQ_API_KEY }}
```

**OpenRouter** (any model they expose):
```yaml
env:
  AI_PROTOCOL: openai
  AI_BASE_URL: https://openrouter.ai/api/v1
  AI_MODEL: anthropic/claude-sonnet-4-6
  OPENAI_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}
```

**Anthropic Claude** (native):
```yaml
env:
  AI_PROTOCOL: anthropic
  AI_MODEL: claude-sonnet-4-6
  OPENAI_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

If you're using `publish-pages.yaml`, pass these via the workflow inputs (`ai-model`, `ai-protocol`, `ai-base-url`, `ai-temperature`) — see the workflow file for the full list.

---

## CLI commands

```
gitpulse <command>

Commands:
  analyze   Generate stories from git history. Writes to GITPULSE_DATA_DIR.
  build     Fetch the matching gitpulse site, inject data, build static output.
  --version Print the CLI version.
  --help    Show this help.
```

`gitpulse build` clones `znat/gitpulse@v<cli-version>` to a temp dir, copies your `GITPULSE_DATA_DIR` into the site's `public/data/`, runs the Next.js export, and copies the result to `GITPULSE_OUT_DIR`. It strips secrets (`OPENAI_API_KEY`, `GITHUB_TOKEN`, etc.) from the env it passes to the cloned tree's `yarn install` / `next build`.

Override the cloned source via `GITPULSE_SITE_REPO` (default `znat/gitpulse`) and `GITPULSE_SITE_REF` (default `v<cli-version>`) — handy if you fork the site for branding.

---

## Local development

```bash
yarn install
yarn dev    # next dev on the site at localhost:3000
```

To run the CLI locally against the current repo (requires a key in `.env`):

```bash
yarn workspace @gitpulse/cli analyze
```

The local `analyze` script writes to `${repoDir}/.gitpulse/data` by default. To dogfood the actual site build with that data:

```bash
yarn workspace @gitpulse/site build
```

To exercise `gitpulse build` end-to-end (clone-and-build path) against the in-tree site source:

```bash
GITPULSE_SITE_REPO=$PWD GITPULSE_SITE_REF=$(git rev-parse HEAD) \
GITPULSE_BASE_PATH=none \
node cli/dist/cli.js build
```

---

## Releasing (maintainers)

Two flows: **release-please** as the everyday path, and a **manual workflow** as the hotfix escape hatch.

### Default: release-please (automated)

You don't pick a version number — the bot reads conventional commit titles since the last release and computes the bump for you.

1. Land PRs to `main` with **conventional commit titles**:
   - `feat: …` → minor bump (`0.1.0` → `0.2.0`)
   - `fix: …` → patch bump (`0.1.0` → `0.1.1`)
   - `feat!: …` or `BREAKING CHANGE:` in the body → major bump (post-1.0)
   - `chore:`, `docs:`, `test:`, `refactor:`, `perf:`, `ci:`, `build:`, `style:`, `revert:` — no bump, but show up in CHANGELOG sections
2. release-please opens (or updates) a PR titled **`chore(main): release vX.Y.Z`** containing version bumps to root + `cli/` `package.json` (held in lockstep by the `linked-versions` plugin) and a `CHANGELOG.md` diff.
3. Review the release PR. When it looks right, **merge it**.
4. release-please then automatically:
   - tags the merge commit `vX.Y.Z`
   - creates a GitHub Release with the same notes
   - moves the `v0` floating tag to point at the new release (so consumers pinning `@v0` get non-breaking upgrades automatically)
   - **publishes `@gitpulse/cli@<version>` to npm via Trusted Publishing (OIDC)** — no `NPM_TOKEN` secret required

A separate workflow (`lint-pr-title`) runs on every PR and flags non-conventional titles as a status check. It doesn't block merge — but if you ignore it, that PR's commit doesn't show up in the next CHANGELOG.

### Trusted Publishing setup (one-time)

The `publish-cli` job uses [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers) — the runner's OIDC token is exchanged for a short-lived publish credential at runtime. To enable:

1. Visit https://www.npmjs.com/package/@gitpulse/cli/access → **Trusted Publishers** → **Add Trusted Publisher**.
2. Set:
   - **Provider**: GitHub Actions
   - **Repository owner**: `znat`
   - **Repository name**: `gitpulse`
   - **Workflow filename**: `release-please.yml`
   - **Environment name**: *(leave blank)*

That's the entire auth model — no token to rotate, no secret to leak.

### Going from `0.x` to `1.0.0`

release-please starts at `0.0.0` and bumps as `0.x.y` until you explicitly graduate. To ship `1.0.0`, add a commit on `main` whose body contains:

```
Release-As: 1.0.0
```

Next release-please run will use that exact version.

### Hotfix / out-of-band: manual workflow

Sometimes you want to ship a specific version without waiting for release-please's PR — typically for hotfixes or to recover from a release-please failure.

1. Open Actions → **Release** → **Run workflow**.
2. Enter a semver version without the leading `v` (e.g. `1.0.0`, or `1.1.0-rc.1` for a pre-release).
3. Click **Run**.

The manual workflow validates the version, runs `yarn typecheck` + `yarn test`, bumps `version` in root and workspace `package.json` files, commits as `release: v<version>`, creates the immutable tag + moves the major-version pointer, and creates a GitHub Release with auto-generated notes. Pre-releases (versions with a hyphen suffix) are flagged automatically.

### Branch-protection gotcha (applies to both flows)

If `main` is protected, the default `GITHUB_TOKEN` may not be allowed to push the release commit/tag. Either allow `github-actions[bot]` in protection rules, or replace the token in the relevant workflow file with a Personal Access Token secret with `contents: write` permission.

---

## License

[AGPL-3.0-or-later](./LICENSE).
