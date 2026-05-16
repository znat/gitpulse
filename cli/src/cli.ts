#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnvLocal } from './dotenv-local.ts';
import { runAnalyzer } from './index.ts';
import { runBuild } from './build.ts';
import { runImageCommand } from './image-cmd.ts';

// Pull in .env.local before any module reads process.env. No-op in CI and
// when the file is missing — see dotenv-local.ts.
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
  image <path|PR-URL>         (Re)generate the illustration for a single feature story. Accepts a
                              story JSON path (e.g. .gitpulse/data/stories/pr-52.json) or a GitHub
                              PR URL (e.g. https://github.com/znat/gitpulse/pull/52). Writes the
                              uploaded image URL back into the story JSON.
  --version                   Print the CLI version.
  --help                      Show this help.

Configuration is via environment variables (no flags). Required:
  OPENAI_API_KEY            API key for the AI provider configured below.
  GITHUB_REPOSITORY         <owner>/<repo>. Auto-set in GitHub Actions.

Common analyze env vars (all optional):
  GITHUB_TOKEN              Enables PR / release context lookups via GraphQL.
  AI_MODEL                  Default: gpt-4o-mini.
  AI_PROTOCOL               openai | anthropic. Default: openai.
  AI_BASE_URL               Custom OpenAI/Anthropic-compatible endpoint.
  AI_TEMPERATURE            Default: 0.
  GITPULSE_DATA_DIR         Where to write story JSON. Default: \${PWD}/.gitpulse/data.
  GITPULSE_BOOTSTRAP_DAYS   First-run history window. Default: 30.
  GITPULSE_CONCURRENCY      Default: 10.
  GITPULSE_RELEASES_CAP     Default: 20. Set to 0 to skip releases.
  GITPULSE_INCLUDE_PRERELEASES  Default: true.
  GITPULSE_SITE_URL         Where the deployed site lives (for state restore).
                            Auto-detected on Vercel, Netlify, Cloudflare Pages.
                            Falls back to https://<owner>.github.io/<repo>/.

Common build env vars (all optional):
  GITPULSE_DATA_DIR         Source of analyzer JSON.    Default: \${PWD}/.gitpulse/data.
  GITPULSE_OUT_DIR          Where to write the built site. Default: \${PWD}/.gitpulse/out.
  GITPULSE_SITE_REPO        Override fork.              Default: znat/gitpulse.
  GITPULSE_SITE_REF         Override version.           Default: v<this-cli-version>.
  GITPULSE_BASE_PATH        Override Pages basePath ("none" for Vercel/Netlify).
                            Default: derived from GITHUB_REPOSITORY.

See https://github.com/znat/gitpulse for full docs.`,
  );
}

const sub = process.argv[2];
try {
  switch (sub) {
    case 'analyze':
      await runAnalyzer();
      break;
    case 'build':
      await runBuild();
      break;
    case 'image':
      await runImageCommand(process.argv[3]);
      break;
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
