<div align="center">

# Gitpulse

`git log` was never meant for humans.

**Let your code contributions speak for themselves.**  
The easy and 100% automated way to communicate what your team is shipping.

<br>

[![npm](https://img.shields.io/npm/v/%40gitpulse%2Fcli?style=flat-square&label=%40gitpulse%2Fcli&color=000000&labelColor=000000&logoColor=white)](https://www.npmjs.com/package/@gitpulse/cli)

<br>

**[Vercel demo →](https://gitpulse-demo.vercel.app/)** &nbsp;&nbsp;·&nbsp;&nbsp; **[GitHub Pages demo →](https://znat.github.io/gitpulse/)** &nbsp;&nbsp;·&nbsp;&nbsp; password: `gitpulse`

<!-- Add screenshot here -->

</div>

---

Gitpulse analyzes your git history and turns it into a polished publication — one story per meaningful change, deployed as a static site on every push.

<table>
<tr>
<td>

◆ **AI-generated stories**

Reads diffs, PR descriptions, and release notes to write plain-English posts.

</td>
<td>

◆ **Zero infrastructure**

Runs entirely in your CI. No external service, no remote database — your data stays yours.

</td>
</tr>
<tr>
<td>

◆ **Deploy anywhere**

GitHub Pages, Vercel, Netlify, Cloudflare Pages, S3 — anything that serves HTML.

</td>
<td>

◆ **Any LLM provider**

OpenAI, Anthropic, OpenRouter, MiniMax, or any OpenAI-compatible endpoint.

</td>
</tr>
<tr>
<td colspan="2">

◆ **Optional password protection**

End-to-end encrypted publications — works on any static host, no server required.

</td>
</tr>
</table>

---

## How it works

A CLI (`gitpulse analyze` + `gitpulse build`) runs in **your** CI, reads your git history, and publishes a static site. No external service, no database, nothing outside your pipeline.

<details>
<summary>More details</summary>

Two pieces:

1. **`@gitpulse/cli`** — a tiny CLI on npm with two subcommands:
   - `gitpulse analyze` walks your main branch history, calls an LLM for each new commit — which reads the diff, PR description, and release notes to write a plain-English story — and writes the results as JSON.
   - `gitpulse build` clones the matching gitpulse site at runtime, injects your data, runs `next export`, and produces a static site.
2. **A static deploy** — Pages, Vercel, Netlify, S3, whatever serves HTML.

State is the deployed site itself. Each run fetches `manifest.json` from your live URL — a record of every commit already analyzed — picks up where it left off, and only processes what's new. No database, no separate branch, no artifact chain.

</details>

---

## Quickstart

You'll need an LLM API key (see [LLM providers](#llm-providers)). Choose your deployment target:

<details open>
<summary><b>GitHub Pages</b> — one-line reusable workflow</summary>

<blockquote>
<details>
<summary>🤖 Copyable instructions for a coding agent</summary>

```
Set up Gitpulse on this repository to publish a changelog to GitHub Pages.

Read these before implementing:
- Available workflow files: https://github.com/znat/gitpulse/tree/main/.github/workflows/
- Configuration schema and all available options: https://github.com/znat/gitpulse#configuration

Based on the configuration schema, ask me about each available option before implementing. Then create all required files and list every secret and variable that needs to be configured.
```

</details>
</blockquote>

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
<summary><b>Vercel</b> — Vercel-side build (simplest)</summary>

<blockquote>
<details>
<summary>🤖 Copyable instructions for a coding agent</summary>

```
Set up Gitpulse on this repository to publish a changelog to Vercel, with Vercel handling the build.

Read these before implementing:
- Configuration schema and all available options: https://github.com/znat/gitpulse#configuration

Based on the configuration schema, ask me about each available option before implementing. Then update package.json, list every environment variable that needs to be configured in the Vercel dashboard, and include any other required changes.
```

</details>
</blockquote>

Vercel auto-builds on every push if you connect the repo. Make Gitpulse part of that build:

```json
// package.json
{
  "scripts": {
    "build": "gitpulse analyze && gitpulse build"
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

That's it — Gitpulse auto-detects the repo and site URL from Vercel's environment. Only set `GITPULSE_SITE_URL` if you've connected a custom domain and want canonical links to point at it.

If you'd rather keep secrets out of Vercel and run the build in CI, see the **GitHub Actions → Vercel** option below.

</details>

<details>
<summary><b>Vercel</b> — GitHub Actions builds, Vercel hosts (secrets stay in CI)</summary>

<blockquote>
<details>
<summary>🤖 Copyable instructions for a coding agent</summary>

```
Set up Gitpulse on this repository to publish a changelog to Vercel, with GitHub Actions handling the build and Vercel acting as the host.

Read these before implementing:
- Available workflow files: https://github.com/znat/gitpulse/tree/main/.github/workflows/
- Gitpulse's own Vercel deployment as a reference: https://github.com/znat/gitpulse/blob/main/.github/workflows/deploy-vercel.yml
- Configuration schema and all available options: https://github.com/znat/gitpulse#configuration

Based on the configuration schema, ask me about each available option before implementing. Then create all required files and list every secret and variable that needs to be configured.
```

</details>
</blockquote>

If you'd rather keep all secrets in your CI runner and have Vercel act as a pure CDN, run analyze + build in GitHub Actions and ship the prebuilt output via `vercel deploy --prebuilt`. Vercel runs no build, sees no LLM keys, and needs no env vars.

```yaml
# .github/workflows/deploy-vercel.yml
name: Deploy to Vercel
on:
  push: { branches: [main] }
  workflow_dispatch:

permissions: { contents: read }

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
        with: { fetch-depth: 0 }
      - uses: actions/setup-node@v6
        with: { node-version: 22 }

      - run: npm install -g @gitpulse/cli@0 --silent && gitpulse analyze
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          GITHUB_TOKEN:    ${{ secrets.GITHUB_TOKEN }}
          GITPULSE_SITE_URL: ${{ vars.VERCEL_SITE_URL }}

      - run: gitpulse build
        env:
          GITPULSE_BASE_PATH: none
          GITPULSE_SITE_URL:  ${{ vars.VERCEL_SITE_URL }}

      - name: Stage for Vercel prebuilt deploy
        run: |
          mkdir -p .vercel/output/static
          cp -RT .gitpulse/out .vercel/output/static
          echo '{"version":3}' > .vercel/output/config.json

      - run: |
          npm install -g vercel@latest
          vercel deploy --prebuilt --prod --yes --token="$VERCEL_TOKEN"
        env:
          VERCEL_TOKEN:      ${{ secrets.VERCEL_TOKEN }}
          VERCEL_ORG_ID:     ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
```

**One-time setup (no local CLI required):**
1. Create a Vercel project at https://vercel.com/new. When it asks to import a Git repository, **skip** — we don't want Vercel's webhook builds (CI handles deploys).
2. From the Vercel dashboard, copy three values into GitHub repo **secrets** (Settings → Secrets and variables → Actions → New repository secret):
   - `VERCEL_TOKEN` — generate at https://vercel.com/account/tokens
   - `VERCEL_PROJECT_ID` — Project → **Settings → General → Project ID**
   - `VERCEL_ORG_ID` — Team avatar (top right) → **Settings → General → Team ID**
3. Add a repo **variable** (Settings → Secrets and variables → Actions → **Variables tab** — variables, not secrets, since the URL is public):
   - `VERCEL_SITE_URL = https://<project>.vercel.app/` (or your custom domain). Used as the canonical URL for analyzer state restore + the site's `<meta>` canonicals.
4. Push to `main` → first deploy seeds the project. Subsequent pushes deploy automatically.

If you prefer, you can also run `vercel link` locally to pull the same IDs from `.vercel/project.json` — same result, different path.

This is exactly what gitpulse itself uses to dogfood Vercel — see [`.github/workflows/deploy-vercel.yml`](./.github/workflows/deploy-vercel.yml).

</details>

<details>
<summary><b>Netlify</b> — build hook</summary>

<blockquote>
<details>
<summary>🤖 Copyable instructions for a coding agent</summary>

```
Set up Gitpulse on this repository to publish a changelog to Netlify.

Read these before implementing:
- Configuration schema and all available options: https://github.com/znat/gitpulse#configuration

Based on the configuration schema, ask me about each available option before implementing. Then create netlify.toml and list every environment variable that needs to be configured in the Netlify dashboard.
```

</details>
</blockquote>

Same shape. In `netlify.toml`:

```toml
[build]
  command = "npm install -g @gitpulse/cli@0 --silent && gitpulse analyze && gitpulse build"
  publish = ".gitpulse/out"
```

Set `OPENAI_API_KEY` and `GITHUB_TOKEN` in the Netlify dashboard's environment variables. Netlify's build env (`REPOSITORY_URL`, `URL` / `DEPLOY_PRIME_URL` / `DEPLOY_URL`) is auto-detected for `GITHUB_REPOSITORY` and `GITPULSE_SITE_URL`; basePath defaults to `''` because Netlify serves at root. No other vars to set. Override `GITPULSE_SITE_URL` only for custom domains.

</details>

<details>
<summary><b>Cloudflare Pages</b> — build command in dashboard</summary>

<blockquote>
<details>
<summary>🤖 Copyable instructions for a coding agent</summary>

```
Set up Gitpulse on this repository to publish a changelog to Cloudflare Pages.

Read these before implementing:
- Configuration schema and all available options: https://github.com/znat/gitpulse#configuration

Based on the configuration schema, ask me about each available option before implementing. Then list every setting and environment variable that needs to be configured in the Cloudflare Pages dashboard.
```

</details>
</blockquote>

In the Cloudflare Pages project:

- **Build command**: `npm install -g @gitpulse/cli@0 --silent && gitpulse analyze && gitpulse build`
- **Build output directory**: `.gitpulse/out`
- **Environment variables**: `OPENAI_API_KEY` + `GITHUB_TOKEN` + `GITHUB_REPOSITORY` (Cloudflare Pages doesn't expose repo info via env, unlike Vercel/Netlify). Site URL is auto-detected from `CF_PAGES_URL`. basePath defaults to `''` since Cloudflare serves at root.

</details>

<details>
<summary><b>Anywhere else</b> — S3, GitLab CI, custom Pages</summary>

<blockquote>
<details>
<summary>🤖 Copyable instructions for a coding agent</summary>

```
Set up Gitpulse on this repository to publish a changelog to a custom static host.

Read these before implementing:
- Available workflow files: https://github.com/znat/gitpulse/tree/main/.github/workflows/
- Configuration schema and all available options: https://github.com/znat/gitpulse#configuration

Based on the configuration schema, ask me about each available option before implementing. Then create all required files and list every secret and variable that needs to be configured.
```

</details>
</blockquote>

The CLI takes env vars, writes JSON, builds a static site. Wire it into whatever pipeline you have:

```yaml
# Generic GitHub Actions example for non-Pages targets
- uses: actions/checkout@v6
  with: { fetch-depth: 0 }
- uses: actions/setup-node@v6
  with: { node-version: 22 }

- run: npm install -g @gitpulse/cli@0 --silent && gitpulse analyze
  env:
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
    GITHUB_TOKEN:   ${{ secrets.GITHUB_TOKEN }}

- run: gitpulse build
  env:
    GITPULSE_BASE_PATH: none
    GITPULSE_SITE_URL: https://my.bucket.example.com

- run: aws s3 sync ./.gitpulse/out s3://my-bucket --delete
```

</details>

---

## Configuration

Configuration is split by concern:

- **Settings** — `.gitpulse.json` at the root of your repo (safe to commit). Everything that isn't a secret lives here: the text model, analysis scope, theme, images, and deploy coordinates.
- **Secrets** — environment variables (never committed): API keys, tokens, the optional site password.

### `.gitpulse.json`

Optional file at your repo root. Every field is optional; omit any you don't need. Unknown keys are rejected (typos surface loudly).

```json
{
  "publicationTitle": "The Acme Dispatch",
  "publicationSubtitle": "Engineering updates from the Acme team",
  "text": {
    "provider": "openai-compatible",
    "model": "MiniMax-M3",
    "baseURL": "https://api.minimax.io/v1"
  },
  "analysis": {
    "bootstrapDays": 30,
    "concurrency": 10,
    "releasesCap": 20,
    "includePrereleases": true
  },
  "images": {
    "storage": { "provider": "vercel-blob" },
    "ai": { "provider": "gemini", "model": "gemini-3.1-flash-image-preview" }
  }
}
```

**Top-level**

| Field | Default | Purpose |
|---|---|---|
| `publicationTitle` | `The <Repo> Conversation` | Name shown in the feed header, top bar, and page title. |
| `publicationSubtitle` | `<owner>/<repo> · Development Activity Intelligence` | Subtitle shown below the feed header. |
| `daysPerPage` | (unset) | Days of stories per feed page. |
| `releasesPerPage` | (unset) | Releases per release-index page. |
| `theme` | (unset) | `{ accentColor, linkColor }` — hex colors like `#b8860b`. |
| `labels` | (unset) | `{ ignore }` — PRs carrying this label are excluded (and retroactively pruned). |

**`text`** — the LLM used for story and release prose. API keys are **never** put here; see [LLM providers](#llm-providers). Discriminated on `provider`:

| `provider` | Fields | SDK / key |
|---|---|---|
| `openai` (default) | `model`, `temperature?` | OpenAI · `OPENAI_API_KEY` |
| `anthropic` | `model`, `temperature?` | Anthropic · `ANTHROPIC_API_KEY` |
| `openai-compatible` | `model`, **`baseURL`**, `temperature?` | OpenAI-wire (MiniMax, OpenRouter, DeepSeek…) · `OPENAI_API_KEY` |

When `text` is omitted, gitpulse defaults to `openai` / `gpt-4o-mini`.

**`analysis`** — scope and pacing.

| Field | Default | Purpose |
|---|---|---|
| `branch` | repo default | Branch to analyze. |
| `bootstrapDays` | `30` | First-run history window in days. |
| `concurrency` | `10` | Parallel commit analysis. Bound by your provider's rate limits. |
| `limit` | (unbounded) | Cap on commits processed per run (debugging). |
| `releasesCap` | `20` | Max releases to process per run. `0` disables the releases pass. |
| `includePrereleases` | `true` | Include prereleases in the feed. |

**`site` / `paths`** — deploy coordinates and on-disk locations. These are deploy-environment-specific, so the matching `GITPULSE_*` env var (below) overrides the file when set.

| Field | Env override | Default |
|---|---|---|
| `site.url` | `GITPULSE_SITE_URL` | auto-detected (Vercel/Netlify/CF Pages) → `https://<owner>.github.io/<repo>/` |
| `site.basePath` | `GITPULSE_BASE_PATH` | `auto` (`/<repo>` from `GITHUB_REPOSITORY`) |
| `site.repo` | `GITPULSE_SITE_REPO` | `znat/gitpulse` |
| `site.ref` | `GITPULSE_SITE_REF` | `v<cli-version>` |
| `paths.dataDir` | `GITPULSE_DATA_DIR` | `./.gitpulse/data` |
| `paths.storiesDir` | `GITPULSE_STORIES_DIR` | `<dataDir>/stories` |
| `paths.releasesDir` | `GITPULSE_RELEASES_DIR` | `<dataDir>/releases` |
| `paths.outDir` | `GITPULSE_OUT_DIR` | `./.gitpulse/out` |

### Secrets (env vars — never committed)

| Var | What it is |
|---|---|
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` | Your text-LLM key. Use the name matching `.gitpulse.json` `text.provider`: `OPENAI_API_KEY` for `openai` and `openai-compatible` (MiniMax, OpenRouter, etc.); `ANTHROPIC_API_KEY` for `anthropic`. |
| `GITHUB_TOKEN` | Enables PR / release context lookups via GraphQL. Without it, every commit is treated as a direct push. |
| `GOOGLE_API_KEY` / `GEMINI_API_KEY` | Required only when `images.ai` is configured (image generation). |
| `GITPULSE_PASSWORD` | If set, the published site is encrypted end-to-end and visitors must enter the password to read. See [Password protection](#password-protection). |

### Deploy-environment env vars (auto-detected, or override settings)

| Var | Default | Purpose |
|---|---|---|
| `GITHUB_REPOSITORY` | auto-detected | `<owner>/<repo>`. Auto-set in GitHub Actions; auto-detected on Vercel and Netlify. Set manually on Cloudflare Pages and other targets. |
| `GITPULSE_SITE_URL` | auto-detected | Overrides `site.url`. Auto-detected on Vercel (`VERCEL_PROJECT_PRODUCTION_URL` / `VERCEL_URL`), Netlify (`URL` / `DEPLOY_PRIME_URL` / `DEPLOY_URL`), Cloudflare Pages (`CF_PAGES_URL`); falls back to `https://<owner>.github.io/<repo>/`. |
| `GITPULSE_BASE_PATH` | `auto` | Overrides `site.basePath`. `auto` = `/<repo>` from `GITHUB_REPOSITORY` (project Pages). `none` = root deployment (Vercel, user/org Pages, custom domain). Or a literal prefix like `/blog`. |
| `GITPULSE_DATA_DIR` / `GITPULSE_OUT_DIR` / `GITPULSE_SITE_REPO` / `GITPULSE_SITE_REF` | (settings) | Override the matching `paths.*` / `site.*` settings. |

> Text model and analysis scope are **not** env-configurable — they live in `.gitpulse.json`. (Before 1.0 these were the `AI_*` and some `GITPULSE_*` env vars; they were removed in favor of the file.)

### LLM providers

Pick a provider in `.gitpulse.json` `text`, then supply the matching key as a secret env var: `OPENAI_API_KEY` for `openai` / `openai-compatible` (MiniMax, OpenRouter, etc.), `ANTHROPIC_API_KEY` for `anthropic`.

**Where to wire the key, by deploy target:**

For the **Pages reusable workflow**, the key rides on `secrets: inherit`; the model is in your committed `.gitpulse.json`:

```yaml
jobs:
  publish:
    uses: znat/gitpulse/.github/workflows/publish-pages.yaml@v0
    secrets: inherit                 # supplies OPENAI_API_KEY or ANTHROPIC_API_KEY repo secret
```

For **Vercel / Netlify / Cloudflare Pages**, set the key as a project Environment Variable in the dashboard. See the Quickstart section for each.

For a **generic GitHub Actions step** (your own workflow, not the reusable one):

```yaml
- run: npm install -g @gitpulse/cli@0 --silent && gitpulse analyze
  env:
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}   # or ANTHROPIC_API_KEY
    GITHUB_TOKEN:   ${{ secrets.GITHUB_TOKEN }}
```

For **local CLI use**, put the key in a `.env` next to the invocation:

```bash
OPENAI_API_KEY=<your provider key>                  # or ANTHROPIC_API_KEY
```

**Provider-specific `.gitpulse.json` `text` blocks:**

<details>
<summary><b>OpenAI</b> (default)</summary>

```json
{ "text": { "provider": "openai", "model": "gpt-4o-mini" } }
```

Secret: `OPENAI_API_KEY`. Omitting `text` entirely also defaults to this.

</details>

<details>
<summary><b>MiniMax</b> (cheap, OpenAI-compatible)</summary>

```json
{
  "text": {
    "provider": "openai-compatible",
    "model": "MiniMax-M3",
    "baseURL": "https://api.minimax.io/v1"
  }
}
```

Secret: `OPENAI_API_KEY` (your MiniMax key).

</details>

<details>
<summary><b>OpenRouter</b> (any model they expose)</summary>

```json
{
  "text": {
    "provider": "openai-compatible",
    "model": "anthropic/claude-sonnet-4-6",
    "baseURL": "https://openrouter.ai/api/v1"
  }
}
```

Secret: `OPENAI_API_KEY` (your OpenRouter key).

</details>

<details>
<summary><b>Anthropic Claude</b> (native)</summary>

```json
{ "text": { "provider": "anthropic", "model": "claude-sonnet-4-6" } }
```

Secret: `ANTHROPIC_API_KEY`. No `baseURL` needed — uses Anthropic's default endpoint.

</details>

---

## Password protection

Set `GITPULSE_PASSWORD` in the build environment and the published site is encrypted end-to-end — every page and every JSON data file. Readers see a single unlock screen the first time they visit; the rest of the publication reads as normal afterwards. Works on any static host (Vercel, GitHub Pages, Netlify, Cloudflare Pages) — the protection lives in the static files, not in the host.

Crypto: PBKDF2-SHA256 (600 000 iterations) → AES-GCM 256 via the browser's Web Crypto. The password never ships to the client; only its derivative key material does. AES-GCM authenticates every decrypt, so a wrong password is rejected loudly, not silently.

What changes when the variable is set:

- Every emitted `.html` is replaced with a small unlock shell that decrypts the original document client-side after the password is entered.
- Every `data/**/*.json` becomes an `{iv, ct}` envelope; the runtime decrypts as it fetches.
- `opengraph-image*.png`, `sitemap.xml`, and Next's RSC navigation `.txt` payloads are deleted post-build so they can't leak rendered story content.
- `robots.txt` is overwritten with `Disallow: /`.

After unlock, readers can opt into "remember on this device" — the derived key is cached in `localStorage` so subsequent visits skip the prompt. Same password yields the same key across rebuilds, so the cache stays valid through redeploys and is invalidated automatically when you rotate the password. Without the opt-in, the key lives only for the tab session.

> [!IMPORTANT]
> `gitpulse analyze` fetches the previous deployment's state to know which commits it has already covered. For protected sites it also needs `GITPULSE_PASSWORD` (same value) to decrypt that state — wire the same env var into both the analyze and the build steps. A wrong password aborts with a clear error rather than silently re-bootstrapping from scratch.

**Caveats:**

> [!WARNING]
> Lose the password and the published archive is unreadable — keep a copy in a password manager and your CI secret store.

Toggling protection on or off requires a fresh build and a CDN cache purge so old plaintext copies don't linger. The `_next/static/*` JavaScript bundles remain plaintext (framework code, no story data); only the publication content is encrypted. Story URLs (`/commit/<sha>/<slug>/`, `/pull/<n>/<slug>/`) keep their slug suffix in both modes — the URL path leaks headline-derived words but no protected data.

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
