/** @type {import('next').NextConfig} */
const repo = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? '';
const fallbackBasePath = repo ? `/${repo}` : '';
// Vercel/Netlify users set GITPULSE_BASE_PATH="" to disable the GH Pages prefix.
const basePath = process.env.GITPULSE_BASE_PATH ?? fallbackBasePath;
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
