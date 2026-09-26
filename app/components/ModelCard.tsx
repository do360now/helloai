'use client';

import { useState } from 'react';
import type { Model } from '@/data/types';
import { formatUsdPerMillion, formatContextWindow, formatElo } from '@/data';
import LiveCounter from './LiveCounter';

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

// Cards link off-site, so a model's count is its click-throughs, recorded once per IP per day server-side.
function recordClick(id: string) {
  try {
    navigator.sendBeacon('/api/views', new Blob([JSON.stringify({ slug: `model/${id}` })], { type: 'application/json' }));
  } catch {
    /* counting must never block the link */
  }
}

export default function ModelCard({
  model,
  index,
  bestMatch,
  dimmed,
  unrated,
  whyRank,
}: {
  model: Model;
  index: number;
  bestMatch?: boolean;
  dimmed?: boolean;
  /** Shown in the "not yet rated" group: no rank number and never a best match. */
  unrated?: boolean;
  /** Where the rank comes from, e.g. "Curator's pick +0.40 · Elo +0.35 · …". Shown only while filters are active. */
  whyRank?: string;
}) {
  const [hovered, setHovered] = useState(false);
  const elo = formatElo(model);

  return (
    <a
      href={model.url}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => recordClick(model.id)}
      className="model-card"
      style={{
        background: hovered
          ? `linear-gradient(135deg, rgba(${hexToRgb(model.color)},0.08) 0%, rgba(8,10,18,0.95) 100%)`
          : bestMatch
          ? `linear-gradient(135deg, rgba(${hexToRgb(model.color)},0.05) 0%, rgba(8,10,18,0.95) 100%)`
          : 'rgba(255,255,255,0.02)',
        borderColor: bestMatch ? model.color + '60' : hovered ? model.color + '40' : 'rgba(255,255,255,0.06)',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        opacity: dimmed ? 0.35 : 1,
        animationDelay: `${index * 0.1}s`,
        transition: 'all 0.3s ease',
      }}
    >
      {bestMatch && !unrated && (
        <div className="model-best-match">
          ✦ Best match
        </div>
      )}

      {!unrated && <div className="model-rank-bg">{index + 1}</div>}

      <span className="model-tag" style={{ color: model.color, borderColor: model.color + '30' }}>
        {model.tag}
      </span>

      <div className="model-provider">{model.provider}</div>
      <h3 className="model-name">{model.name}</h3>
      <p className="model-desc">{model.desc}</p>

      {whyRank && !unrated && <p className="model-why-rank">Why this rank: {whyRank}</p>}

      <div className="model-specs">
        <span className="model-spec">{formatUsdPerMillion(model.cost_per_million_tokens)} in</span>
        <span className="model-spec">{formatUsdPerMillion(model.cost_per_million_tokens_output)} out</span>
        <span className="model-spec">{formatContextWindow(model.context_window)}</span>
      </div>

      <div className="model-footer">
        <span className="model-elo">
          <span title={elo.arenaModel ? `Arena model: ${elo.arenaModel}` : undefined}>{elo.score} Elo</span>
          {elo.config && <span className="model-elo-config"> · {elo.config}</span>}
          {elo.note && <span className={`model-elo-note ${unrated ? 'model-elo-note-unrated' : ''}`}>{elo.note}</span>}
        </span>
        <LiveCounter slug={`model/${model.id}`} variant="views" noun="clicks" />
        <span className="model-cta" style={{ color: hovered ? model.color : 'rgba(255,255,255,0.3)' }}>
          Try it →
        </span>
      </div>
    </a>
  );
}
