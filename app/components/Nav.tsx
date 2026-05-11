'use client';

import { useState } from 'react';

const NAV_LINKS = ['models', 'leaderboard', 'local', 'insights', 'articles'] as const;

export default function Nav({ activeSection }: { activeSection: string }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="nav">
      <div className="nav-brand">
        <span className="nav-logo">hello</span>
        <span className="nav-badge">AI</span>
      </div>

      {/* Desktop links */}
      <div className="nav-links-desktop">
        {NAV_LINKS.map((s) => (
          <a
            key={s}
            href={`#${s}`}
            className={`nav-link ${activeSection === s ? 'nav-link-active' : ''}`}
          >
            {s}
          </a>
        ))}
      </div>

      {/* Mobile hamburger */}
      <button
        className="nav-hamburger"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Toggle menu"
      >
        <span className={`hamburger-line ${menuOpen ? 'hamburger-open-1' : ''}`} />
        <span className={`hamburger-line ${menuOpen ? 'hamburger-open-2' : ''}`} />
        <span className={`hamburger-line ${menuOpen ? 'hamburger-open-3' : ''}`} />
      </button>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="nav-mobile-menu">
          {NAV_LINKS.map((s) => (
            <a
              key={s}
              href={`#${s}`}
              className={`nav-mobile-link ${activeSection === s ? 'nav-link-active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              {s}
            </a>
          ))}
        </div>
      )}
    </nav>
  );
}
