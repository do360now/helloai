"""
arena.py — Deep module for LMArena leaderboard data.

This module owns ALL knowledge about LMArena:
  - Where the data lives (URLs, page structure)
  - How to scrape it (HTML parsing, CSV fallback)
  - How their model names map to our model IDs
  - How to resolve ambiguity when multiple matches exist

The public interface is intentionally simple:

    scores = fetch_scores(our_model_ids=["claude", "gemini", "grok", "gpt"])
    # → {"claude": 1504, "gemini": 1486, "grok": 1473, "gpt": 1479}

Everything else is an implementation detail that callers never see.
"""

import csv
import io
import logging
import re
from dataclasses import dataclass, field

import requests

log = logging.getLogger("arena")


# ─── INTERNAL: LMArena-specific knowledge ──────────────────────────────────

# Primary source: lmarena.ai renders a React page with leaderboard tables.
# The HTML contains <a title="model-name"> followed by <td><span>SCORE</span>
# in subsequent cells. Multiple leaderboards appear (Text, Code, Vision, etc.);
# we take the first occurrence of each model (Text = the top section).
_LEADERBOARD_URL = "https://lmarena.ai/leaderboard"

# Fallback: community-maintained CSV releases on GitHub.
_FALLBACK_CSV_URL = (
    "https://github.com/fboulnois/llm-leaderboard-csv"
    "/releases/latest/download/lmarena.csv"
)

_USER_AGENT = "HelloAi-Bot/1.0 (+https://helloai.com)"
_TIMEOUT = 20

# Regex for extracting model entries from LMArena's React-rendered HTML.
# Captures: (model_name, score, votes) from the table structure.
_SCORE_PATTERN = re.compile(
    r'title="([^"]+)">'
    r"<span[^>]*>[^<]*</span>"   # model name span
    r".*?"                        # svg icon and closing tags
    r'<td[^>]*><span[^>]*>(\d[\d,]*)</span></td>'   # score
    r'\s*<td[^>]*><span[^>]*>([\d,]+)</span></td>',  # votes
    re.DOTALL,
)

# How our model IDs map to LMArena model names.
# Checked in order — first match wins. Keep these current when
# LMArena adds new model versions.
_NAME_MAP: dict[str, list[str]] = {
    "claude": [
        "claude-opus-4-7-thinking",
        "claude-opus-4-7",
        "claude-opus-4-6-thinking",
        "claude-opus-4-6",
        "claude-opus-4-5-20251101-thinking-32k",
        "claude-opus-4-5",
    ],
    "gemini": [
        "gemini-3.1-pro-preview",
        "gemini-3-pro",
        "gemini-3-flash",
    ],
    "grok": [
        "grok-4.3",
        "grok-4.20",
        "grok-4.1-thinking",
        "grok-4.1",
        "grok-4.20-beta1",
    ],
    "gpt": [
        "gpt-5.5",
        "gpt-5.5-pro",
        "gpt-5.4-high",
        "gpt-5.4",
        "gpt-5.2-high",
        "gpt-5.1-high",
    ],
}

# CSV column names vary across sources. We try each in order.
_CSV_NAME_COLUMNS = ["Model", "model", "model_name", "name", "key", "Key"]
_CSV_SCORE_COLUMNS = [
    "Arena Score", "Arena Elo", "rating", "elo", "score", "Rating",
]


# ─── INTERNAL: Scraping implementations ───────────────────────────────────

@dataclass
class _ArenaEntry:
    """A single model's data from the leaderboard."""
    name: str
    score: float
    votes: int = 0


def _scrape_html() -> dict[str, _ArenaEntry]:
    """
    Scrape lmarena.ai/leaderboard HTML.
    Returns {model_name: ArenaEntry}, first occurrence only (Text leaderboard).
    """
    resp = requests.get(
        _LEADERBOARD_URL,
        timeout=_TIMEOUT,
        headers={"User-Agent": _USER_AGENT},
    )
    resp.raise_for_status()

    entries: dict[str, _ArenaEntry] = {}
    for match in _SCORE_PATTERN.finditer(resp.text):
        name = match.group(1).strip()
        try:
            score = int(match.group(2).replace(",", ""))
            votes = int(match.group(3).replace(",", ""))
        except ValueError:
            continue
        # First occurrence = Text leaderboard (top of page)
        if name not in entries:
            entries[name] = _ArenaEntry(name=name, score=float(score), votes=votes)

    return entries


