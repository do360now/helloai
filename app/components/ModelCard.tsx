'use client';

import { useState } from 'react';
import type { Model } from '@/data/types';

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

export default function ModelCard({
  model,
  index,
  bestMatch,
  dimmed,
}: {
  model: Model;
  index: number;
  bestMatch?: boolean;
  dimmed?: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <a
      href={model.url}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
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
      {bestMatch && (
        <div className="model-best-match">
          ✦ Best match
        </div>
      )}

      <div className="model-rank-bg">{index + 1}</div>

      <span className="model-tag" style={{ color: model.color, borderColor: model.color + '30' }}>
        {model.tag}
      </span>

      <div className="model-provider">{model.provider}</div>
      <h3 className="model-name">{model.name}</h3>
      <p className="model-desc">{model.desc}</p>

      <div className="model-footer">
        <span className="model-elo">~{model.elo} Elo</span>
        <span className="model-cta" style={{ color: hovered ? model.color : 'rgba(255,255,255,0.3)' }}>
          Try it →
        </span>
      </div>
    </a>
  );
}
