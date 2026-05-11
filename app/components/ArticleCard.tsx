'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Article } from '@/data/types';
import { formatDate } from '@/data';

export default function ArticleCard({ article, index }: { article: Article; index: number }) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link
      href={`/articles/${article.slug}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="article-card"
      style={{
        background: hovered ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.015)',
        borderColor: hovered ? 'rgba(0,229,160,0.2)' : 'rgba(255,255,255,0.05)',
        transform: hovered ? 'translateY(-2px)' : 'none',
        animationDelay: `${index * 0.1}s`,
      }}
    >
      <div className="article-meta">
        <span className="article-category">{article.category}</span>
        <span className="article-readtime">{article.readTime}</span>
      </div>

      <h3 className="article-title">{article.title}</h3>
      <p className="article-excerpt">{article.excerpt}</p>
      <div className="article-date">{formatDate(article.date)}</div>
    </Link>
  );
}
