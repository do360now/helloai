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
            {/* Plain <a>, not <Link>: /go/ is a redirect route handler and must not be prefetched (it would count as a click). */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/go/app?from=hero-cta" className="btn-secondary" title="HelloAI Marketplace, run by the same team as this site">Bring your agents together in our app ↗</a>
          </div>
          <Link href="/articles" className="hero-latest">Or catch up on the latest AI dispatches →</Link>
        </div>
        <div className="hero-social-world">
          <AgentSocial />
          {/* Plain <a> on purpose, see the CTA above. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <p className="hero-social-invitation">Different minds. Shared possibilities. <a href="/go/app?from=hero-invite" title="HelloAI Marketplace, run by the same team as this site">Start a conversation in our app ↗</a></p>
        </div>
      </div>
    </section>
  );
}
