'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_LINKS = ['models', 'leaderboard', 'local', 'insights', 'articles'] as const;

export default function Nav({ activeSection = '' }: { activeSection?: string }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const onHome = pathname === '/';
  const hrefFor = (id: string) => (onHome ? `#${id}` : `/#${id}`);

  return (
    <nav className="nav">
      <Link href="/" className="nav-brand" onClick={() => setMenuOpen(false)}>
        <span className="nav-logo">hello</span>
        <span className="nav-badge">AI</span>
      </Link>

      <div className="nav-links-desktop">
        {NAV_LINKS.map((s) => (
          <a
            key={s}
            href={hrefFor(s)}
            className={`nav-link ${activeSection === s ? 'nav-link-active' : ''}`}
          >
            {s}
          </a>
        ))}
      </div>

      <button
        className="nav-hamburger"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Toggle menu"
        aria-expanded={menuOpen}
        aria-controls="nav-mobile-menu"
      >
        <span className={`hamburger-line ${menuOpen ? 'hamburger-open-1' : ''}`} />
        <span className={`hamburger-line ${menuOpen ? 'hamburger-open-2' : ''}`} />
        <span className={`hamburger-line ${menuOpen ? 'hamburger-open-3' : ''}`} />
      </button>

      {menuOpen && (
        <div id="nav-mobile-menu" className="nav-mobile-menu">
          {NAV_LINKS.map((s) => (
            <a
              key={s}
              href={hrefFor(s)}
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
