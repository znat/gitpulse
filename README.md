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

> Pre-1.0 — the CLI is at `0.x.y` and consumers pin `@gitpulse/cli@0` (npm) and `znat/gitpulse/.github/workflows/publish-pages.yaml@v0` (workflow). When the API stabilises, both move to `@1` / `@v1`.

You'll need a repository secret `OPENAI_API_KEY` (or whichever provider's key — see [LLM providers](#llm-providers) below).

<details open>
<summary><b>GitHub Pages</b> — one-line reusable workflow</summary>

In your repo's **Settings → Pages → Source: GitHub Actions**, then drop this in `.github/workflows/gitpulse.yml`:

```yaml
name: Gitpulse

on:
  push:
    branches: [main]
  release:
    types: [published]
  workflow_dispatch:

# Reusable workflows inherit the caller's token permissions; these grants
# are required for the deploy step inside publish-pages.yaml.
permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  publish:
    uses: znat/gitpulse/.github/workflows/publish-pages.yaml@v0
    secrets: inherit
```

That's it. First run bootstraps from the last 30 days of history; subsequent runs are incremental.

</details>

<details>
<summary><b>Vercel</b> — build hook (no GitHub Actions)</summary>

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

The site URL and basePath are **auto-detected** from Vercel's build env (`VERCEL_URL` / `VERCEL_PROJECT_PRODUCTION_URL`); no need to set `GITPULSE_SITE_URL` or `GITPULSE_BASE_PATH` explicitly. Override only if you've connected a custom domain and want canonical links to point at it — set `GITPULSE_SITE_URL=https://my.example.com`.

For Vercel's auto-detection to find `next build` output, make sure the framework preset is "Next.js" and the build output is `out` (or however your `next.config.js` is configured).

</details>

<details>
<summary><b>Netlify</b> — build hook</summary>

Same shape. In `netlify.toml`:

```toml
[build]
  command = "npx -y @gitpulse/cli@0 analyze && npx -y @gitpulse/cli@0 build"
  publish = ".gitpulse/out"
```

Set `OPENAI_API_KEY` and `GITHUB_TOKEN` in the Netlify dashboard's environment variables. The site URL is **auto-detected** from Netlify's build env (`URL` / `DEPLOY_PRIME_URL` / `DEPLOY_URL`) — only set `GITPULSE_SITE_URL` if you want canonicals to point at a different host than what Netlify reports.

</details>

<details>
<summary><b>Cloudflare Pages</b> — build command in dashboard</summary>

In the Cloudflare Pages project:

- **Build command**: `npx -y @gitpulse/cli@0 analyze && npx -y @gitpulse/cli@0 build`
- **Build output directory**: `.gitpulse/out`
- **Environment variables**: `OPENAI_API_KEY` + `GITHUB_TOKEN`. The site URL is auto-detected from Cloudflare's `CF_PAGES_URL`.

</details>

<details>
<summary><b>Anywhere else</b> — S3, GitLab CI, custom Pages</summary>

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

</details>

---

## Configuration

All config is via environment variables. The CLI has no flags.

### Required

| Var | What it is |
|---|---|
| `OPENAI_API_KEY` | API key for whichever LLM provider you've configured (the env name is fixed, the value can be a MiniMax / OpenRouter / Anthropic / etc. key). |
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
| `GITPULSE_SITE_URL` | auto-detected | Absolute URL of the deployed site (used for canonical URLs and incremental state restore). Auto-detected on Vercel (`VERCEL_PROJECT_PRODUCTION_URL` / `VERCEL_URL`), Netlify (`URL` / `DEPLOY_PRIME_URL`), Cloudflare Pages (`CF_PAGES_URL`); falls back to `https://<owner>.github.io/<repo>/`. Set explicitly to override for custom domains. |
| `GITPULSE_DATA_DIR` | `./.gitpulse/data` | Where `analyze` writes JSON. `build` reads from here. |
| `GITPULSE_OUT_DIR` | `./.gitpulse/out` | Where `build` writes the static site. |

### LLM providers

The CLI reads provider config from environment variables. The secret env var is always `OPENAI_API_KEY` — its value is whichever provider's key matches your `AI_BASE_URL` and `AI_PROTOCOL`.

**Where to wire them, by deploy target:**

For the **Pages reusable workflow**, non-secret values go through `with:`; the secret rides on `secrets: inherit`:

```yaml
jobs:
  publish:
    uses: znat/gitpulse/.github/workflows/publish-pages.yaml@v0
    with:
      ai-protocol: openai            # or "anthropic"
      ai-base-url: ""                # see provider-specific values below
      ai-model: gpt-4o-mini
    secrets: inherit                 # supplies OPENAI_API_KEY repo secret
```

For **Vercel / Netlify / Cloudflare Pages**, set the same names as project Environment Variables in the dashboard. See the Quickstart section for each.

For a **generic GitHub Actions step** (your own workflow, not the reusable one):

```yaml
- run: npx -y @gitpulse/cli@0 analyze
  env:
    AI_MODEL:       <model id>
    AI_PROTOCOL:    openai           # or "anthropic"
    AI_BASE_URL:    <provider base url>
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
    GITHUB_TOKEN:   ${{ secrets.GITHUB_TOKEN }}
```

For **local CLI use**, in a `.env` next to the invocation:

```bash
AI_MODEL=<model id>
AI_PROTOCOL=openai
AI_BASE_URL=<provider base url>
OPENAI_API_KEY=<your provider key>
```

**Provider-specific values:**

<details>
<summary><b>OpenAI</b> (default)</summary>

```bash
AI_MODEL=gpt-4o-mini
OPENAI_API_KEY=<your openai key>
```

`AI_PROTOCOL` and `AI_BASE_URL` aren't needed — they default to OpenAI.

</details>

<details>
<summary><b>MiniMax</b> (cheap, OpenAI-compatible)</summary>

```bash
AI_PROTOCOL=openai
AI_BASE_URL=https://api.minimax.io/v1
AI_MODEL=MiniMax-M2.7
OPENAI_API_KEY=<your minimax key>
```

</details>

<details>
<summary><b>OpenRouter</b> (any model they expose)</summary>

```bash
AI_PROTOCOL=openai
AI_BASE_URL=https://openrouter.ai/api/v1
AI_MODEL=anthropic/claude-sonnet-4-6
OPENAI_API_KEY=<your openrouter key>
```

</details>

<details>
<summary><b>Anthropic Claude</b> (native)</summary>

```bash
AI_PROTOCOL=anthropic
AI_MODEL=claude-sonnet-4-6
OPENAI_API_KEY=<your anthropic key>
```

`AI_BASE_URL` isn't needed — uses Anthropic's default endpoint.

</details>

---

## CLI commands

```text
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

## License

[AGPL-3.0-or-later](./LICENSE).
