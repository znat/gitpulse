// Mirror of next.config.js's basePath, exposed to client code via the
// NEXT_PUBLIC_BASE_PATH env var. Use this when constructing URLs for
// raw fetch() calls — Next prepends basePath to <Link> hrefs and asset
// imports automatically, but not to fetch().
export const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
