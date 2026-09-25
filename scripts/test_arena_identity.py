"""
test_arena_identity.py — a fetched Arena score must belong to the listed model.

Regression for docs/review/elo-provenance.md item 5 (Astra): _resolve_model_id used to return the
first candidate in a list that ran from the newest model down to older generations and even other
product tiers, so an older model's score could be written under today's model id.

Run with: python3 -m pytest scripts/test_arena_identity.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import arena
from arena import _ArenaEntry, _resolve_model_id, resolve_with_identity
from update_leaderboard import update_models


def e(name, score=1400.0):
    return _ArenaEntry(name=name, score=score)


def test_astra_repro_older_generation_does_not_resolve():
    # On the old code this returned the claude-opus-4-5 entry.
    assert _resolve_model_id("claude", {"claude-opus-4-5": e("claude-opus-4-5")}) is None


def test_exact_version_resolves_and_reports_the_slug():
    entries = {"claude-opus-5.5-high": e("claude-opus-5.5-high", 1510.0)}
    hit = _resolve_model_id("claude", entries)
    assert hit is not None and hit.name == "claude-opus-5.5-high"


def test_predecessor_is_not_returned_by_default():
    assert _resolve_model_id("claude", {"claude-opus-5-high": e("claude-opus-5-high", 1493.0)}) is None
    assert _resolve_model_id("grok", {"grok-4.6-high": e("grok-4.6-high", 1456.0)}) is None


def test_predecessor_only_with_explicit_flag_and_is_marked_as_not_matching():
    entries = {"claude-opus-5-high": e("claude-opus-5-high", 1493.0)}
    hit, matches = resolve_with_identity("claude", entries, allow_predecessor=True)
    assert hit.name == "claude-opus-5-high"
    assert matches is False
    hit, matches = resolve_with_identity("claude", entries, allow_predecessor=False)
    assert hit is None


def test_exact_beats_predecessor_when_both_present():
    entries = {"claude-opus-5-high": e("claude-opus-5-high", 1493.0), "claude-opus-5.5-max": e("claude-opus-5.5-max", 1510.0)}
    hit, matches = resolve_with_identity("claude", entries, allow_predecessor=True)
    assert hit.name == "claude-opus-5.5-max" and matches is True


def test_never_crosses_product_tiers_even_with_the_flag():
    entries = {"gemini-3-flash": e("gemini-3-flash", 1480.0)}
    assert resolve_with_identity("gemini", entries, allow_predecessor=True)[0] is None
    assert _resolve_model_id("gemini", entries) is None


def test_unlisted_effort_variant_does_not_silently_substitute():
    assert _resolve_model_id("claude", {"claude-opus-5.5-low": e("claude-opus-5.5-low")}) is None


def test_no_predecessor_name_is_in_the_exact_map():
    exact = {n.lower() for names in arena._NAME_MAP.values() for n in names}
    for older in ("claude-opus-5-high", "claude-opus-4-5", "grok-4.6-high", "muse-spark-1.2", "gemini-3-flash", "claude-fable-5"):
        assert older not in exact


def test_fetch_scores_drops_a_predecessor_hit(monkeypatch):
    monkeypatch.setattr(arena, "_fetch_all_scores", lambda: {"claude-opus-4-5": e("claude-opus-4-5", 1400.0)})
    assert "claude" not in arena.fetch_scores(our_model_ids=["claude"])


def test_update_models_keeps_old_value_when_no_exact_match():
    models = [{"id": "claude", "elo": 1493}]
    out, changed = update_models(models, scores={}, manual_overrides={})
    assert out[0]["elo"] == 1493 and changed is False


def test_update_models_records_the_arena_slug_for_a_fetched_score():
    models = [{"id": "claude", "elo": 1493}]
    matches = {"claude": e("claude-opus-5.5-max", 1510.0)}
    out, changed = update_models(models, scores={"claude": 1510.0}, manual_overrides={}, matches=matches)
    assert changed is True and out[0]["elo"] == 1510
    src = out[0]["elo_source"]
    assert src["arena_model"] == "claude-opus-5.5-max"
    assert src["matches_listed_model"] is True
    assert src["set_by"] == "fetched"
