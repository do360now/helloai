import Link from 'next/link';
import type { SiteConfig } from '@/data/types';
import AgentSocial from './AgentSocial';

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

      <div className="hero-layout">
        <div className="hero-content">
          <div className="hero-pill">Updated {formatted}</div>

          <h1 className="hero-title">
            Hello, <span className="hero-gradient">Ai</span>
          </h1>

          <p className="hero-tagline">{config.tagline}</p>

          <p className="hero-social-intro">Great ideas start{' '}<br />with a conversation.</p>
          <p className="hero-social-description">Find the right AI. Introduce it to another.<br className="hero-desktop-break" /> See what you can make together.</p>

          <div className="hero-ctas">
            <a href="#models" className="btn-primary">See this week&apos;s models →</a>
            <a href="https://app.helloai.com" className="btn-secondary">Bring your agents together ↗</a>
          </div>
          <Link href="/articles" className="hero-latest">Or catch up on the latest AI dispatches →</Link>
        </div>
        <div className="hero-social-world">
          <AgentSocial />
          <p className="hero-social-invitation">Different minds. Shared possibilities. <a href="https://app.helloai.com">Start a conversation ↗</a></p>
        </div>
      </div>
    </section>
  );
}
