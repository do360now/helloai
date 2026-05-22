"""
arena.py — Deep module for LMArena leaderboard data.

This module owns ALL knowledge about LMArena:
  - Where the data lives (URLs)
  - How to fetch it (nakasyou JSON primary, CSV fallback)
  - How their model names map to our model IDs
  - How to resolve names (exact name-map only — no fuzzy matching)

Primary source: nakasyou's lmarena-history JSON snapshots on GitHub.
  https://raw.githubusercontent.com/nakasyou/lmarena-history/main/output/scores.json
  Keys are "YYYYMMDD" snapshot dates; we take the latest. Under each snapshot,
  data["text"]["overall"] is a dict of {model_name: elo_float}.

Fallback source: community-maintained CSV releases on GitHub.
  https://github.com/fboulnois/llm-leaderboard-csv/releases/latest/download/lmarena_text.csv

The public interface is intentionally simple:

    scores = fetch_scores(our_model_ids=["claude", "gemini", "grok", "gpt"])
    # → {"claude": 1504, "gemini": 1486, "grok": 1473, "gpt": 1479}

Everything else is an implementation detail that callers never see.
"""

import csv
import io
import json
import logging
import re
from dataclasses import dataclass, field

import requests

log = logging.getLogger("arena")


# ─── INTERNAL: LMArena-specific knowledge ──────────────────────────────────

# Primary source: nakasyou's lmarena-history snapshot JSON.
# Keys are "YYYYMMDD" strings; lexicographic sort gives the latest snapshot.
_NAKASYOU_JSON_URL = (
    "https://raw.githubusercontent.com/nakasyou/lmarena-history"
    "/main/output/scores.json"
)

# Fallback: community-maintained CSV releases on GitHub.
_FALLBACK_CSV_URL = (
    "https://github.com/fboulnois/llm-leaderboard-csv"
    "/releases/latest/download/lmarena_text.csv"
)

_USER_AGENT = "HelloAi-Bot/1.0 (+https://helloai.com)"
_TIMEOUT = 20

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
        "gpt-5.5-instant",
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
    "arena_score", "Arena Score", "Arena Elo", "rating", "elo", "score", "Rating",
]


# ─── INTERNAL: Data source implementations ────────────────────────────────

@dataclass
class _ArenaEntry:
    """A single model's data from the leaderboard."""
    name: str
    score: float
    votes: int = 0


def _fetch_from_nakasyou() -> dict[str, "_ArenaEntry"]:
    """
    Fetch the nakasyou lmarena-history JSON snapshot.
    Returns {model_name: _ArenaEntry} from the latest snapshot's text/overall board.
    """
    resp = requests.get(
        _NAKASYOU_JSON_URL,
        timeout=_TIMEOUT,
        headers={"User-Agent": _USER_AGENT},
    )
    resp.raise_for_status()

    data = resp.json()
    if not data:
        return {}

    latest = max(data.keys())  # "YYYYMMDD" keys — lexicographic == chronological
    board = data[latest].get("text", {}).get("overall") or {}

    entries: dict[str, _ArenaEntry] = {
        name: _ArenaEntry(name=name, score=float(elo))
        for name, elo in board.items()
    }
    log.info(f"nakasyou: {len(entries)} models from snapshot {latest} (text/overall)")
    return entries


def _parse_csv() -> dict[str, "_ArenaEntry"]:
    """
    Parse community CSV fallback.
    Returns {model_name: _ArenaEntry}.
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


def _fetch_all_scores() -> dict[str, "_ArenaEntry"]:
    """
    Try all data sources in order. Returns raw arena entries.
    """
    # Source 1: nakasyou JSON snapshots
    try:
        entries = _fetch_from_nakasyou()
        if entries:
            log.info(f"Fetched {len(entries)} models from nakasyou JSON")
            return entries
        log.warning("nakasyou JSON returned no data (structure may have changed)")
    except requests.RequestException as e:
        log.warning(f"nakasyou JSON fetch failed: {e}")

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
    arena_entries: dict[str, "_ArenaEntry"],
) -> "_ArenaEntry | None":
    """
    Match one of our model IDs to an arena entry.
    Uses exact name-map match only — no fuzzy fallback (curated Elos are authoritative).
    Returns None if no name-map candidate is found in arena_entries.
    """
    # Normalize arena keys for case-insensitive lookup
    lower_map = {k.lower(): v for k, v in arena_entries.items()}

    # Exact candidates from the name map only
    for candidate in _NAME_MAP.get(model_id, []):
        if candidate.lower() in lower_map:
            return lower_map[candidate.lower()]

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
            log.info(f"  '{mid}' not on public LMArena — keeping curated Elo")

    return scores


def add_model_names(model_id: str, arena_names: list[str]) -> None:
    """
    Register additional arena name candidates for a model ID.
    Useful when adding new models via --add-model.
    """
    existing = _NAME_MAP.get(model_id, [])
    _NAME_MAP[model_id] = arena_names + existing