def _parse_csv() -> dict[str, _ArenaEntry]:
    """
    Parse community CSV fallback.
    Returns {model_name: ArenaEntry}.
    """
    resp = requests.get(
        _FALLBACK_CSV_URL,
        timeout=_TIMEOUT,
        allow_redirects=True,
    )
    resp.raise_for_status()

    entries: dict[str, _ArenaEntry] = {}
    reader = csv.DictReader(io.StringIO(resp.text))

    for row in reader:
        name = next(
            (row[c].strip() for c in _CSV_NAME_COLUMNS if c in row and row[c]),
            None,
        )
        score = None
        for col in _CSV_SCORE_COLUMNS:
            if col in row and row[col]:
                try:
                    score = float(row[col].strip())
                    break
                except ValueError:
                    continue
        if name and score is not None:
            entries[name] = _ArenaEntry(name=name, score=score)

    return entries


def _fetch_all_scores() -> dict[str, _ArenaEntry]:
    """
    Try all data sources in order. Returns raw arena entries.
    """
    # Source 1: live HTML scrape
    try:
        entries = _scrape_html()
        if entries:
            log.info(f"Scraped {len(entries)} models from LMArena")
            return entries
        log.warning("HTML scrape returned no data (page structure may have changed)")
    except requests.RequestException as e:
        log.warning(f"HTML scrape failed: {e}")

    # Source 2: community CSV
    try:
        entries = _parse_csv()
        if entries:
            log.info(f"Parsed {len(entries)} models from fallback CSV")
            return entries
        log.warning("CSV fallback returned no data")
    except Exception as e:
        log.warning(f"CSV fallback failed: {e}")

    return {}


def _resolve_model_id(
    model_id: str,
    arena_entries: dict[str, _ArenaEntry],
) -> _ArenaEntry | None:
    """
    Match one of our model IDs to an arena entry.
    Tries explicit name map first, then fuzzy substring match.
    """
    # Normalize arena keys for case-insensitive lookup
    lower_map = {k.lower(): v for k, v in arena_entries.items()}

    # 1. Explicit candidates from the name map
    for candidate in _NAME_MAP.get(model_id, []):
        if candidate.lower() in lower_map:
            return lower_map[candidate.lower()]

    # 2. Fuzzy: our model_id as substring of any arena name
    for arena_name, entry in arena_entries.items():
        if model_id.lower() in arena_name.lower():
            return entry

    return None


# ─── PUBLIC INTERFACE ──────────────────────────────────────────────────────

def fetch_scores(
    our_model_ids: list[str] | None = None,
) -> dict[str, float]:
    """
    Fetch current Elo scores for our models from LMArena.

    Args:
        our_model_ids: List of our internal model IDs (e.g. ["claude", "gemini"]).
                       If None, resolves all IDs defined in the name map.

    Returns:
        Dict mapping our model IDs to their Elo scores.
        Only includes IDs that were successfully matched.
        Example: {"claude": 1504, "gemini": 1486, "grok": 1473, "gpt": 1479}
    """
    if our_model_ids is None:
        our_model_ids = list(_NAME_MAP.keys())

    arena_entries = _fetch_all_scores()
    if not arena_entries:
        log.warning(
            "No arena data available. Use manual overrides (--set) instead."
        )
        return {}

    # Log top 5 for visibility
    top = sorted(arena_entries.values(), key=lambda e: e.score, reverse=True)[:5]
    for i, entry in enumerate(top, 1):
        log.info(f"  #{i} {entry.name}: {int(entry.score)}")

    # Resolve each of our model IDs
    scores: dict[str, float] = {}
    for mid in our_model_ids:
        entry = _resolve_model_id(mid, arena_entries)
        if entry:
            scores[mid] = entry.score
        else:
            log.info(f"  No match for '{mid}'")

    return scores


def add_model_names(model_id: str, arena_names: list[str]) -> None:
    """
    Register additional arena name candidates for a model ID.
    Useful when adding new models via --add-model.
    """
    existing = _NAME_MAP.get(model_id, [])
    _NAME_MAP[model_id] = arena_names + existing
