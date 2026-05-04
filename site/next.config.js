/** @type {import('next').NextConfig} */
// GITPULSE_BASE_PATH semantics:
//   undefined / '' / 'auto'  → derive /<repo> from GITHUB_REPOSITORY (project
//                              Pages), UNLESS we're on a PaaS that serves at
//                              root (Vercel / Netlify / Cloudflare Pages) —
//                              detected from their build env vars
//   'none'                   → '' (explicit root deployment — user/org Pages,
//                              custom domains)
//   anything else            → take literally (e.g. '/blog' for sub-path mounts)
const isPaaSRootDeploy =
  !!process.env.VERCEL ||
  process.env.NETLIFY === 'true' ||
  process.env.CF_PAGES === '1';
const repo = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? '';
const fallbackBasePath = isPaaSRootDeploy ? '' : repo ? `/${repo}` : '';
const basePathOverride = process.env.GITPULSE_BASE_PATH;
function resolveBasePath() {
  if (!basePathOverride || basePathOverride === 'auto') return fallbackBasePath;
  if (basePathOverride === 'none') return '';
  return basePathOverride;
}
const basePath = resolveBasePath();
const assetPrefix = basePath ? `${basePath}/` : '';

const nextConfig = {
  output: 'export',
  basePath,
  assetPrefix,
  images: { unoptimized: true },
  trailingSlash: true,
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

module.exports = nextConfig;
