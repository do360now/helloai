import Link from 'next/link';
import { getArticles, formatDate } from '@/data';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Model Reviews & Analysis',
  description: 'Weekly analysis, honest takes, and hidden gems from the AI frontier. Benchmarks, pricing shifts, and model comparisons — no engagement bait.',
  alternates: {
    canonical: 'https://helloai.com/articles',
  },
  openGraph: {
    title: 'AI Model Reviews & Analysis | Hello, AI',
    description: 'Weekly analysis, honest takes, and hidden gems from the AI frontier. Benchmarks, pricing shifts, and model comparisons — no engagement bait.',
    type: 'website',
    url: 'https://helloai.com/articles',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Model Reviews & Analysis | Hello, AI',
    description: 'Weekly analysis, honest takes, and hidden gems from the AI frontier. Benchmarks, pricing shifts, and model comparisons — no engagement bait.',
  },
};

export default function ArticlesPage() {
  const articles = getArticles();

  return (
    <div className="articles-index-page">
      <Link href="/" className="article-page-back">
        ← Back to Hello, AI
      </Link>

      <div className="articles-index-header">
        <span className="section-label">Latest</span>
        <h1 className="articles-index-title">Dispatches from the frontier</h1>
        <p className="articles-index-subtitle">
          Weekly analysis, honest takes, and hidden gems. No engagement bait.
        </p>
      </div>

      <div className="articles-index-list">
        {articles.map((article, i) => (
          <Link
            key={article.slug}
            href={`/articles/${article.slug}`}
            className="articles-index-card"
            style={{ animationDelay: `${i * 0.08}s` }}
          >
            <div className="article-meta">
              <span className="article-category">{article.category}</span>
              <span className="article-readtime">{article.readTime}</span>
              <span className="article-date">{formatDate(article.date)}</span>
            </div>
            <h2 className="articles-index-card-title">{article.title}</h2>
            <p className="article-excerpt">{article.excerpt}</p>
            <span className="articles-index-read-more">Read article →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
