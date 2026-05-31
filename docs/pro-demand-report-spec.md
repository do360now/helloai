# Implementation spec: `scripts/pro_demand_report.py`

**Author:** Opus (advisor) · **Executor:** Sonnet or Haiku · **Status:** ready to implement
**Depends on:** `docs/pro-metrics-spec.md` (the `[pro-metrics]` events must exist first)

## Goal

A tiny read-only report that answers **"is anyone using the paid endpoint?"** It tallies the
`[pro-metrics]` events emitted by `/api/pro/recommend` into a per-ISO-week funnel:
**quotes issued → paid attempts → redemptions → sats earned**, plus unique callers.

This is a one-file Python script. No new dependencies (stdlib only). Read-only — it never
writes data, never touches the live site.

## Input formats (must handle both)

The same event reaches two sinks (see metrics spec), so the report must parse either:

1. **Raw JSONL** — lines from `data/ledger/pro-requests.jsonl` (the file sink): each line is the
   bare event JSON, e.g. `{"ts":1780209439696,"outcome":"quote",...}`.
2. **Prefixed log lines** — from the Azure log stream (`make az_logs`), where the platform
   prepends its own timestamp/container fields and our line appears as a substring:
   `2026-05-31T06:37:19 helloai-web [pro-metrics] {"ts":...}`.

Rule: for each input line, find the marker `[pro-metrics] `; if present, parse everything after
it as JSON, otherwise try to parse the whole line as JSON. A line that doesn't yield a dict with
both `ts` and `outcome` is silently skipped (logs are noisy — that's expected).

## Funnel definitions

- **Requests** — every event.
- **Quotes** — `outcome == 'quote'` (a 402 invoice was issued; top of funnel).
- **Attempts** — a well-formed preimage was actually presented:
  `outcome in {unsettled, underpaid, replay, redeemed}`. This is the meaningful demand signal —
  someone tried to pay. (`invalid_preimage` is malformed/noise; it counts in Requests only.)
- **Redeemed** — `outcome == 'redeemed'` (a successful paid call).
- **Sats** — sum of `amountSats` over redeemed events.
- **Callers** — count of distinct `callerId`.

## Dedup

If someone concatenates the JSONL file *and* a log capture, the same event appears twice with
byte-identical JSON. Dedup on the canonical event JSON (`json.dumps(ev, sort_keys=True)`) — two
genuinely distinct requests never collide (they differ in `ts`/`latencyMs`). On by default;
`--no-dedup` disables.

## CLI

```
python3 scripts/pro_demand_report.py [paths...] [--json] [--no-dedup]
```
- `paths` — one or more input files; `-` means stdin. Default when omitted:
  `data/ledger/pro-requests.jsonl` if it exists, else stdin.
- `--json` — emit a JSON object (`{week: {...}, ...}` plus a `total`) instead of the markdown table.
- `--no-dedup` — count every line.

## Full script — `scripts/pro_demand_report.py`

```python
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
```

## Validation (must pass before done)

Self-check with sample input (no real data needed):

```bash
printf '%s\n' \
  '2026-05-31T06:37:19 helloai-web [pro-metrics] {"ts":1780209439696,"outcome":"quote","status":402,"callerId":"a","task":"coding","maxCost":null,"minContext":null,"provider":null,"paymentHash":"ab","latencyMs":3}' \
  '{"ts":1780209500000,"outcome":"redeemed","status":200,"callerId":"b","task":"reasoning","maxCost":null,"minContext":null,"provider":null,"paymentHash":"cd","amountSats":100,"latencyMs":40}' \
  '{"ts":1780209500000,"outcome":"redeemed","status":200,"callerId":"b","task":"reasoning","maxCost":null,"minContext":null,"provider":null,"paymentHash":"cd","amountSats":100,"latencyMs":40}' \
  'this is an unrelated log line, ignore me' \
  | python3 scripts/pro_demand_report.py -
```

Expected: one week row with **Requests 2, Quotes 1, Attempts 1, Redeemed 1, Sats 100,
Callers 2** (the duplicate `redeemed` line is deduped; the noise line is ignored), and the
"real pull" verdict. Then confirm `--no-dedup` reports Redeemed 2 / Sats 200, and `--json`
emits valid JSON.

Also run it against the live data once it exists:

```bash
make az_logs > /tmp/pro.log   # let it capture for a bit, Ctrl+C
python3 scripts/pro_demand_report.py /tmp/pro.log
```

## Optional (only if quick)

A `tests/test_pro_demand_report.py` (pytest) covering `extract_event` (raw line, prefixed line,
noise line → None) and a small `aggregate` round-trip. Skip if the repo has no Python test
harness wired up — the sample-input self-check above is sufficient.

## Out of scope

- No changes to the metrics emitter or the endpoint.
- No writing/rotation of log files, no live polling daemon — this is a manual, on-demand report.
- No deploy, no commit unless asked; if asked, commit only `scripts/pro_demand_report.py`
  (and the optional test).
