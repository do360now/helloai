"""
test_pro_demand_report.py — Offline, dependency-free tests for pro_demand_report.py.

Run with: python scripts/test_pro_demand_report.py
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from pro_demand_report import extract_event, aggregate, to_rows, week_key  # noqa: E402

# A well-formed event reused across cases (ts → 2026-W22).
_TS = 1780209439696
RAW = json.dumps({"ts": _TS, "outcome": "quote", "status": 402, "callerId": "a",
                  "task": "coding", "maxCost": None, "minContext": None,
                  "provider": None, "paymentHash": "ab", "latencyMs": 3})
PREFIXED = f"2026-05-31T06:37:19 helloai-web [pro-metrics] {RAW}"
REDEEMED = json.dumps({"ts": _TS + 60000, "outcome": "redeemed", "status": 200,
                       "callerId": "b", "task": "reasoning", "amountSats": 100,
                       "latencyMs": 40})


def main() -> None:
    failures: list[str] = []

    def check(cond: bool, msg: str) -> None:
        if not cond:
            failures.append(f"FAIL: {msg}")

    # extract_event: raw JSON line parses
    ev = extract_event(RAW)
    check(ev is not None and ev["outcome"] == "quote",
          f"raw line should parse to a quote event, got {ev}")

    # extract_event: log-prefixed line parses (marker substring)
    ev = extract_event(PREFIXED)
    check(ev is not None and ev["outcome"] == "quote" and ev["ts"] == _TS,
          f"prefixed line should parse past the marker, got {ev}")

    # extract_event: unrelated noise → None
    check(extract_event("this is an unrelated log line, ignore me") is None,
          "noise line should yield None")

    # extract_event: JSON dict missing required keys → None
    check(extract_event('{"hello":"world"}') is None,
          "dict without ts/outcome should yield None")

    # extract_event: malformed JSON → None (no raise)
    check(extract_event('[pro-metrics] {not json') is None,
          "malformed JSON after marker should yield None")

    # aggregate round-trip: quote + redeemed + duplicate redeemed (deduped).
    # aggregate reads via iter_lines(paths); monkeypatch it to feed fixed lines.
    import pro_demand_report as mod
    original_iter = mod.iter_lines
    mod.iter_lines = lambda paths: iter([RAW, REDEEMED, REDEEMED, "noise"])
    try:
        weeks = aggregate(["-"], dedup=True)
        rows = to_rows(weeks)
    finally:
        mod.iter_lines = original_iter

    check(len(rows) == 1, f"expected 1 week row, got {len(rows)}")
    if rows:
        r = rows[0]
        check(r["week"] == week_key(_TS), f"week mismatch: {r['week']}")
        check(r["requests"] == 2, f"requests: expected 2 (dup deduped), got {r['requests']}")
        check(r["quotes"] == 1, f"quotes: expected 1, got {r['quotes']}")
        check(r["attempts"] == 1, f"attempts: expected 1, got {r['attempts']}")
        check(r["redeemed"] == 1, f"redeemed: expected 1, got {r['redeemed']}")
        check(r["sats"] == 100, f"sats: expected 100, got {r['sats']}")
        check(r["callers"] == 2, f"callers: expected 2, got {r['callers']}")

    # aggregate with dedup off counts the duplicate
    mod.iter_lines = lambda paths: iter([RAW, REDEEMED, REDEEMED, "noise"])
    try:
        rows_nd = to_rows(aggregate(["-"], dedup=False))
    finally:
        mod.iter_lines = original_iter
    check(rows_nd and rows_nd[0]["redeemed"] == 2 and rows_nd[0]["sats"] == 200,
          f"no-dedup should count dup: {rows_nd}")

    if failures:
        print("\n".join(failures))
        print(f"\n{len(failures)} test(s) failed.")
        sys.exit(1)
    print("All pro_demand_report tests passed.")


if __name__ == "__main__":
    main()
