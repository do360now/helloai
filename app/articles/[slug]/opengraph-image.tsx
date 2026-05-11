import { ImageResponse } from 'next/og';
import { getArticleBySlug } from '@/data';

export const runtime = 'edge';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const CATEGORY_COLORS: Record<string, string> = {
  Review: '#00E5A0',
  Analysis: '#6366F1',
  Opinion: '#F472B6',
  Discovery: '#FBBF24',
};

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);

  const title = article?.title ?? 'Hello, AI';
  const excerpt = article?.excerpt ?? 'Your unbiased guide to the world\'s smartest AIs';
  const category = article?.category ?? 'Article';
  const categoryColor = CATEGORY_COLORS[category] ?? '#00E5A0';

  return new ImageResponse(
    (
      <div
        style={{
          background: '#080A12',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 72px',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* Grid background */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(rgba(0,229,160,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,160,0.03) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        {/* Glow */}
        <div
          style={{
            position: 'absolute',
            bottom: '-80px',
            right: '-80px',
            width: '500px',
            height: '500px',
            background: `radial-gradient(ellipse, ${categoryColor}18 0%, transparent 70%)`,
          }}
        />

        {/* Top: site brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #00E5A0, #6366F1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
            }}
          >
            🤖
          </div>
          <span style={{ color: '#00E5A0', fontSize: '20px', fontWeight: 700 }}>
            Hello, AI
          </span>
          <span style={{ color: '#2D3748', fontSize: '20px', margin: '0 4px' }}>·</span>
          <div
            style={{
              padding: '4px 14px',
              borderRadius: '999px',
              border: `1px solid ${categoryColor}50`,
              background: `${categoryColor}15`,
              color: categoryColor,
              fontSize: '14px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            {category}
          </div>
        </div>

        {/* Middle: title + excerpt */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1, justifyContent: 'center' }}>
          <div
            style={{
              color: '#FFFFFF',
              fontSize: title.length > 60 ? '42px' : '52px',
              fontWeight: 800,
              lineHeight: 1.2,
              letterSpacing: '-0.5px',
              maxWidth: '900px',
            }}
          >
            {title}
          </div>
          <div
            style={{
              color: '#8B9CB6',
              fontSize: '20px',
              lineHeight: 1.55,
              maxWidth: '820px',
            }}
          >
            {excerpt.length > 140 ? excerpt.slice(0, 137) + '…' : excerpt}
          </div>
        </div>

        {/* Bottom: URL */}
        <div style={{ color: '#4A5568', fontSize: '16px', letterSpacing: '0.5px' }}>
          helloai.com/articles/{slug}
        </div>
      </div>
    ),
    { ...size }
  );
}
