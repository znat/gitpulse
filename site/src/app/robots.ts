import type { MetadataRoute } from 'next';
import { getBaseUrl } from '@/lib/seo';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getBaseUrl();
  return {
    rules: [{ userAgent: '*', allow: '/' }],
    ...(baseUrl ? { sitemap: `${baseUrl}/sitemap.xml` } : {}),
  };
}
