# gitpulse

Editorial story feed for your repo's pull requests and direct pushes.

> Status: Phase 0 scaffold. Not yet functional. See [the plan](https://github.com/znat/gitpulse) for the roadmap.

## What it does (planned)

Drop one workflow file into your repo. On a schedule, gitpulse:

1. Walks your default branch and classifies each commit as a **merged PR** or a **direct push**.
2. Writes a short editorial "story" for each, using Anthropic's Claude.
3. Publishes a static feed to GitHub Pages at `<your-username>.github.io/<repo>/`.

No database. No backend. Just one Action.

## Install (planned, not yet wired)

```yaml
# .github/workflows/gitpulse.yml
name: Gitpulse
on:
  schedule: [{ cron: "0 9 * * *" }]
  workflow_dispatch:

jobs:
  analyze:
    uses: znat/gitpulse/.github/workflows/analyze.yml@v1
    permissions:
      contents: write
      pages: write
      id-token: write
    secrets:
      ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

Then enable GitHub Pages → Source: GitHub Actions.

## Develop locally

```bash
yarn install
yarn dev
```

## License

AGPL-3.0-or-later — see [LICENSE](./LICENSE).
