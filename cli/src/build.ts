// `gitpulse build` — fetch the gitpulse Next.js site at the matching version,
// inject the analyzer's data into it, run the static export, and place the
// result at GITPULSE_OUT_DIR. Env-vars only.

import { execFileSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

interface BuildConfig {
  dataDir: string;
  outDir: string;
  siteRepo: string;
  siteRef: string;
  basePath: string | undefined;
}

function readCliVersion(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const pkgPath = join(here, '..', 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { version: string };
  return pkg.version;
}

function loadBuildConfig(env = process.env): BuildConfig {
  const cwd = process.cwd();
  const cliVersion = readCliVersion();
  return {
    dataDir: env.GITPULSE_DATA_DIR
      ? resolve(env.GITPULSE_DATA_DIR)
      : join(cwd, '.gitpulse', 'data'),
    outDir: env.GITPULSE_OUT_DIR
      ? resolve(env.GITPULSE_OUT_DIR)
      : join(cwd, '.gitpulse', 'out'),
    siteRepo: env.GITPULSE_SITE_REPO ?? 'znat/gitpulse',
    siteRef: env.GITPULSE_SITE_REF ?? `v${cliVersion}`,
    basePath: env.GITPULSE_BASE_PATH,
  };
}

// Reject obviously dangerous values for siteRepo/siteRef before we hand them
// to git. We use execFileSync (no shell), so this is defence-in-depth, not the
// primary line of defence.
function assertSafe(label: string, value: string): void {
  if (!/^[A-Za-z0-9._\-/]+$/.test(value)) {
    throw new Error(`[gitpulse build] refusing unsafe ${label}: ${JSON.stringify(value)}`);
  }
}

export async function runBuild(): Promise<void> {
  const cfg = loadBuildConfig();

  if (!existsSync(cfg.dataDir)) {
    throw new Error(
      `[gitpulse build] data directory not found: ${cfg.dataDir}\n` +
        `Run 'gitpulse analyze' first, or set GITPULSE_DATA_DIR to point at existing data.`,
    );
  }
  assertSafe('GITPULSE_SITE_REPO', cfg.siteRepo);
  assertSafe('GITPULSE_SITE_REF', cfg.siteRef);

  console.log(`[gitpulse build] site=${cfg.siteRepo}@${cfg.siteRef}`);
  console.log(`[gitpulse build] data=${cfg.dataDir}`);
  console.log(`[gitpulse build] out=${cfg.outDir}`);
  if (cfg.basePath !== undefined) {
    console.log(`[gitpulse build] basePath=${cfg.basePath || '(empty)'}`);
  }

  const tmp = mkdtempSync(join(tmpdir(), 'gitpulse-build-'));
  try {
    console.log(`[gitpulse build] cloning into ${tmp}`);
    execFileSync(
      'git',
      [
        'clone',
        '--depth', '1',
        '--branch', cfg.siteRef,
        `https://github.com/${cfg.siteRepo}.git`,
        tmp,
      ],
      { stdio: 'inherit' },
    );

    const sitePublicData = join(tmp, 'site', 'public', 'data');
    mkdirSync(sitePublicData, { recursive: true });
    cpSync(cfg.dataDir, sitePublicData, { recursive: true });

    console.log('[gitpulse build] yarn install');
    execFileSync('yarn', ['install', '--frozen-lockfile'], {
      cwd: tmp,
      stdio: 'inherit',
    });

    console.log('[gitpulse build] next build');
    const buildEnv = { ...process.env };
    if (cfg.basePath !== undefined) {
      buildEnv.GITPULSE_BASE_PATH = cfg.basePath;
    }
    execFileSync('yarn', ['workspace', '@gitpulse/site', 'build'], {
      cwd: tmp,
      stdio: 'inherit',
      env: buildEnv,
    });

    if (existsSync(cfg.outDir)) {
      rmSync(cfg.outDir, { recursive: true, force: true });
    }
    mkdirSync(dirname(cfg.outDir), { recursive: true });
    cpSync(join(tmp, 'site', 'out'), cfg.outDir, { recursive: true });
    console.log(`[gitpulse build] wrote ${cfg.outDir}`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}
