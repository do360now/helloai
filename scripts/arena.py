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
from dataclasses import dataclass
from datetime import datetime, timezone

import requests

log = logging.getLogger("arena")

# Reject upstream snapshots older than this many days — the nakasyou source
# has been known to freeze for months at a time; a stale snapshot should
# never silently overwrite curated Elos.
MAX_SNAPSHOT_AGE_DAYS = 30


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

# Release metadata for the CSV fallback — used to date it, since the CSV
# body itself carries no snapshot date (columns are rank/model/score/...).
_FALLBACK_RELEASE_API_URL = (
    "https://api.github.com/repos/fboulnois/llm-leaderboard-csv/releases/latest"
)

_USER_AGENT = "HelloAi-Bot/1.0 (+https://helloai.com)"
_TIMEOUT = 20

# How our model IDs map to LMArena model names.
# Checked in order — first match wins. Keep these current when
# LMArena adds new model versions.
_NAME_MAP: dict[str, list[str]] = {
    "fable": [
        "claude-fable-5.1-max",
        "claude-fable-5.1",
        "claude-fable-5",
    ],
    "claude": [
        "claude-opus-5-high",
        "claude-opus-5-max",
        "claude-opus-5-thinking",
        "claude-opus-5",
        "claude-opus-4-8-thinking",
        "claude-opus-4-8",
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
    "muse": [
        "muse-spark-1.3",
        "muse-spark-1.3 (xHigh)",
        "muse-spark-1.2",
        "muse-spark-1.2 (xHigh)",
        "muse-spark-1.1",
        "muse-spark",
    ],
    "qwen": [
        "qwen3.8-max",
        "qwen3.8-max-preview",
    ],
    "grok": [
        "grok-4.6-high",
        "grok-4.6",
        "grok-4.5",
    ],
}

# Open-weight models use a separate map — frontier and open-weight IDs are disjoint.
_OPEN_WEIGHT_NAME_MAP: dict[str, list[str]] = {
    "gemma": [
        "gemma-4-31b",
        "gemma-4-31b-it",
    ],
    "qwen27b": [
        "qwen3.8-27b",
    ],
    "mistral": [
        "mistral-small-2506",
        "mistral-small-3.2-24b-instruct-2506",
    ],
    "gptoss20b": [
        "gpt-oss-20b",
    ],
    "qwen14b": [
        "qwen3-14b",
    ],
    "qwen30ba3b": [
        "qwen3-30b-a3b",
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

    snap = datetime.strptime(latest, "%Y%m%d").replace(tzinfo=timezone.utc)
    age_days = (datetime.now(timezone.utc) - snap).days
    if age_days > MAX_SNAPSHOT_AGE_DAYS:
        log.warning(
            f"Arena snapshot {latest} is {age_days} days old "
            f"(max {MAX_SNAPSHOT_AGE_DAYS}); keeping curated Elos"
        )
        return {}  # empty dict == "no data" shape used throughout this module

    board = data[latest].get("text", {}).get("overall") or {}

    entries: dict[str, _ArenaEntry] = {
        name: _ArenaEntry(name=name, score=float(elo))
        for name, elo in board.items()
    }
    log.info(f"nakasyou: {len(entries)} models from snapshot {latest} (text/overall)")
    return entries


def _csv_release_freshness() -> tuple[str, int] | None:
    """
    Date the CSV fallback via the GitHub releases API.
    Returns (release_tag, age_days) or None if the release cannot be dated
    (API unreachable, rate-limited, or missing published_at).
    """
    try:
        resp = requests.get(
            _FALLBACK_RELEASE_API_URL,
            timeout=_TIMEOUT,
            headers={"User-Agent": _USER_AGENT},
        )
        resp.raise_for_status()
        release = resp.json()
        published = release.get("published_at")
        if not published:
            return None
        pub = datetime.strptime(published, "%Y-%m-%dT%H:%M:%SZ").replace(
            tzinfo=timezone.utc
        )
        age_days = (datetime.now(timezone.utc) - pub).days
        return (release.get("tag_name") or published, age_days)
    except (requests.RequestException, ValueError):
        return None


# NOTE: Both sources are freshness-guarded symmetrically — the nakasyou JSON
# by its snapshot key, the CSV by its GitHub release published_at. A source
# that is stale (or, for the CSV, undatable) returns {} so curated Elos win.
def _parse_csv() -> dict[str, "_ArenaEntry"]:
    """
    Parse community CSV fallback.
    Returns {model_name: _ArenaEntry}; {} if the release is stale or undatable.
    """
    freshness = _csv_release_freshness()
    if freshness is None:
        log.warning(
            "Cannot determine CSV fallback release date; skipping CSV "
            "to avoid applying unverifiable data; keeping curated Elos"
        )
        return {}
    tag, age_days = freshness
    if age_days > MAX_SNAPSHOT_AGE_DAYS:
        log.warning(
            f"CSV fallback release {tag} is {age_days} days old "
            f"(max {MAX_SNAPSHOT_AGE_DAYS}); keeping curated Elos"
        )
        return {}

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
    name_map: dict[str, list[str]] | None = None,
) -> "_ArenaEntry | None":
    """
    Match one of our model IDs to an arena entry.
    Uses exact name-map match only — no fuzzy fallback (curated Elos are authoritative).
    Returns None if no name-map candidate is found in arena_entries.
    """
    active_map = name_map if name_map is not None else _NAME_MAP

    # Normalize arena keys for case-insensitive lookup
    lower_map = {k.lower(): v for k, v in arena_entries.items()}

    # Exact candidates from the name map only
    for candidate in active_map.get(model_id, []):
        if candidate.lower() in lower_map:
            return lower_map[candidate.lower()]

    return None


# ─── PUBLIC INTERFACE ──────────────────────────────────────────────────────

def fetch_scores(
    our_model_ids: list[str] | None = None,
    name_map: dict[str, list[str]] | None = None,
) -> dict[str, float]:
    """
    Fetch current Elo scores for our models from LMArena.

    Args:
        our_model_ids: List of our internal model IDs (e.g. ["claude", "gemini"]).
                       If None, resolves all IDs defined in the name map.
        name_map: Arena alias map to use. Defaults to frontier _NAME_MAP.

    Returns:
        Dict mapping our model IDs to their Elo scores.
        Only includes IDs that were successfully matched.
        Example: {"claude": 1504, "gemini": 1486, "grok": 1473, "gpt": 1479}
    """
    active_map = name_map if name_map is not None else _NAME_MAP
    if our_model_ids is None:
        our_model_ids = list(active_map.keys())

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
        entry = _resolve_model_id(mid, arena_entries, active_map)
        if entry:
            scores[mid] = entry.score
        else:
            log.info(f"  '{mid}' not on public LMArena — keeping curated Elo")

    return scores


def fetch_open_weight_scores(
    our_model_ids: list[str] | None = None,
) -> dict[str, float]:
    """Fetch LMArena Elos for open-weight models via _OPEN_WEIGHT_NAME_MAP."""
    return fetch_scores(our_model_ids=our_model_ids, name_map=_OPEN_WEIGHT_NAME_MAP)


def add_model_names(model_id: str, arena_names: list[str]) -> None:
    """
    Register additional arena name candidates for a model ID.
    Useful when adding new models via --add-model.
    """
    existing = _NAME_MAP.get(model_id, [])
    _NAME_MAP[model_id] = arena_names + existing
