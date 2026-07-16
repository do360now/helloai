"""
test_check_cluster_bench.py — Offline tests for cluster bench drift logic.

Run with: /home/cmc/git/grok/helloai/.venv/bin/python3 scripts/test_check_cluster_bench.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from check_cluster_bench import compare, last_integrated_date, parse_bench_table

FIXTURE = """
# Cluster benchmark results

Hardware: GTX 1070 8GB + RTX 5060 8GB, 1GbE.

## Task 7 — six-row matrix

| Row | Model | Where | ngl | pp512 tok/s | tg128 tok/s |
|---|---|---|---|---|---|
| A | 8B Q4_K_M | 1070 alone | 99 | 477.6 | 29.7 |

## Model comparison — cluster-only (2026-07-15, MoE rows added 2026-07-16)

| Model | Quant | Size | Params | pp512 tok/s | tg128 tok/s | Fit |
|---|---|---|---|---|---|---|
| Qwen3-8B | Q4_K_M | ~5GB | 8B | 60.2 (chat, not llama-bench) | 43.5 | comfortable |
| Qwen3-30B-A3B (MoE) | Q3_K_M | 13.70 GiB | 30.53B total, ~3B active | 673.12 ± 26.28 | 44.70 ± 0.53 | tight |
| gpt-oss-20b (MoE) | MXFP4 | 11.27 GiB | 20.91B total | 1028.32 ± 9.42 | 53.73 ± 0.53 | comfortable |

### When clustering wins

Prose here must not be parsed as rows.
"""

MODELS = [
    {
        "id": "qwen8b",
        "tokens_per_sec": 43.5,
        "vram_gb": 5,
        "quantization": ["Q4_K_M"],
        "bench_source": {"type": "first-party", "date": "2026-07-05"},
    },
    {
        "id": "qwen30ba3b",
        "tokens_per_sec": 44.7,
        "vram_gb": 14,
        "quantization": ["Q3_K_M"],
        "bench_source": {"type": "first-party", "date": "2026-07-15"},
    },
    {
        "id": "gemma",
        "tokens_per_sec": 50,
        "vram_gb": 18,
        "quantization": ["Q4_K_M", "Q8_0"],
    },
]


def test_parses_only_the_cluster_table() -> None:
    rows = parse_bench_table(FIXTURE)
    assert [r.name for r in rows] == ["Qwen3-8B", "Qwen3-30B-A3B (MoE)", "gpt-oss-20b (MoE)"]
    assert rows[0].quant == "Q4_K_M"
    assert rows[0].tg128 == 43.5
    assert rows[1].tg128 == 44.70  # mean extracted from "44.70 ± 0.53"
    assert rows[1].size_gb == 13.70
    assert rows[2].name == "gpt-oss-20b (MoE)"


def test_clean_data_yields_no_drift_and_flags_candidates() -> None:
    findings, candidates = compare(parse_bench_table(FIXTURE), MODELS)
    assert findings == []
    assert len(candidates) == 1
    assert "gpt-oss-20b" in candidates[0]


def test_tokens_per_sec_drift_detected() -> None:
    stale = [dict(MODELS[0], tokens_per_sec=39.0)] + MODELS[1:]
    findings, _ = compare(parse_bench_table(FIXTURE), stale)
    assert len(findings) == 1
    assert findings[0].model_id == "qwen8b"
    assert findings[0].field == "tokens_per_sec"


def test_quant_drift_detected() -> None:
    stale = [dict(MODELS[1], quantization=["Q4_K_M"])] + [MODELS[0], MODELS[2]]
    findings, _ = compare(parse_bench_table(FIXTURE), stale)
    assert any(f.field == "quantization" and f.model_id == "qwen30ba3b" for f in findings)


def test_tolerance_absorbs_rounding() -> None:
    rounded = [dict(MODELS[0], tokens_per_sec=43.2)] + MODELS[1:]  # |43.2-43.5| < 0.5
    findings, _ = compare(parse_bench_table(FIXTURE), rounded)
    assert findings == []


def test_last_integrated_date() -> None:
    assert last_integrated_date(MODELS) == "2026-07-15"
    assert last_integrated_date([MODELS[2]]) == "never"


def main() -> None:
    failures: list[str] = []
    tests = [
        test_parses_only_the_cluster_table,
        test_clean_data_yields_no_drift_and_flags_candidates,
        test_tokens_per_sec_drift_detected,
        test_quant_drift_detected,
        test_tolerance_absorbs_rounding,
        test_last_integrated_date,
    ]
    for test in tests:
        try:
            test()
        except AssertionError as exc:
            failures.append(f"FAIL: {test.__name__}: {exc}")

    if failures:
        for msg in failures:
            print(msg)
        raise SystemExit(1)
    print(f"PASS: {len(tests)} tests")


if __name__ == "__main__":
    main()
