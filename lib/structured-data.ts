import type { Article } from '@/data/types';

const BASE = 'https://helloai.com';
// The site mark (the speech-bubble icon that is also the favicon). Absolute, as schema.org logos must be.
export const LOGO_URL = `${BASE}/icon.svg`;
const ORG_ID = `${BASE}/#organization`;

const author = { '@type': 'Person', name: 'Clement Machado', url: 'https://x.com/helloaix' };

/** Home page JSON-LD: WebSite and Organization in one @graph, the site referencing the organization as publisher. */
export function websiteGraph() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Organization', '@id': ORG_ID, name: 'Hello, AI', url: BASE, logo: LOGO_URL, founder: author },
      {
        '@type': 'WebSite',
        '@id': `${BASE}/#website`,
        name: 'Hello, AI',
        url: BASE,
        description: "Your unbiased guide to the world's smartest AIs",
        author,
        publisher: { '@id': ORG_ID },
      },
    ],
  };
}

/** Article JSON-LD. dateModified is the optional `updated` date, else the publication date. */
export function articleJsonLd(article: Article & { updated?: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.excerpt,
    image: `${BASE}/articles/${article.slug}/opengraph-image`,
    datePublished: article.date,
    dateModified: article.updated ?? article.date,
    mainEntityOfPage: `${BASE}/articles/${article.slug}`,
    author,
    publisher: { '@type': 'Organization', '@id': ORG_ID, name: 'Hello, AI', url: BASE, logo: { '@type': 'ImageObject', url: LOGO_URL } },
  };
}
