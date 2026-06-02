#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnvLocal } from './dotenv-local.ts';

// Pull in .env.local before any subcommand module is imported. Subcommand
// modules are loaded lazily via dynamic import below so that even a future
// top-level `process.env.X` read in one of them sees the loaded values.
// No-op in CI and when the file is missing — see dotenv-local.ts.
loadEnvLocal();

const here = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(here, '..', 'package.json'), 'utf8')) as {
  name: string;
  version: string;
};

function printUsage(): void {
  console.log(
    `gitpulse — editorial story feed for your repo

Usage: gitpulse <command>

Commands:
  analyze                     Generate stories from git history and write them to GITPULSE_DATA_DIR.
  build                       Fetch the matching gitpulse site, inject data, build static output.
  image <path|PR-URL|site-URL>
                              (Re)generate the illustration for a single feature story. Accepts a
                              story JSON path (e.g. .gitpulse/data/stories/pr-52.json), a GitHub PR
                              URL (e.g. https://github.com/znat/gitpulse/pull/52), or a deployed-
                              site URL with ?story=<id> (e.g. https://<site>/?story=pr-52). When
                              the story file isn't present locally, fetches it from the site URL
                              (or cfg.siteUrl) and writes it under GITPULSE_DATA_DIR. Writes the
                              uploaded image URL back into the story JSON.
  --version                   Print the CLI version.
  --help                      Show this help.

Configuration is split: settings live in .gitpulse.json (committed),
secrets live in environment variables.

Secrets (env, never committed):
  OPENAI_API_KEY / ANTHROPIC_API_KEY   Text-LLM key, matching text.provider.
  GITHUB_TOKEN              Enables PR / release context lookups via GraphQL.
  GOOGLE_API_KEY / GEMINI_API_KEY      Image generation (when images.ai set).
  GITPULSE_PASSWORD         Encrypts the published site, if set.

Settings (.gitpulse.json at the repo root, all optional):
  text                      { provider: openai | anthropic | openai-compatible,
                              model, baseURL (compatible only), temperature }.
                              Default: openai / gpt-4o-mini.
  analysis                  { branch, bootstrapDays (30), concurrency (10),
                              limit, releasesCap (20), includePrereleases (true) }.
  site                      { url, basePath, repo, ref } — deploy coordinates.
  paths                     { dataDir, storiesDir, releasesDir, outDir }.
  images, theme, labels     See the README.

Auto-detected / env-overridable (deploy-environment-specific):
  GITHUB_REPOSITORY         <owner>/<repo>. Auto-set in GitHub Actions.
  GITPULSE_SITE_URL         Overrides site.url. Auto-detected on Vercel/Netlify/
                            Cloudflare Pages; else https://<owner>.github.io/<repo>/.
  GITPULSE_BASE_PATH        Overrides site.basePath ("none" for Vercel/Netlify).
  GITPULSE_DATA_DIR / GITPULSE_OUT_DIR / GITPULSE_SITE_REPO / GITPULSE_SITE_REF
                            Override the matching paths.* / site.* settings.

See https://github.com/znat/gitpulse for full docs.`,
  );
}

const sub = process.argv[2];
try {
  switch (sub) {
    case 'analyze': {
      const { runAnalyzer } = await import('./index.ts');
      await runAnalyzer();
      break;
    }
    case 'build': {
      const { runBuild } = await import('./build.ts');
      await runBuild();
      break;
    }
    case 'image': {
      const { runImageCommand } = await import('./image-cmd.ts');
      await runImageCommand(process.argv[3]);
      break;
    }
    case '--version':
    case '-v':
      console.log(`${pkg.name} ${pkg.version}`);
      break;
    case undefined:
    case '--help':
    case '-h':
      printUsage();
      break;
    default:
      console.error(`Unknown command: ${sub}\n`);
      printUsage();
      process.exit(2);
  }
} catch (err) {
  console.error('[gitpulse] fatal', err);
  process.exit(1);
}
