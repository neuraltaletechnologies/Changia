import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: 'Googlebot',
        allow: '/',
        crawlDelay: 10,
      },
      {
        userAgent: 'Yandex',
        allow: '/',
        crawlDelay: 2,
      },
      {
        userAgent: 'archive.org_bot',
        allow: '/',
        crawlDelay: 2,
      },
      {
        userAgent: '*',
        disallow: '/',
      },
    ],
    sitemap: 'https://screwfast.uk/sitemap.xml',
  };
}