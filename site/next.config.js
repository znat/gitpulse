/** @type {import('next').NextConfig} */
const repo = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? '';
const basePath = repo ? `/${repo}` : '';

const nextConfig = {
  output: 'export',
  basePath,
  assetPrefix: repo ? `/${repo}/` : '',
  images: { unoptimized: true },
  trailingSlash: true,
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

module.exports = nextConfig;
