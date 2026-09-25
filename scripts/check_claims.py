#!/usr/bin/env python3
"""
check_claims.py — drift reporter for hand-written claims (docs/review/claims-guard.md).

Percentages and named benchmarks in data/models.json `desc` and data/categories.json `insight` must be
registered in data/claims.json. Prints unregistered claim-like text, registry entries that no longer
appear in the prose, confirmed claims past their freshness limit, and the list of unverified claims.

  python3 scripts/check_claims.py          # report drift (exit 1)
  python3 scripts/check_claims.py --ok     # always exit 0 (log only)
  python3 scripts/check_claims.py DIR      # read DIR instead of data/

Missing files never fail a run (exit 0 with a message), same convention as check_cluster_bench.py.
Pure stdlib. The Jest guard (__tests__/claims.test.ts) enforces the same rules in CI.
"""

from __future__ import annotations

import json
import re
import sys
from datetime import date, datetime
from pathlib import Path

# Percentages, multipliers, Elo-range numbers (1400-1999) and named benchmarks. Keep in sync with __tests__/claims.test.ts.
CLAIM_LIKE = re.compile(
    r"\b\d+(?:\.\d+)?\s?%|\b\d+(?:\.\d+)?x\b|\bdouble\b|\btriple\b|\bhalf\b|\b1[4-9]\d{2}\b"
    r"|ARC-AGI|GPQA|SWE-bench|Terminal-Bench|MMLU|\bHLE\b|AIME"
)
MAX_AGE_DAYS = {"vendor-reported": 30, "independent": 60, "first-party": 60}
DEFAULT_DIR = Path(__file__).resolve().parent.parent / "data"


def _load(path: Path):
    return json.loads(path.read_text())


def analyse(data_dir: Path) -> dict:
    models = _load(data_dir / "models.json")
    categories = _load(data_dir / "categories.json")
    claims = _load(data_dir / "claims.json")

    prose = [(f"models.json ({m['name']}) desc", m["name"], m.get("desc", "")) for m in models]
    prose += [(f"models.json ({m['name']}) tag", m["name"], m.get("tag", "")) for m in models]
    prose += [(f"categories.json ({c['name']}) insight", c["name"], c.get("insight", "")) for c in categories]

    unregistered: list[str] = []
    for where, subject, text in prose:
        rest = text
        for c in (c for c in claims if c["subject"] == subject):
            rest = rest.replace(c["text"], " ")
        unregistered += [f'{where}: "{hit}"' for hit in CLAIM_LIKE.findall(rest)]

    dead = [c["id"] for c in claims if not any(s == c["subject"] and c["text"] in t for _, s, t in prose)]

    stale: list[str] = []
    today = date.today()
    for c in claims:
        # Only perishable claims expire: a launch-dated figure is honest via as_of and must not invite
        # bumping checked_at by hand.
        if c.get("verification") == "confirmed" and c.get("perishable") and c.get("checked_at"):
            age = (today - datetime.strptime(c["checked_at"], "%Y-%m-%d").date()).days
            if age > MAX_AGE_DAYS.get(c.get("kind", "vendor-reported"), 60):
                stale.append(c["id"])

    return {
        "unregistered": unregistered,
        "dead": dead,
        "stale": stale,
        "unverified": [c["id"] for c in claims if c.get("verification") == "unverified"],
    }


def main(argv=None) -> int:
    argv = sys.argv[1:] if argv is None else list(argv)
    ok_mode = "--ok" in argv
    args = [a for a in argv if a != "--ok"]
    data_dir = Path(args[0]) if args else DEFAULT_DIR
    try:
        r = analyse(data_dir)
    except FileNotFoundError as e:
        print(f"Data file not found ({e.filename}); nothing to check.")
        return 0

    print("# Claims drift report")
    for label, key in (("Unregistered claim-like text", "unregistered"), ("Registry entries not in the prose", "dead"),
                       ("Confirmed claims past their freshness limit", "stale")):
        print(f"\n{label}: {len(r[key])}")
        for item in r[key]:
            print(f"  - {item}")
    print(f"\nUnverified claims (need a person to open the source and confirm): {len(r['unverified'])}")
    for item in r["unverified"]:
        print(f"  - {item}")

    drift = bool(r["unregistered"] or r["dead"] or r["stale"])
    print("\nResult: " + ("DRIFT" if drift else "clean"))
    return 0 if (ok_mode or not drift) else 1


if __name__ == "__main__":
    sys.exit(main())
