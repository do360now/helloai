import { getArticles, getSiteConfig } from '@/data';
import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const articles = getArticles();
  const baseUrl = 'https://helloai.com';
  // The data date is the honest last-modified for the pages that render the data, not the build time.
  const dataDate = new Date(getSiteConfig().lastUpdated);

  const articleEntries: MetadataRoute.Sitemap = articles.map((article) => ({
    url: `${baseUrl}/articles/${article.slug}`,
    lastModified: new Date(article.date),
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  return [
    {
      url: baseUrl,
      lastModified: dataDate,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/articles`,
      lastModified: dataDate,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    ...articleEntries,
  ];
}
