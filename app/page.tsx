'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Nav, Hero, ModelCard, CategoryIcon, SectionHeader, ArticleCard, OpenWeightCard } from './components';
import ModelFilter from './components/ModelFilter';
import { getSiteConfig, getModels, getCategories, getHomepageArticles, getOpenWeightModels, formatDate, formatUsdPerMillion, formatContextWindow, formatElo, boardDateLabel } from '@/data';
import { scoreAndRank, categoryTaskKeyword, isRated } from '@/data/recommend';

const config = getSiteConfig();
const models = getModels();
const categories = getCategories();
const homepageArticles = getHomepageArticles();
const openWeightModels = getOpenWeightModels();

function ModelsSection({
  task,
  maxCost,
  onTaskChange,
  onMaxCostChange,
}: {
  task: string;
  maxCost: number | null;
  onTaskChange: (t: string) => void;
  onMaxCostChange: (v: number | null) => void;
}) {
  const hasFilters = task.trim() !== '' || maxCost !== null;

  // Rated models rank; models whose Elo is a predecessor's, missing or stale are listed
  // separately below, never in the ranked order and never as a best match.
  const { ranked, unrated } = useMemo(() => {
    const r = scoreAndRank(models, categories, { task: task || null, maxCost });
    if (!hasFilters) {
      return {
        ranked: models.filter(isRated).map((m) => ({ model: m, score: 0, reasons: [] as string[] })),
        unrated: r.unrated,
      };
    }
    return { ranked: r.recommendations, unrated: r.unrated };
  }, [task, maxCost, hasFilters]);

  const topScore = ranked[0]?.score ?? 0;

  return (
    <section id="models" className="models-section">
      <SectionHeader
        label="Featured Models"
        title="This week&apos;s frontier"
        subtitle={`${models.length} frontier models we track, chosen by us. Filter by task or price. Updated weekly.`}
      />
      <ModelFilter
        categories={categories}
        task={task}
        maxCost={maxCost}
        onTaskChange={onTaskChange}
        onMaxCostChange={onMaxCostChange}
        onClear={() => { onTaskChange(''); onMaxCostChange(null); }}
        hasFilters={hasFilters}
      />
      <div className="models-grid">
        {ranked.map(({ model, score }, i) => (
          <ModelCard
            key={model.id}
            model={model}
            index={i}
            bestMatch={hasFilters && i === 0 && topScore > 0}
            dimmed={hasFilters && score === 0 && topScore > 0}
          />
        ))}
      </div>
      {unrated.length > 0 && (
        <div className="models-unrated">
          <h3 className="models-unrated-heading">Not yet rated</h3>
          <p className="models-unrated-note">
            These models have no Elo of their own on the board yet. They are listed here, unranked, and never count toward a best match.
          </p>
          <div className="models-grid">
            {unrated.map(({ model }, i) => (
              <ModelCard key={model.id} model={model} index={i} unrated />
            ))}
          </div>
        </div>
      )}
      {hasFilters && ranked.length === 0 && unrated.length === 0 && (
        <p className="models-no-results">No models match those filters. Try relaxing your constraints.</p>
      )}
    </section>
  );
}

// The board date is read from the data, so this line cannot drift from the numbers. When rows come from
// different snapshots it is a range, and each row shows its own date.
const board = boardDateLabel(models);
const ratedModels = models.filter(isRated);
const unratedModels = models.filter((m) => !isRated(m));

function LeaderboardRow({ m, rank }: { m: (typeof models)[number]; rank: number | null }) {
  const elo = formatElo(m);
  const rowDate = board.mixed && m.elo_source ? ` (snapshot ${formatDate(m.elo_source.snapshot_date)})` : '';
  return (
    <a
      href={m.url}
      target="_blank"
      rel="noopener noreferrer"
      className="leaderboard-row"
      style={{ animationDelay: `${(rank ?? 0) * 0.08}s` }}
    >
      {rank !== null && (
        <span className={`leaderboard-rank ${rank === 1 ? 'leaderboard-rank-1' : 'leaderboard-rank-other'}`}>{rank}</span>
      )}
      <div className="leaderboard-info">
        <div className="leaderboard-info-row">
          <div>
            <span className="leaderboard-model-name">{m.name}</span>
            <span className="leaderboard-provider">{m.provider}</span>
          </div>
          <span className="leaderboard-elo" style={{ color: m.color }} title={elo.arenaModel ? `Arena model: ${elo.arenaModel}` : undefined}>
            {elo.score}
            {elo.config && <span className="leaderboard-elo-config"> · {elo.config}</span>}
          </span>
        </div>
        {(elo.note || rowDate) && <div className="leaderboard-elo-note">{elo.note}{rowDate}</div>}
        <div className="leaderboard-metrics">
          <span>{formatUsdPerMillion(m.cost_per_million_tokens)} in</span>
          <span>{formatUsdPerMillion(m.cost_per_million_tokens_output)} out</span>
          <span>{formatContextWindow(m.context_window)}</span>
        </div>
      </div>
    </a>
  );
}

