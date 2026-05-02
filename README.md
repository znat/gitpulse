# gitpulse

**An editorial story feed for your repo's pull requests and direct pushes — published to GitHub Pages, no backend required.**

Drop one workflow file into your repo. On a schedule, gitpulse walks your default branch, classifies each commit, writes a short editorial-style story for each, and publishes a static feed at `https://<your-username>.github.io/<repo>/`.

No database. No external services beyond GitHub and your LLM provider.

> See it running on this repo: **https://znat.github.io/gitpulse/**

---

## Install

You'll need:
- A repo where GitHub Pages is enabled with **Source: GitHub Actions**
- One repository secret: `OPENAI_API_KEY` (or the equivalent for whichever provider you choose — see below)

Add `.github/workflows/gitpulse.yml`. Pick the trigger style that matches your cadence — both work and you can change it later:

#### Option A — event-driven (recommended)

Re-publishes the moment something changes: every push to your default branch, every published release, plus a manual trigger. No idle runs, fastest reflection of new content on the site.

```yaml
name: Gitpulse

on:
  push:
    branches: [main]
  release:
    types: [published]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  analyze:
    uses: znat/gitpulse/.github/workflows/publish.yaml@v1
    secrets:
      OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

#### Option B — daily

A single scheduled run per day, plus a manual trigger. Lower CI footprint when activity is sporadic; new content lags by up to a day.

```yaml
name: Gitpulse

on:
  schedule:
    - cron: "0 9 * * *"   # daily at 09:00 UTC
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  analyze:
    uses: znat/gitpulse/.github/workflows/publish.yaml@v1
    secrets:
      OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

Either way: the first run bootstraps from the last 30 days of history; subsequent runs only analyze new commits since the last published deploy.

### Enable Pages

Repo → **Settings → Pages → Source: GitHub Actions**. The first deploy creates the site; deploys after that update it in place.

---

## Configure

All inputs are optional and have sensible defaults.

| Input | Default | Description |
|---|---|---|
| `bootstrap-days` | `30` | First-run history window (days). Subsequent runs are incremental. |
| `ai-model` | `gpt-4o-mini` | Model id. Must be supported by the chosen provider. |
| `ai-protocol` | `openai` | `openai` for OpenAI / Groq / OpenRouter / MiniMax (OpenAI-compatible mode). `anthropic` for Claude. |
| `ai-base-url` | *(empty = OpenAI)* | Base URL for OpenAI-compatible providers. See examples below. |
| `ai-temperature` | `0` | LLM sampling temperature. |
| `concurrency` | `10` | How many commits to analyze in parallel. |

### Provider examples

**OpenAI** (default — no extra config):
```yaml
with:
  ai-model: gpt-4o-mini
secrets:
  OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

**MiniMax** (cheap, fast, OpenAI-compatible):
```yaml
with:
  ai-protocol: openai
  ai-base-url: https://api.minimax.io/v1
  ai-model: MiniMax-M2.7
secrets:
  OPENAI_API_KEY: ${{ secrets.MINIMAX_API_KEY }}
```

**Groq**:
```yaml
with:
  ai-protocol: openai
  ai-base-url: https://api.groq.com/openai/v1
  ai-model: llama-3.3-70b-versatile
secrets:
  OPENAI_API_KEY: ${{ secrets.GROQ_API_KEY }}
```

**OpenRouter** (any model they expose):
```yaml
with:
  ai-protocol: openai
  ai-base-url: https://openrouter.ai/api/v1
  ai-model: anthropic/claude-sonnet-4-6
secrets:
  OPENAI_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}
```

**Anthropic Claude** (native):
```yaml
with:
  ai-protocol: anthropic
  ai-model: claude-sonnet-4-6
secrets:
  OPENAI_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

The secret is always passed in as `OPENAI_API_KEY` — gitpulse uses whatever value you put there with the configured `ai-base-url` and `ai-protocol`.

---

## How it works

1. **Walk** the default branch since the last published commit (or `bootstrap-days` on first run).
2. **Classify** each commit as `pr` (merged via PR) or `commit` (direct push) using GitHub's `associatedPullRequests` field.
3. **Summarize** each commit with one LLM call: headline, standfirst, category, size assessment.
4. **Restore** prior content by fetching `data/state.json`, `data/manifest.json`, and `data/stories/<id>.json` from the live deployed site — no database, no separate branch, no artifact chain.
5. **Build** the Next.js site (`output: 'export'`) and **deploy** to GitHub Pages.

State is the deployed site itself. If the site is up, gitpulse can resume.

---

## Local development

```bash
yarn install
yarn dev    # next dev on the site at localhost:3000
```

To run the analyzer locally against the current repo (requires a key in `.env`):

```bash
yarn workspace @gitpulse/action analyze
```

Then `yarn workspace @gitpulse/site build` to produce `site/out/` exactly as CI would.

---

## License

[AGPL-3.0-or-later](./LICENSE).
