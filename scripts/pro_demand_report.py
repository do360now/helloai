#!/usr/bin/env python3
"""
pro_demand_report.py — tally /api/pro/recommend demand from [pro-metrics] events.

Reads pro-metrics events from JSONL files, captured log files, or stdin, and prints a
per-ISO-week funnel: quotes issued, paid attempts, successful redemptions, sats earned,
and unique callers. Answers the only question that matters before building real payment
infra: is anyone actually using the paid endpoint?

Input lines may be raw event JSON (the data/ledger/pro-requests.jsonl file sink) or log
lines containing a "[pro-metrics] {json}" substring (Azure `make az_logs` output). Lines
that don't parse to a pro-metrics event are ignored.
"""
import argparse
import json
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

MARKER = "[pro-metrics] "
ATTEMPT_OUTCOMES = {"unsettled", "underpaid", "replay", "redeemed"}
DEFAULT_PATH = "data/ledger/pro-requests.jsonl"


def extract_event(line: str) -> dict | None:
    """Pull a pro-metrics event dict out of a raw or log-prefixed line, or None."""
    idx = line.find(MARKER)
    payload = line[idx + len(MARKER):] if idx != -1 else line
    payload = payload.strip()
    if not payload.startswith("{"):
        return None
    try:
        ev = json.loads(payload)
    except json.JSONDecodeError:
        return None
    if not isinstance(ev, dict) or "ts" not in ev or "outcome" not in ev:
        return None
    return ev


def week_key(ts_ms: int) -> str:
    iso = datetime.fromtimestamp(ts_ms / 1000, tz=timezone.utc).isocalendar()
    return f"{iso.year}-W{iso.week:02d}"


def iter_lines(paths: list[str]):
    if not paths:
        paths = [DEFAULT_PATH] if Path(DEFAULT_PATH).exists() else ["-"]
    for p in paths:
        if p == "-":
            yield from sys.stdin
        else:
            with open(p, "r", encoding="utf-8") as f:
                yield from f


def aggregate(paths: list[str], dedup: bool) -> dict:
    seen: set[str] = set()
    weeks: dict = defaultdict(
        lambda: {"requests": 0, "quotes": 0, "attempts": 0, "redeemed": 0,
                 "sats": 0, "callers": set()}
    )
    for line in iter_lines(paths):
        ev = extract_event(line)
        if ev is None:
            continue
        if dedup:
            canon = json.dumps(ev, sort_keys=True)
            if canon in seen:
                continue
            seen.add(canon)
        w = weeks[week_key(int(ev["ts"]))]
        outcome = ev.get("outcome")
        w["requests"] += 1
        if outcome == "quote":
            w["quotes"] += 1
        if outcome in ATTEMPT_OUTCOMES:
            w["attempts"] += 1
        if outcome == "redeemed":
            w["redeemed"] += 1
            w["sats"] += int(ev.get("amountSats") or 0)
        if ev.get("callerId"):
            w["callers"].add(ev["callerId"])
    return weeks


def to_rows(weeks: dict) -> list[dict]:
    rows = []
    for w in sorted(weeks):
        d = weeks[w]
        rows.append({"week": w, "requests": d["requests"], "quotes": d["quotes"],
                     "attempts": d["attempts"], "redeemed": d["redeemed"],
                     "sats": d["sats"], "callers": len(d["callers"])})
    return rows


def print_markdown(rows: list[dict]) -> None:
    if not rows:
        print("No pro-metrics events found.")
        return
    hdr = ["Week", "Requests", "Quotes", "Attempts", "Redeemed", "Sats", "Callers"]
    print("| " + " | ".join(hdr) + " |")
    print("|" + "|".join(["---"] * len(hdr)) + "|")
    tot = {k: 0 for k in ("requests", "quotes", "attempts", "redeemed", "sats")}
    all_callers_note = ""
    for r in rows:
        print(f"| {r['week']} | {r['requests']} | {r['quotes']} | {r['attempts']} "
              f"| {r['redeemed']} | {r['sats']} | {r['callers']} |")
        for k in tot:
            tot[k] += r[k]
    print(f"| **TOTAL** | {tot['requests']} | {tot['quotes']} | {tot['attempts']} "
          f"| {tot['redeemed']} | {tot['sats']} | — |")
    print()
    if tot["attempts"] == 0:
        print("Verdict: no paid attempts yet — quotes only. Not enough pull to justify a real "
              "Lightning backend.")
    else:
        print(f"Verdict: {tot['attempts']} paid attempt(s), {tot['redeemed']} redeemed, "
              f"{tot['sats']} sats earned. Real pull — revisit the real backend.")


def main() -> None:
    ap = argparse.ArgumentParser(description="Tally /api/pro/recommend demand from pro-metrics events.")
    ap.add_argument("paths", nargs="*", help="input files; '-' for stdin; default data/ledger/pro-requests.jsonl")
    ap.add_argument("--json", action="store_true", help="emit JSON instead of a markdown table")
    ap.add_argument("--no-dedup", action="store_true", help="count duplicate lines")
    args = ap.parse_args()

    weeks = aggregate(args.paths, dedup=not args.no_dedup)
    rows = to_rows(weeks)

    if args.json:
        total = {"requests": sum(r["requests"] for r in rows),
                 "quotes": sum(r["quotes"] for r in rows),
                 "attempts": sum(r["attempts"] for r in rows),
                 "redeemed": sum(r["redeemed"] for r in rows),
                 "sats": sum(r["sats"] for r in rows)}
        print(json.dumps({"weeks": rows, "total": total}, indent=2))
    else:
        print_markdown(rows)


if __name__ == "__main__":
    main()
