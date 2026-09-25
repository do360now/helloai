#!/usr/bin/env python3
"""
api_usage_report.py — Summarise [api-metrics] and [go-metrics] log lines.

Reads a saved log file (e.g. `az webapp log tail` output redirected by the
operator) and prints counts by day, UA class, path, distinct ip_hash per day,
top param keys and /go/ redirect requests. Pure stdlib.

  python3 scripts/api_usage_report.py app.log

Exits 0 with a message when the file is missing (same convention as
check_cluster_bench.py).

Reading the numbers: UA classes are labels, not proof of intent. The
declared_ai_client, programmatic and empty columns are reported separately and
never summed into "agents". ip_hash rotates daily, so distinct counts are only
comparable within a day, and it hashes the first X-Forwarded-For entry (client-controlled), so a distinct
count is an upper bound until client-IP handling is fixed. A null ip_hash means METRICS_SALT was unset. Requests with no X-Forwarded-For share one ip_hash (not one caller). CORS preflights (method OPTIONS) are counted as requests.
"""

from __future__ import annotations

import json
import sys
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

API_MARK = "[api-metrics] "
GO_MARK = "[go-metrics] "


def _payload(line: str, mark: str):
    i = line.find(mark)
    if i < 0:
        return None
    try:
        obj = json.loads(line[i + len(mark):])
    except ValueError:
        return None
    return obj if isinstance(obj, dict) else None


def parse_lines(lines):
    api, go = [], []
    for line in lines:
        rec = _payload(line, API_MARK)
        if rec is not None:
            if isinstance(rec.get("ts"), (int, float)):  # skip truncated or merged records
                api.append(rec)
            continue
        rec = _payload(line, GO_MARK)
        if rec is not None and isinstance(rec.get("ts"), (int, float)):
            go.append(rec)
    return api, go


def _day(ts) -> str:
    return datetime.fromtimestamp(ts / 1000, tz=timezone.utc).strftime("%Y-%m-%d")


def build_report(api, go):
    days = defaultdict(lambda: {"requests": 0, "by_ua": Counter(), "ips": set(), "rate_limited": 0})
    by_path, params = Counter(), Counter()
    for r in api:
        d = days[_day(r["ts"])]
        d["requests"] += 1
        d["by_ua"][r.get("ua", "unknown")] += 1
        d["ips"].add(r.get("ip_hash"))  # null hashes collapse to one entry
        d["rate_limited"] += bool(r.get("rate_limited"))
        by_path[r.get("path", "?")] += 1
        params.update(r.get("param_keys", []))
    out_days = {
        k: {
            "requests": v["requests"],
            "by_ua": dict(v["by_ua"]),
            "distinct_ip_hash": len(v["ips"]),
            "rate_limited": v["rate_limited"],
        }
        for k, v in sorted(days.items())
    }
    return {
        "days": out_days,
        "by_path": dict(by_path),
        "top_param_keys": params.most_common(10),
        "redirect_requests": dict(Counter(g.get("dest", "?") for g in go)),
        "redirect_requests_by_from": dict(Counter(g.get("from") or "(none)" for g in go)),
    }


def render(r) -> str:
    out = ["# API usage report", ""]
    for day, d in r["days"].items():
        ua = ", ".join(f"{k}={v}" for k, v in sorted(d["by_ua"].items()))
        out.append(f"{day}: {d['requests']} requests, {d['distinct_ip_hash']} distinct ip_hash, "
                   f"{d['rate_limited']} rate-limited | {ua}")
    out += ["", "By path: " + ", ".join(f"{k}={v}" for k, v in sorted(r["by_path"].items())),
            "Top param keys: " + ", ".join(f"{k}={v}" for k, v in r["top_param_keys"]),
            "redirect_requests: " + (", ".join(f"{k}={v}" for k, v in r["redirect_requests"].items()) or "none"),
            "redirect_requests by from: " + (", ".join(f"{k}={v}" for k, v in r["redirect_requests_by_from"].items()) or "none"),
            "",
            "Notes: UA classes are labels, not proof of intent; declared_ai_client, programmatic and empty are",
            "separate columns and are never summed into \"agents\". redirect_requests counts /go/ hits, not visits",
            "or activations (link previews and bots trigger them). Whether a visitor did anything in the app needs",
            "app-side data, which does not exist yet. ip_hash rotates daily and hashes the first X-Forwarded-For entry (client-controlled):",
            "compare distinct counts within a day only and treat them as an upper bound. A null ip_hash means METRICS_SALT was unset."]
    return "\n".join(out)


def main(argv=None) -> int:
    argv = sys.argv[1:] if argv is None else argv
    if len(argv) != 1:
        print("usage: api_usage_report.py LOGFILE")
        return 2
    path = Path(argv[0])
    if not path.exists():
        print(f"Log file not found: {path} (nothing to report)")
        return 0
    api, go = parse_lines(path.read_text(errors="replace").splitlines())
    if not api and not go:
        print("No [api-metrics] or [go-metrics] lines found.")
        return 0
    print(render(build_report(api, go)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
