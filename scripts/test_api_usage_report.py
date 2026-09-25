"""
test_api_usage_report.py — Offline tests for the [api-metrics] / [go-metrics] log reader.

Run with: python3 -m pytest scripts/test_api_usage_report.py
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from api_usage_report import build_report, main, parse_lines

DAY1 = 1790352003887  # 2026-09-25 UTC
DAY2 = DAY1 + 86_400_000


def m(ts, ua, path="/api/models", ip="aaaaaaaa", keys=(), limited=False):
    body = json.dumps({"ts": ts, "path": path, "ua": ua, "ip_hash": ip, "param_keys": list(keys), "rate_limited": limited})
    return f"2026-09-26T10:00:00Z [api-metrics] {body}"


LOG = "\n".join([
    m(DAY1, "browser", ip="aaaaaaaa"),
    m(DAY1, "browser", ip="aaaaaaaa"),
    m(DAY1, "declared_ai_client", "/api/recommend", "bbbbbbbb", ["task", "max_cost"]),
    m(DAY1, "programmatic", "/api/recommend", "cccccccc", ["task"]),
    m(DAY1, "empty", ip="dddddddd"),
    m(DAY2, "search_bot", ip="aaaaaaaa"),
    "unrelated line",
    '[api-metrics] {not json',
    '[go-metrics] {"ts": %d, "dest": "app", "from": "hero-cta"}' % DAY1,
    '[go-metrics] {"ts": %d, "dest": "app", "from": null}' % DAY1,
])


def test_parse_skips_bad_lines():
    api, go = parse_lines(LOG.splitlines())
    assert len(api) == 6
    assert len(go) == 2


def test_counts_by_day_and_class_keep_agent_columns_separate():
    r = build_report(*parse_lines(LOG.splitlines()))
    d1 = r["days"]["2026-09-25"]
    assert d1["requests"] == 5
    assert d1["by_ua"]["declared_ai_client"] == 1
    assert d1["by_ua"]["programmatic"] == 1
    assert d1["by_ua"]["empty"] == 1
    assert d1["distinct_ip_hash"] == 4
    assert r["days"]["2026-09-26"]["distinct_ip_hash"] == 1
    assert "agents" not in d1  # never summed into one "agents" figure


def test_top_params_and_paths():
    r = build_report(*parse_lines(LOG.splitlines()))
    assert r["top_param_keys"][0] == ("task", 2)
    assert r["by_path"]["/api/recommend"] == 2


def test_redirect_requests_not_clicks():
    r = build_report(*parse_lines(LOG.splitlines()))
    assert r["redirect_requests"] == {"app": 2}
    assert r["redirect_requests_by_from"]["hero-cta"] == 1


def test_missing_file_exits_zero(tmp_path, capsys):
    assert main([str(tmp_path / "nope.log")]) == 0
    assert "not found" in capsys.readouterr().out.lower()


def test_report_footer_states_the_limits(tmp_path, capsys):
    f = tmp_path / "x.log"
    f.write_text(LOG)
    assert main([str(f)]) == 0
    out = capsys.readouterr().out
    assert "redirect_requests" in out
    assert "not visits" in out.lower()


def test_record_without_ts_is_skipped_not_a_crash():
    lines = ['[api-metrics] {"path": "/api/models", "ua": "browser"}', m(DAY1, "browser")]
    api, go = parse_lines(lines)
    r = build_report(api, go)
    assert r["days"]["2026-09-25"]["requests"] == 1


def test_from_split_is_printed(tmp_path, capsys):
    f = tmp_path / "x.log"
    f.write_text(LOG)
    main([str(f)])
    out = capsys.readouterr().out
    assert "hero-cta" in out and "(none)" in out
