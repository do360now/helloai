import type { Model } from '@/data/types';
import { getModels, getArticles, getSiteConfig, formatElo, formatUsdPerMillion, formatContextWindow } from '@/data';

const BASE = 'https://helloai.com';

/**
 * Rendered from the data on every call, never a static file, so it cannot drift from the site
 * (docs/review/seo-and-discoverability.md, step 2). A model without an Elo of its own is labelled.
 */
export function buildLlmsTxt(models: Model[] = getModels()): string {
  const cfg = getSiteConfig();
  const articles = getArticles();

  const modelLines = models.map((m) => {
    const e = formatElo(m);
    // The note comes from formatElo, so each state says what is true for it (borrowed, missing or stale).
    const elo = e.state === 'rated'
      ? `Elo ${e.score}${e.config ? ` (${e.config})` : ''}`
      : `${e.note ?? ''} Stored number ${e.score}`.trim();
    return `- ${m.name} (${m.provider}): ${elo}; ${formatUsdPerMillion(m.cost_per_million_tokens)} in, ${formatUsdPerMillion(m.cost_per_million_tokens_output)} out; ${formatContextWindow(m.context_window)}; ${m.url}`;
  });

  const articleLines = articles.map((a) => `- ${a.title}: ${BASE}/articles/${a.slug} (${a.date})`);

  return [
    '# Hello, AI',
    `> Curated directory of frontier AI models with LMArena text Elo, list prices and context windows, plus task-specific recommendations. Updated weekly (${cfg.lastUpdated}).`,
    '',
    '## API (no auth, 100 requests per minute per IP)',
    `- [OpenAPI spec](${BASE}/api/openapi.json)`,
    `- [Status and data freshness](${BASE}/api/status)`,
    `- [All models](${BASE}/api/models)`,
    `- [Recommend](${BASE}/api/recommend?task=coding): params task, max_cost, min_context, provider, limit. \`score\` is an ordering aid, not a quality measure: compare scores only between calls that share the same \`meta.scoring\` version, snapshot and resolved task.`,
    '',
    '## Notes',
    '- Elo is the LMArena (arena.ai) text-overall board, recorded per model in `elo_source`. A model described as not yet rated, missing or stale has no usable Elo of its own and is not ranked.',
    '',
    '## Models tracked',
    ...modelLines,
    '',
    '## Articles',
    ...articleLines,
    '',
    '## Related',
    '- [HelloAI Marketplace](https://app.helloai.com): our own product, run by the same team as this site. Its MCP server is per-account, so there is no public MCP URL to list here.',
    '',
  ].join('\n');
}

/** llms.txt plus every article in full. */
export function buildLlmsFullTxt(): string {
  const articles = getArticles();
  const body = articles
    .map((a) => [`### ${a.title}`, `${BASE}/articles/${a.slug} (${a.date})`, '', ...a.content, ''].join('\n'))
    .join('\n');
  return `${buildLlmsTxt()}\n## Article text\n\n${body}`;
}
