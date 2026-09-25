"""
test_check_claims.py — fixture-based tests for the claims drift reporter.

Run with: python3 -m pytest scripts/test_check_claims.py
"""
import json
import sys
from datetime import date, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from check_claims import analyse, main


def write(d: Path, models, categories, claims):
    (d / "models.json").write_text(json.dumps(models))
    (d / "categories.json").write_text(json.dumps(categories))
    (d / "claims.json").write_text(json.dumps(claims))


def claim(**over):
    base = {"id": "c1", "text": "77% on ARC-AGI-2", "subject": "Gem", "kind": "vendor-reported",
            "verification": "unverified", "source_url": None, "as_of": None, "checked_at": None}
    base.update(over)
    return base


MODELS = [{"name": "Gem", "desc": "Scored 77% on ARC-AGI-2 and is fast."}]


def test_clean_when_every_claim_is_registered(tmp_path):
    write(tmp_path, MODELS, [], [claim()])
    r = analyse(tmp_path)
    assert r["unregistered"] == [] and r["dead"] == []
    assert len(r["unverified"]) == 1


def test_unregistered_claim_is_reported(tmp_path):
    write(tmp_path, MODELS, [], [])
    r = analyse(tmp_path)
    assert any("77%" in u for u in r["unregistered"])
    assert any("ARC-AGI" in u for u in r["unregistered"])


def test_dead_registry_entry_is_reported(tmp_path):
    write(tmp_path, [{"name": "Gem", "desc": "No numbers here."}], [], [claim()])
    assert analyse(tmp_path)["dead"] == ["c1"]


def test_stale_confirmed_claim_is_reported(tmp_path):
    old = (date.today() - timedelta(days=45)).isoformat()
    write(tmp_path, MODELS, [], [claim(verification="confirmed", source_url="https://x.example", as_of="2026-02-19", checked_at=old, perishable=True)])
    assert analyse(tmp_path)["stale"] == ["c1"]


def test_missing_files_exit_zero(tmp_path, capsys):
    assert main([str(tmp_path / "nope")]) == 0
    assert "not found" in capsys.readouterr().out.lower()


def test_exit_code_is_one_on_drift_and_zero_with_ok(tmp_path):
    write(tmp_path, MODELS, [], [])
    assert main([str(tmp_path)]) == 1
    assert main([str(tmp_path), "--ok"]) == 0


def test_tag_multipliers_and_elo_numbers_are_scanned(tmp_path):
    models = [{"name": "Gem", "tag": "40% Cheaper", "desc": "double its predecessor, at 1793."}]
    write(tmp_path, models, [], [])
    u = " ".join(analyse(tmp_path)["unregistered"])
    assert "tag" in u and "40%" in u
    assert '"double"' in u and '"1793"' in u


def test_only_perishable_confirmed_claims_expire(tmp_path):
    old = (date.today() - timedelta(days=90)).isoformat()
    base = dict(verification="confirmed", source_url="https://x.example", as_of="2026-02-19", checked_at=old)
    write(tmp_path, MODELS, [], [claim(**base)])
    assert analyse(tmp_path)["stale"] == []  # a launch-dated figure does not expire
    write(tmp_path, MODELS, [], [claim(perishable=True, **base)])
    assert analyse(tmp_path)["stale"] == ["c1"]
