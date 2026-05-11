import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getArticleBySlug, getArticles, formatDate } from '@/data';
import type { Metadata } from 'next';

// Generate static paths for all articles
export function generateStaticParams() {
  return getArticles().map((article) => ({
    slug: article.slug,
  }));
}

// Dynamic SEO metadata per article
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) return {};

  const url = `https://helloai.com/articles/${slug}`;

  return {
    title: article.title,
    description: article.excerpt,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: article.title,
      description: article.excerpt,
      type: 'article',
      url,
      publishedTime: article.date,
      authors: ['Clement Machado'],
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: article.excerpt,
    },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  return (
    <article className="article-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: article.title,
            description: article.excerpt,
            datePublished: article.date,
            url: `https://helloai.com/articles/${article.slug}`,
            author: {
              '@type': 'Person',
              name: 'Clement Machado',
              url: 'https://x.com/MachadoClement',
            },
            publisher: {
              '@type': 'Organization',
              name: 'Hello, AI',
              url: 'https://helloai.com',
            },
          }),
        }}
      />
      <Link href="/#articles" className="article-page-back">
        ← Back to Hello, AI
      </Link>

      <div className="article-page-meta">
        <span className="article-category">{article.category}</span>
        <span className="article-readtime">{article.readTime}</span>
        <span className="article-date">{formatDate(article.date)}</span>
      </div>

      <h1 className="article-page-title">{article.title}</h1>
      <p className="article-page-excerpt">{article.excerpt}</p>

      <div className="article-page-body">
        {article.content.map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </div>

      <div className="article-page-footer">
        <Link href="/#articles">← More from Hello, AI</Link>
      </div>
    </article>
  );
}
