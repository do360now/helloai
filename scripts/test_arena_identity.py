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


def _model_with_old_provenance():
    return {
        "id": "claude", "elo": 1493,
        "elo_source": {
            "board": "text_overall", "arena_model": "claude-opus-5-high", "matches_listed_model": False,
            "snapshot_date": "2026-09-13", "checked_date": "2026-09-23", "source_url": "https://arena.ai/leaderboard/text",
            "set_by": "agent_curated", "ci_low": 1489, "ci_high": 1497, "votes": 42617,
        },
    }


def test_fetched_score_takes_its_own_snapshot_date_and_drops_the_old_interval_and_votes():
    entry = _ArenaEntry(name="claude-opus-5.5-max", score=1510.0, snapshot_date="2026-10-04")
    out, _ = update_models([_model_with_old_provenance()], {"claude": 1510.0}, {}, matches={"claude": entry})
    src = out[0]["elo_source"]
    assert src["snapshot_date"] == "2026-10-04"
    assert "ci_low" not in src and "ci_high" not in src and "votes" not in src  # never the old number's interval
    assert src["matches_listed_model"] is True and src["arena_model"] == "claude-opus-5.5-max"
    assert src["checked_date"] >= "2026-10-04" or src["checked_date"] > "2026-09-23"


def test_fetched_score_with_unknown_snapshot_date_is_marked_stale_not_fresh():
    entry = _ArenaEntry(name="claude-opus-5.5-max", score=1510.0)  # no snapshot_date known
    out, _ = update_models([_model_with_old_provenance()], {"claude": 1510.0}, {}, matches={"claude": entry})
    assert out[0]["elo_source"]["status"] == "stale"


def test_nakasyou_entries_carry_the_snapshot_date(monkeypatch):
    class R:
        def raise_for_status(self): pass
        def json(self): return {"20990101": {"text": {"overall": {"claude-opus-5.5-max": 1510}}}}
    monkeypatch.setattr(arena.requests, "get", lambda *a, **k: R())
    monkeypatch.setattr(arena, "MAX_SNAPSHOT_AGE_DAYS", 10**6)
    entries = arena._fetch_from_nakasyou()
    assert entries["claude-opus-5.5-max"].snapshot_date == "2099-01-01"


# ─── pipeline gaps found in review (a3): overrides, category leaders, predecessor reachability ───
from update_leaderboard import is_rated, update_category_leaders


def _m(mid, name, elo, matches=True, status=None, strengths=()):
    src = {"board": "text_overall", "arena_model": f"{mid}-slug", "matches_listed_model": matches,
           "snapshot_date": "2026-09-13", "checked_date": "2026-09-23", "source_url": "https://arena.ai/leaderboard/text",
           "set_by": "agent_curated", "ci_low": elo - 5, "ci_high": elo + 5, "votes": 100}
    if status:
        src["status"] = status
    return {"id": mid, "name": name, "elo": elo, "strengths": list(strengths), "elo_source": src}


def test_is_rated_mirrors_the_site_rule():
    assert is_rated(_m("a", "A", 1500)) is True
    assert is_rated(_m("a", "A", 1500, matches=False)) is False
    assert is_rated(_m("a", "A", 1500, status="stale")) is False
    assert is_rated(_m("a", "A", 1500, status="missing")) is False
    assert is_rated({"id": "a", "name": "A", "elo": 1500}) is False  # no elo_source at all


def test_a_borrowed_score_cannot_be_crowned_category_leader():
    models = [_m("b", "Borrowed", 1600, matches=False, strengths=["Coding"]), _m("r", "Rated", 1500, strengths=["Coding"])]
    cats = [{"name": "Overall Preference", "leader": "Rated", "insight": ""}, {"name": "Coding", "leader": "Rated", "insight": ""}]
    out, changed = update_category_leaders(cats, sorted(models, key=lambda m: m["elo"], reverse=True))
    assert [c["leader"] for c in out] == ["Rated", "Rated"] and changed is False


def test_manual_override_updates_provenance_and_drops_the_old_interval():
    models = [_m("gemini", "Gemini", 1487)]
    out, changed = update_models(models, scores={}, manual_overrides={"gemini": 1510})
    src = out[0]["elo_source"]
    assert out[0]["elo"] == 1510 and changed is True
    assert src["set_by"] == "override"
    assert "ci_low" not in src and "ci_high" not in src and "votes" not in src
    assert src["checked_date"] >= "2026-09-25"
    assert src["matches_listed_model"] is True  # an override never changes whose score it is


def test_override_on_a_borrowed_model_leaves_it_borrowed():
    out, _ = update_models([_m("claude", "Claude", 1493, matches=False)], scores={}, manual_overrides={"claude": 1510})
    assert out[0]["elo_source"]["matches_listed_model"] is False


def test_predecessor_flag_is_reachable_through_the_default_map():
    entries = {"claude-opus-5-high": e("claude-opus-5-high", 1493.0)}
    hit, matches = resolve_with_identity("claude", entries, name_map=arena._NAME_MAP, allow_predecessor=True)
    assert hit is not None and matches is False


def test_fetch_matches_can_be_asked_for_predecessors_but_never_by_default(monkeypatch):
    monkeypatch.setattr(arena, "_fetch_all_scores", lambda: {"claude-opus-5-high": e("claude-opus-5-high", 1493.0)})
    assert "claude" not in arena.fetch_matches(our_model_ids=["claude"])
    got = arena.fetch_matches(our_model_ids=["claude"], allow_predecessor=True)
    assert got["claude"].name == "claude-opus-5-high"


def test_config_is_derived_from_the_matched_slug_not_left_from_the_old_record():
    # Astra's repro: the predecessor record had config 'high'; a fetched claude-opus-5.5-max must not keep it.
    m = _m("claude", "Claude", 1493, matches=False)
    m["elo_source"]["config"] = "high"
    entry = _ArenaEntry(name="claude-opus-5.5-max", score=1510.0, snapshot_date="2026-10-04")
    out, _ = update_models([m], {"claude": 1510.0}, {}, matches={"claude": entry})
    assert out[0]["elo_source"]["config"] == "max"


def test_config_is_cleared_when_the_slug_has_no_effort_suffix():
    m = _m("gemini", "Gemini", 1487)
    m["elo_source"]["config"] = "max"
    entry = _ArenaEntry(name="gemini-3.1-pro-preview", score=1490.0, snapshot_date="2026-10-04")
    out, _ = update_models([m], {"gemini": 1490.0}, {}, matches={"gemini": entry})
    assert "config" not in out[0]["elo_source"]


def test_config_from_slug_variants():
    from arena import config_from_slug
    assert config_from_slug("claude-fable-5.1-max") == "max"
    assert config_from_slug("grok-4.7-xhigh") == "xhigh"
    assert config_from_slug("muse-spark-1.3 (xHigh)") == "xhigh"
    assert config_from_slug("claude-opus-5.5-high") == "high"
    assert config_from_slug("gemini-3.1-pro-preview") is None
