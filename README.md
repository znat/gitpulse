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

_Reads diffs, PR descriptions, and release notes to write plain-English posts._

</td>
<td>

◆ **Zero infrastructure**

_Runs entirely in your CI. No external service, no remote database — your data stays yours._

</td>
</tr>
<tr>
<td>

◆ **Deploy anywhere**

_GitHub Pages, Vercel, Netlify, Cloudflare Pages, S3 — anything that serves HTML._

</td>
<td>

◆ **Any LLM provider**

_OpenAI, Anthropic, OpenRouter, MiniMax, or any OpenAI-compatible endpoint._

</td>
</tr>
<tr>
<td colspan="2">

◆ **Optional password protection**

_End-to-end encrypted publications — works on any static host, no server required._

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

- **Secrets and operational settings** — environment variables (never committed).
- **Publication settings** — `.gitpulse.json` at the root of your repo (safe to commit).

### `.gitpulse.json`

Optional file at your repo root. All fields are optional; omit any you don't need.

```json
{
  "publicationTitle": "The Acme Dispatch",
  "publicationSubtitle": "Engineering updates from the Acme team"
}
```

| Field | Default | Purpose |
|---|---|---|
| `publicationTitle` | `The <Repo> Conversation` | Name shown in the feed header, top bar, and page title. |
| `publicationSubtitle` | `<owner>/<repo> · Development Activity Intelligence` | Subtitle shown below the feed header. |
| `bootstrapDays` | `30` | First-run history window in days. |
| `concurrency` | `10` | Parallel commit analysis. Bound by your provider's rate limits. |
| `releasesCap` | `20` | Max releases to process per run. `0` disables the releases pass. |
| `includePrereleases` | `true` | Include prereleases in the feed. |

### Required env vars (when not auto-detected)

| Var | What it is |
|---|---|
| `OPENAI_API_KEY` | Your LLM provider's API key. The variable name is a fixed convention — the value is whatever key your chosen provider issues (OpenAI, Anthropic, MiniMax, OpenRouter, etc.). |

### Common optional env vars

| Var | Default | Purpose |
|---|---|---|
| `GITHUB_REPOSITORY` | auto-detected | `<owner>/<repo>`. Auto-set in GitHub Actions; auto-detected on Vercel and Netlify. Set manually on Cloudflare Pages and other targets. |
| `GITHUB_TOKEN` | (none) | Enables PR / release context lookups via GraphQL. Without it, every commit is treated as a direct push. |
| `AI_MODEL` | `gpt-4o-mini` | Model id used for story generation. |
| `AI_PROTOCOL` | `openai` | `openai` or `anthropic`. |
| `AI_BASE_URL` | (default OpenAI) | For OpenAI-compatible providers. See [LLM providers](#llm-providers). |
| `AI_TEMPERATURE` | `0` | Sampling temperature. |
| `GITPULSE_BASE_PATH` | `auto` | `auto` = derive `/<repo>` from `GITHUB_REPOSITORY` (project Pages). `none` = root deployment (Vercel, user/org Pages, custom domain). Or a literal prefix like `/blog`. |
| `GITPULSE_SITE_URL` | auto-detected | Absolute URL of the deployed site (used for canonical URLs and incremental state restore). Auto-detected on Vercel (`VERCEL_PROJECT_PRODUCTION_URL` / `VERCEL_URL`), Netlify (`URL` / `DEPLOY_PRIME_URL` / `DEPLOY_URL`), Cloudflare Pages (`CF_PAGES_URL`); falls back to `https://<owner>.github.io/<repo>/`. Set explicitly to override for custom domains. |
| `GITPULSE_DATA_DIR` | `./.gitpulse/data` | Where `analyze` writes JSON. `build` reads from here. |
| `GITPULSE_OUT_DIR` | `./.gitpulse/out` | Where `build` writes the static site. |
| `GITPULSE_PASSWORD` | (none) | If set, the published site is encrypted end-to-end and visitors must enter the password to read. See [Password protection](#password-protection). |

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
- run: npm install -g @gitpulse/cli@0 --silent && gitpulse analyze
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
