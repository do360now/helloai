import Link from 'next/link';
import type { SiteConfig } from '@/data/types';

export default function Hero({ config }: { config: SiteConfig }) {
  const formatted = new Date(config.lastUpdated + 'T00:00:00Z').toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });

  return (
    <section id="top" className="hero">
      <div className="hero-glow-1" />
      <div className="hero-glow-2" />

      <div className="hero-content">
        <div className="hero-pill">Updated {formatted}</div>

        <h1 className="hero-title">
          Hello, <span className="hero-gradient">Ai</span>
        </h1>

        <p className="hero-tagline">{config.tagline}</p>

        <div className="hero-ctas">
          <a href="#models" className="btn-primary">See this week&apos;s models →</a>
          <Link href="/articles" className="btn-secondary">Read latest →</Link>
        </div>
      </div>
    </section>
  );
}
