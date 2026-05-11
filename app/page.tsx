'use client';

import { useState, useEffect, useMemo } from 'react';
import { Nav, Hero, ModelCard, CategoryIcon, SectionHeader, ArticleCard, OpenWeightCard } from './components';
import ModelFilter from './components/ModelFilter';
import { getSiteConfig, getModels, getCategories, getArticles, getOpenWeightModels, formatDate } from '@/data';
import { scoreAndRank } from '@/data/recommend';

const config = getSiteConfig();
const models = getModels();
const categories = getCategories();
const articles = getArticles();
const openWeightModels = getOpenWeightModels();

function ModelsSection() {
  const [task, setTask] = useState('');
  const [maxCost, setMaxCost] = useState<number | null>(null);
  const hasFilters = task.trim() !== '' || maxCost !== null;

  const ranked = useMemo(() => {
    if (!hasFilters) return models.map((m) => ({ model: m, score: 0, reasons: [] as string[] }));
    const { recommendations } = scoreAndRank(models, categories, { task: task || null, maxCost });
    return recommendations;
  }, [task, maxCost, hasFilters]);

  const topScore = ranked[0]?.score ?? 0;

  return (
    <section id="models" className="models-section">
      <SectionHeader
        label="Featured Models"
        title="Pick your companion"
        subtitle="One-click access to today's frontier leaders. Ranked by capability, updated weekly."
      />
      <ModelFilter
        categories={categories}
        task={task}
        maxCost={maxCost}
        onTaskChange={setTask}
        onMaxCostChange={setMaxCost}
        onClear={() => { setTask(''); setMaxCost(null); }}
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
      {hasFilters && ranked.length === 0 && (
        <p className="models-no-results">No models match those filters. Try relaxing your constraints.</p>
      )}
    </section>
  );
}

function LeaderboardSection() {
  const maxElo = Math.max(...models.map((x) => x.elo));

  return (
    <section id="leaderboard" className="leaderboard-section">
      <div className="leaderboard-inner">
        <SectionHeader
          label="Leaderboard"
          title="Who's actually winning"
          subtitle="Elo ratings from Chatbot Arena blind votes. These shift weekly — here's the current snapshot."
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {models.map((m, i) => {
            const barWidth = ((m.elo - 1480) / (maxElo - 1480)) * 100;
            return (
              <div
                key={m.id}
                className="leaderboard-row"
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                <span className={`leaderboard-rank ${i === 0 ? 'leaderboard-rank-1' : 'leaderboard-rank-other'}`}>
                  {i + 1}
                </span>
                <div className="leaderboard-info">
                  <div className="leaderboard-info-row">
                    <div>
                      <span className="leaderboard-model-name">{m.name}</span>
                      <span className="leaderboard-provider">{m.provider}</span>
                    </div>
                    <span className="leaderboard-elo" style={{ color: m.color }}>{m.elo}</span>
                  </div>
                  <div className="elo-bar-bg">
                    <div
                      className="elo-bar-fill"
                      style={{
                        width: `${barWidth}%`,
                        background: `linear-gradient(90deg, ${m.color}90, ${m.color}40)`,
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
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

function InsightsSection() {
  return (
    <section id="insights" className="insights-section">
      <SectionHeader
        label="Category Breakdown"
        title="The real picture"
        subtitle="No hype. Where each model actually leads, based on benchmarks and real-world usage as of today."
      />
      <div className="insights-grid">
        {categories.map((cat, i) => (
          <div
            key={i}
            className="insight-card"
            style={{ animationDelay: `${i * 0.1}s` }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = cat.color + '30')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)')}
          >
            <CategoryIcon icon={cat.icon} color={cat.color} />
            <h3 className="insight-name">{cat.name}</h3>
            <div className="insight-leader" style={{ color: cat.color }}>Leader: {cat.leader}</div>
            <p className="insight-text">{cat.insight}</p>
          </div>
        ))}
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
          {articles.map((article, i) => (
            <ArticleCard key={article.slug} article={article} index={i} />
          ))}
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
  const [activeSection, setActiveSection] = useState('models');

  useEffect(() => {
    const handleScroll = () => {
      const sections = ['articles', 'insights', 'local', 'leaderboard', 'models'];
      for (const id of sections) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top < 300) {
          setActiveSection(id);
          break;
        }
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <Nav activeSection={activeSection} />
      <Hero config={config} />
      <ModelsSection />
      <LeaderboardSection />
      <OpenWeightSection />
      <InsightsSection />
      <ArticlesSection />
      <Footer />
    </>
  );
}
