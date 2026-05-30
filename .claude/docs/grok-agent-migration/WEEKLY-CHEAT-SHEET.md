# Grok Weekly Update Cheat Sheet

**Default path (as of late May 2026)**

## 1. Leaderboard Drift (leaderboard-updater)

**What to say to Grok:**

```
Run the leaderboard-updater for this week's update.
Follow the spec in .claude/agents/leaderboard-updater.md.
Use the latest memory and state. Append proposals to the audit log before showing the report.
```

**Key files Grok will use:**
- `.claude/agent-memory/leaderboard-updater.md`
- `.claude/state/leaderboard-changes.jsonl`
- `data/models.json`
- `scripts/arena.py`

**After Grok responds:**
- Review the report
- Apply safe changes to `data/models.json` and `scripts/arena.py`
- Continue to Elo refresh step

---

## 2. Article Briefs (article-idea-generator)

**What to say to Grok:**

```
Run the article-idea-generator for this week's update.
Follow the spec in .claude/agents/article-idea-generator.md.
Return exactly 5 ranked briefs in the required JSON schema.
```

**Key files Grok will use:**
- `.claude/agent-memory/article-idea-generator.md`
- `data/articles.json`
- `data/models.json`
- `data/categories.json`

**After Grok responds:**
- Pick the top brief (usually `rank: 1`)
- Hand it to the `article-writer` agent (Opus) using the advisor pattern
- Validate output → insert with `scripts/add_article.py`

---

## Fallback (if needed)

Use the original Claude Code agents:
- `/agent leaderboard-updater`
- `/agent article-idea-generator`

---

## Quick Reference

| Step                        | Grok Command (paste this)                          | Main Output                  |
|----------------------------|----------------------------------------------------|------------------------------|
| Leaderboard intelligence   | "Run the leaderboard-updater..."                   | Report + audit log entries   |
| Article briefs             | "Run the article-idea-generator..."                | 5 ranked JSON briefs         |
| Article prose              | Hand selected brief to `/agent article-writer`     | JSON array of paragraphs     |

Keep this file handy during weekly updates.