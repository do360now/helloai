#!/usr/bin/env python3
"""
check_cluster_bench.py — Local cluster benchmark drift guard.

Parses the "Model comparison — cluster-only" table in the gpu-cluster repo's
benchmarks/results.md and compares measured numbers against
data/open_weight_models.json. Deterministic counterpart to the judgment work
the leaderboard-updater role (Grok) does in the weekly update: this script
detects drift and surfaces new bench rows; the agent decides what to apply.

  python scripts/check_cluster_bench.py        # report drift (exit 1)
  python scripts/check_cluster_bench.py --ok   # always exit 0 (log only)

The source file lives on the local workstation only. When it is missing
(e.g. the scheduled remote weekly run), the guard logs the last integrated
bench date and exits 0 — a missing source never fails a run.
"""

from __future__ import annotations

import argparse
import os
import re
import sys
from dataclasses import dataclass
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from config import config
from utils import read_json, setup_logger

log = setup_logger("cluster-bench")

_DEFAULT_RESULTS_PATH = Path("/home/cmc/git/gpu-cluster/benchmarks/results.md")
_SECTION_HEADING = "## Model comparison — cluster-only"
_TG_TOLERANCE = 0.5  # tok/s slack so JSON rounding (44.7 vs 44.70) is not drift

# Exact bench-table model name → open_weight_models.json id.
# Same exact-match philosophy as arena.py's _OPEN_WEIGHT_NAME_MAP:
# unmapped rows are surfaced as candidates, never fuzzy-matched.
_BENCH_NAME_MAP: dict[str, str] = {
    "Qwen3-14B": "qwen14b",
    "Mistral Small 3.2 24B": "mistral",
    "Qwen3-30B-A3B (MoE)": "qwen30ba3b",
    "gpt-oss-20b (MoE)": "gptoss20b",
}


@dataclass
class BenchRow:
    name: str
    quant: str
    size_gb: float | None
    tg128: float | None


@dataclass
class DriftFinding:
    model_id: str
    field: str
    tracked: str
    measured: str


def _first_float(cell: str) -> float | None:
    """Mean from cells like '44.70 ± 0.53', '~5GB', '13.70 GiB', '43.5'."""
    match = re.search(r"(\d+(?:\.\d+)?)", cell)
    return float(match.group(1)) if match else None


def parse_bench_table(text: str) -> list[BenchRow]:
    """Rows of the cluster-only comparison table; [] if the section is absent."""
    if _SECTION_HEADING not in text:
        return []
    section = text.split(_SECTION_HEADING, 1)[1]
    section = re.split(r"\n## ", section, maxsplit=1)[0]  # stop at next H2

    rows: list[BenchRow] = []
    for line in section.splitlines():
        stripped = line.strip()
        if not stripped.startswith("|"):
            continue
        if set(stripped) <= {"|", "-", " "}:  # separator row
            continue
        cells = [c.strip() for c in stripped.strip("|").split("|")]
        if len(cells) < 7 or cells[0] == "Model":
            continue
        rows.append(
            BenchRow(
                name=cells[0],
                quant=cells[1],
                size_gb=_first_float(cells[2]),
                tg128=_first_float(cells[5]),
            )
        )
    return rows


def compare(
    rows: list[BenchRow],
    models: list[dict],
) -> tuple[list[DriftFinding], list[str]]:
    """Diff bench rows against tracked models.

    Returns (drift findings, new-candidate descriptions). Size overruns are
    warn-only: quant file size legitimately differs from recommended vram_gb.
    """
    models_by_id = {m["id"]: m for m in models}
    findings: list[DriftFinding] = []
    candidates: list[str] = []

    for row in rows:
        model_id = _BENCH_NAME_MAP.get(row.name)
        if model_id is None:
            candidates.append(f"{row.name} ({row.quant}, tg128 {row.tg128} tok/s)")
            continue
        model = models_by_id.get(model_id)
        if model is None:
            candidates.append(
                f"{row.name} (mapped id '{model_id}' missing from open_weight_models.json)"
            )
            continue

        if row.tg128 is not None and abs(model["tokens_per_sec"] - row.tg128) > _TG_TOLERANCE:
            findings.append(
                DriftFinding(
                    model_id=model_id,
                    field="tokens_per_sec",
                    tracked=str(model["tokens_per_sec"]),
                    measured=str(row.tg128),
                )
            )
        if row.quant and row.quant not in model.get("quantization", []):
            findings.append(
                DriftFinding(
                    model_id=model_id,
                    field="quantization",
                    tracked=str(model.get("quantization", [])),
                    measured=row.quant,
                )
            )
        if row.size_gb is not None and row.size_gb > model["vram_gb"]:
            log.warning(
                f"  [{model_id}] bench file size {row.size_gb} GB exceeds "
                f"vram_gb {model['vram_gb']} — check the recommended quant (warn only)"
            )

    return findings, candidates


def last_integrated_date(models: list[dict]) -> str:
    dates = [m["bench_source"]["date"] for m in models if "bench_source" in m]
    return max(dates) if dates else "never"


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Check local cluster benchmarks vs open_weight_models.json"
    )
    parser.add_argument(
        "--ok",
        action="store_true",
        help="Always exit 0 (log findings only; for dry runs)",
    )
    args = parser.parse_args()

    results_path = Path(
        os.environ.get("CLUSTER_BENCH_RESULTS", str(_DEFAULT_RESULTS_PATH))
    )
    models = read_json(config.open_weight_models_path)

    if not results_path.exists():
        log.info(
            "cluster bench source unavailable (remote run?) — "
            f"last integrated: {last_integrated_date(models)}"
        )
        return 0

    rows = parse_bench_table(results_path.read_text(encoding="utf-8"))
    if not rows:
        log.warning(f"no '{_SECTION_HEADING}' table found in {results_path}")
        return 0

    findings, candidates = compare(rows, models)

    for candidate in candidates:
        log.info(f"  [new bench candidate] {candidate}")

    if not findings:
        log.info("No cluster bench drift detected.")
        return 0

    log.warning(f"Found {len(findings)} cluster bench drift finding(s):")
    for f in findings:
        log.warning(
            f"  [{f.model_id}] {f.field}: tracked {f.tracked} → measured {f.measured}"
        )

    if args.ok:
        return 0
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
