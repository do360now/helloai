#!/usr/bin/env python3
"""Record live view totals into data/views-baseline.json.

Run after the image build and before push (make stamp_views). The next
container loads this file and adds new views on top of it. The public
counters are counts only — this script never asks for, and never stores,
the salted IP digests.

On any failure the existing file is left untouched and the process exits
non-zero, so a deploy cannot replace a good snapshot with zeros.

  python3 scripts/snapshot_views.py            # read https://helloai.com
  python3 scripts/snapshot_views.py --self-test
"""

from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
OUT = DATA / "views-baseline.json"
SITE = "https://helloai.com"
CAP = 1_000_000_000
SLUGS_PER_REQUEST = 50


def slugs(data: Path) -> list[str]:
    articles = json.loads((data / "articles.json").read_text())
    models = json.loads((data / "models.json").read_text())
    out = ["home", "articles"]
    out += [f"article/{a['slug']}" for a in articles]
    out += [f"model/{m['id']}" for m in models]
    return out


def fetch(url: str) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": "helloai-snapshot", "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=20) as res:
        body = json.loads(res.read().decode())
    if not isinstance(body, dict):
        raise ValueError(f"expected an object from {url}")
    return body


def parse_carry(data: object) -> dict | None:
    if not isinstance(data, dict):
        return None
    total = data.get("total")
    since = data.get("since")
    views = data.get("views")
    if type(total) is not int or total < 0 or total > CAP:
        return None
    if not isinstance(since, str):
        return None
    try:
        # fromisoformat accepts the Z suffix on 3.11+.
        parsed = since.replace("Z", "+00:00")
        from datetime import datetime

        datetime.fromisoformat(parsed)
    except ValueError:
        return None
    if not isinstance(views, dict):
        return None
    clean: dict[str, int] = {}
    for key, value in views.items():
        if not isinstance(key, str) or not _slug_ok(key):
            continue
        if type(value) is not int or value < 0 or value > CAP:
            continue
        clean[key] = value
    return {"since": since, "total": total, "views": clean}


def _slug_ok(key: str) -> bool:
    import re

    return re.fullmatch(r"home|articles|article/[a-z0-9-]{1,120}|model/[a-z0-9-]{1,40}", key) is not None


def _carried(part: dict) -> bool:
    return part["total"] > 0 or any(part["views"].values())


def merge(parts: list[dict]) -> dict:
    # An empty stub (total 0, epoch since) must not become the displayed clock.
    dated = [p for p in parts if _carried(p)]
    clock = dated or parts
    since = min(p["since"] for p in clock)
    total = 0
    views: dict[str, int] = {}
    for part in parts:
        if part["total"] > total:
            total = part["total"]
        for key, value in part["views"].items():
            # Missing slugs are zero, so a 0 from one source must not erase a higher count.
            if value > views.get(key, 0):
                views[key] = value
    peak = max(views.values(), default=0)
    if peak > total:
        total = peak
    return {"since": since, "total": total, "views": dict(sorted(views.items()))}


def live_carry(site: str, names: list[str]) -> dict:
    one = fetch(f"{site}/api/views?slug=home")
    if type(one.get("total")) is not int or not isinstance(one.get("since"), str):
        raise ValueError(f"{site}/api/views?slug=home did not return total and since")
    views: dict[str, int] = {}
    for i in range(0, len(names), SLUGS_PER_REQUEST):
        chunk = names[i : i + SLUGS_PER_REQUEST]
        batch = fetch(f"{site}/api/views?slugs={','.join(chunk)}")
        stats = batch.get("stats")
        if not isinstance(stats, dict):
            raise ValueError(f"{site} batch response has no stats object")
        for key, value in stats.items():
            if isinstance(key, str) and _slug_ok(key) and type(value) is int and 0 <= value <= CAP:
                views[key] = value
    # The single-slug payload's views count is authoritative for home.
    if type(one.get("views")) is int:
        views["home"] = one["views"]
    parsed = parse_carry({"since": one["since"], "total": one["total"], "views": views})
    if parsed is None:
        raise ValueError("live counters failed validation")
    return parsed


def read_existing(path: Path) -> dict | None:
    if not path.is_file():
        return None
    try:
        return parse_carry(json.loads(path.read_text()))
    except (OSError, json.JSONDecodeError):
        return None


def write_out(path: Path, carry: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(carry, indent=2) + "\n")
    tmp.replace(path)


def snapshot(site: str = SITE, data: Path = DATA, out: Path = OUT) -> dict:
    fresh = live_carry(site, slugs(data))
    previous = read_existing(out)
    merged = merge([previous, fresh] if previous else [fresh])
    write_out(out, merged)
    return merged


def _self_test() -> None:
    old = {"since": "2026-09-01T00:00:00.000Z", "total": 10, "views": {"home": 8, "article/a": 3}}
    new = {"since": "2026-10-01T00:00:00.000Z", "total": 4, "views": {"home": 9, "articles": 2}}
    got = merge([old, new])
    assert got["total"] == 10, got
    assert got["views"]["home"] == 9, got
    assert got["views"]["article/a"] == 3, got
    assert got["views"]["articles"] == 2, got
    assert got["since"] == "2026-09-01T00:00:00.000Z", got
    assert list(got["views"]) == sorted(got["views"])
    assert parse_carry({"total": -1, "since": "2026-01-01T00:00:00.000Z", "views": {}}) is None
    junk = parse_carry(
        {"total": 1, "since": "2026-01-01T00:00:00.000Z", "views": {"__proto__": 5, "home": 1, "nope": 3}}
    )
    assert junk is not None and junk["views"] == {"home": 1}, junk
    raised = merge([{"since": "2026-01-01T00:00:00.000Z", "total": 1, "views": {"home": 5}}])
    assert raised["total"] == 5, raised
    stub = {"since": "1970-01-01T00:00:00.000Z", "total": 0, "views": {}}
    live = {"since": "2026-09-26T21:04:20.986Z", "total": 230, "views": {"home": 190}}
    kept = merge([stub, live])
    assert kept["since"] == live["since"], kept
    assert kept["total"] == 230 and kept["views"]["home"] == 190, kept
    print("snapshot_views self-test ok")


def main(argv: list[str]) -> int:
    if "--self-test" in argv:
        _self_test()
        return 0
    site = SITE
    if "--site" in argv:
        site = argv[argv.index("--site") + 1].rstrip("/")
    try:
        merged = snapshot(site)
    except (OSError, urllib.error.URLError, ValueError, json.JSONDecodeError) as exc:
        print(f"ERROR: could not record live view counts from {site}: {exc}", file=sys.stderr)
        print(f"Leaving {OUT} unchanged so a deploy does not ship a zeroed counter.", file=sys.stderr)
        return 1
    print(f"Recorded view totals from {site}: total={merged['total']} since={merged['since']} slugs={len(merged['views'])}")
    print(f"Wrote {OUT}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
