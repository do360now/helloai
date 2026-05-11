'use client';

import { useState, useEffect } from 'react';
import ParticleCanvas from './ParticleCanvas';
import type { SiteConfig } from '@/data/types';

export default function Hero({ config }: { config: SiteConfig }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setTimeout(() => setVisible(true), 100);
  }, []);

  const formatted = new Date(config.lastUpdated + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <section className="hero">
      <ParticleCanvas />
      <div className="hero-glow-1" />
      <div className="hero-glow-2" />

      <div className={`hero-content ${visible ? 'hero-visible' : ''}`}>
        <div className="hero-pill">Updated {formatted}</div>

        <h1 className="hero-title">
          Hello, <span className="hero-gradient">Ai</span>
        </h1>

        <p className="hero-tagline">{config.tagline}</p>

        <div className="hero-ctas">
          <a href="#models" className="btn-primary">Chat with one now →</a>
          <a href="#articles" className="btn-secondary">Read Latest →</a>
        </div>
      </div>

      <div className="scroll-indicator">
        <div className="scroll-line" />
      </div>
    </section>
  );
}