function LeaderboardSection() {
  return (
    <section id="leaderboard" className="leaderboard-section">
      <div className="leaderboard-inner">
        <SectionHeader
          label="Leaderboard"
          title="This week's ranking"
          subtitle={`LMArena text Elo from ${board.mixed ? 'arena.ai boards dated' : 'the arena.ai board of'} ${board.text}, with list price and context. Models without a score of their own are listed below the ranking, unranked.`}
        />
        <div className="leaderboard-list">
          {ratedModels.map((m, i) => (
            <LeaderboardRow key={m.id} m={m} rank={i + 1} />
          ))}
        </div>
        {unratedModels.length > 0 && (
          <div className="leaderboard-unrated">
            <h3 className="leaderboard-unrated-heading">Not yet rated</h3>
            <div className="leaderboard-list">
              {unratedModels.map((m) => (
                <LeaderboardRow key={m.id} m={m} rank={null} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function OpenWeightSection() {
  return (
    <section id="local" className="ow-section">
      <SectionHeader
        label="Open Weight"
        title="Run it yourself"
        subtitle="No API key, no usage limits, no data leaving your machine. The best open-weight models ranked by Elo."
      />
      <div className="models-grid">
        {openWeightModels.map((model, i) => (
          <OpenWeightCard key={model.id} model={model} index={i} />
        ))}
      </div>
    </section>
  );
}

function InsightsSection({
  task,
  onTaskChange,
}: {
  task: string;
  onTaskChange: (t: string) => void;
}) {
  return (
    <section id="insights" className="insights-section">
      <SectionHeader
        label="Category Breakdown"
        title="Where each one leads"
        subtitle="Category leaders from the tracked set, as of this week's snapshot."
      />
      <div className="insights-grid">
        {categories.map((cat, i) => {
          const keyword = categoryTaskKeyword(cat);
          const active = task.toLowerCase().includes(keyword);
          return (
            <button
              key={cat.name}
              type="button"
              className={`insight-card${active ? ' insight-card-active' : ''}`}
              style={{
                animationDelay: `${i * 0.1}s`,
                borderColor: active ? cat.color + '60' : undefined,
              }}
              onClick={() => {
                onTaskChange(active ? '' : keyword);
                document.getElementById('models')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            >
              <CategoryIcon icon={cat.icon} color={cat.color} />
              <h3 className="insight-name">{cat.name}</h3>
              <div className="insight-leader" style={{ color: cat.color }}>Leader: {cat.leader}</div>
              <p className="insight-text">{cat.insight}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function ArticlesSection() {
  return (
    <section id="articles" className="articles-section">
      <div className="articles-inner">
        <SectionHeader
          label="Latest"
          title="Dispatches from the frontier"
          subtitle="Weekly analysis, honest takes, and hidden gems. No engagement bait."
        />
        <div className="articles-grid">
          {homepageArticles.map((article, i) => (
            <ArticleCard key={article.slug} article={article} index={i} />
          ))}
        </div>
        <div className="articles-more-wrap">
          <Link href="/articles" className="articles-more">All dispatches →</Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const version = process.env.NEXT_PUBLIC_APP_VERSION;
  const updated = formatDate(config.lastUpdated);

  return (
    <footer className="site-footer">
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <div className="footer-site">helloai.com</div>
        <p className="footer-credits">
          Managed by{' '}
          <a href={config.cmcUrl} target="_blank" rel="noopener noreferrer">
            {config.author}
          </a>
          {' '}· Powered by AI · No ads, no affiliate links
        </p>
        <div className="footer-links">
          <a href={config.githubUrl} target="_blank" rel="noopener noreferrer">GitHub</a>
          <a href={config.authorUrl} target="_blank" rel="noopener noreferrer">X / Twitter</a>
        </div>
        {version && (
          <div className="footer-version">
            v{version} · updated {updated}
          </div>
        )}
      </div>
    </footer>
  );
}

export default function Home() {
  const [activeSection, setActiveSection] = useState('');
  const [task, setTask] = useState('');
  const [maxCost, setMaxCost] = useState<number | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      const modelsEl = document.getElementById('models');
      if (!modelsEl || modelsEl.getBoundingClientRect().top >= 300) {
        setActiveSection('');
        return;
      }
      const sections = ['articles', 'insights', 'local', 'leaderboard', 'models'] as const;
      for (const id of sections) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top < 300) {
          setActiveSection(id);
          break;
        }
      }
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <Nav activeSection={activeSection} />
      <Hero config={config} />
      <ModelsSection
        task={task}
        maxCost={maxCost}
        onTaskChange={setTask}
        onMaxCostChange={setMaxCost}
      />
      <LeaderboardSection />
      <OpenWeightSection />
      <InsightsSection task={task} onTaskChange={setTask} />
      <ArticlesSection />
      <Footer />
    </>
  );
}
