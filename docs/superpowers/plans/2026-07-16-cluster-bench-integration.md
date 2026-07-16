# Cluster Benchmark Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface first-party llama.cpp benchmark numbers (GTX 1070 + RTX 5060 cluster) in the "Run it yourself" section with a provenance badge, and add a deterministic drift guard so the weekly Grok update detects when the benchmark source file changes.

**Architecture:** Data-layer merge into `data/open_weight_models.json` (3 new Qwen entries + Mistral update) with a new optional `bench_source` schema field rendered as a badge by `OpenWeightCard`. A new stdlib-only Python guard (`scripts/check_cluster_bench.py`, modeled on `check_provider_catalog.py`) parses the bench table and diffs it against the JSON; the weekly-update skill and leaderboard-updater agent spec wire it into the Grok pipeline.

**Tech Stack:** Next.js 16 / TypeScript strict / React 19 (UI), Python 3 via `/home/cmc/git/grok/helloai/.venv/bin/python3` (scripts), Jest (data tests).

**Spec:** `docs/superpowers/specs/2026-07-16-cluster-bench-integration-design.md`

## Global Constraints

- Repo root: `/home/cmc/git/grok/helloai`. All commands run from there.
- Python: always `/home/cmc/git/grok/helloai/.venv/bin/python3` (never bare `python3`) for repo scripts.
- Bench source file: `/home/cmc/git/gpu-cluster/benchmarks/results.md`, overridable via `CLUSTER_BENCH_RESULTS` env var. Missing file is NEVER an error (remote runs).
- Reference hardware string, verbatim everywhere: `GTX 1070 8GB + RTX 5060 8GB (llama.cpp RPC split, 1GbE)`
- Open-weight model ids must match `^[a-z0-9]+$` and not collide with frontier `models.json` ids. New ids: `qwen8b`, `qwen14b`, `qwen30ba3b`.
- `open_weight_models.json` must stay 3–6 entries, sorted by `elo` descending (jest-enforced). After this work: exactly 6.
- `strengths[]` values must exactly match category names: `Overall Preference`, `Coding & Engineering`, `Hard Reasoning & Science`, `Honest Daily Use`.
- Mint accent for the badge: `#00E5A0`.
- Exact-match-only name mapping (no fuzzy matching) — same philosophy as `arena.py`.
- `.claude/state/` files are append-only (`>>` never `>`). This plan does not write them; Grok does at runtime.
- Do not run `npx jest` in background mode (orphaned workers); foreground only.
- Commit after every task. Do not push or deploy.

---

### Task 1: `bench_source` schema field + jest validation

**Files:**
- Modify: `data/types.ts:44-61` (OpenWeightModel interface)
- Test: `__tests__/open-weight.test.ts`

**Interfaces:**
- Consumes: existing `OpenWeightModel` interface.
- Produces: `OpenWeightModel.bench_source?: { type: 'first-party'; date: string }` — Tasks 2 (data) and 3 (UI) rely on this exact field name and shape.

- [ ] **Step 1: Write the failing test**

Append inside the `describe('Open Weight Models', ...)` block in `__tests__/open-weight.test.ts` (after the strengths test):

```ts
  test('bench_source, when present, is first-party with an ISO date', () => {
    for (const m of models) {
      if (m.bench_source) {
        expect(m.bench_source.type).toBe('first-party');
        expect(m.bench_source.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
  });
```

- [ ] **Step 2: Run typecheck to verify it fails**

Run: `npx tsc --noEmit`
Expected: FAIL — `Property 'bench_source' does not exist on type 'OpenWeightModel'` (referencing `__tests__/open-weight.test.ts`).

- [ ] **Step 3: Add the field to the interface**

In `data/types.ts`, inside `OpenWeightModel` after the `license` field:

```ts
  license: string;          // e.g. "Apache 2.0", "Meta Llama 3 License"
  bench_source?: {
    type: 'first-party';    // absent field = vendor/community-reported numbers
    date: string;           // YYYY-MM-DD the tokens_per_sec was measured
  };
```

- [ ] **Step 4: Verify typecheck and tests pass**

Run: `npx tsc --noEmit` — Expected: PASS (no output).
Run: `npx jest __tests__/open-weight.test.ts` — Expected: PASS (new test passes vacuously; no data has the field yet).

- [ ] **Step 5: Commit**

```bash
git add data/types.ts __tests__/open-weight.test.ts
git commit -m "feat: optional bench_source provenance field on OpenWeightModel"
```

---

### Task 2: Data merge — measured entries + Elo coverage

**Files:**
- Modify: `data/open_weight_models.json`
- Modify: `scripts/arena.py:116-126` (`_OPEN_WEIGHT_NAME_MAP`)
- Modify: `data/site.json` (`lastUpdated`)
- Test: existing `__tests__/open-weight.test.ts` (no new test file — data task, gated by the existing suite)

**Interfaces:**
- Consumes: `bench_source` field from Task 1.
- Produces: entries with ids `qwen8b`, `qwen14b`, `qwen30ba3b` and updated `mistral`; `_OPEN_WEIGHT_NAME_MAP` keys for all three new ids. Task 4's `_BENCH_NAME_MAP` maps bench-table names to these exact ids.

- [ ] **Step 1: Add the three new entries and update Mistral**

In `data/open_weight_models.json`: keep `gemma` and `qwen32b` untouched; replace the `mistral` object with the version below; add the three new objects. (Order gets fixed by the Elo-sort step; initial placement after `qwen32b` is fine.)

Updated `mistral` (three field changes — `tokens_per_sec`, `reference_hardware`, desc ending — plus new `bench_source`):

```json
  {
    "id": "mistral",
    "name": "Mistral Small 3.2 24B",
    "provider": "Mistral AI",
    "url": "https://huggingface.co/mistralai/Mistral-Small-3.2-24B-Instruct-2506",
    "tag": "Single-GPU Pick",
    "desc": "The strongest model that comfortably fits a single 24 GB GPU. Adds vision and tool-use over 3.1, tightly instruction-tuned, and Apache 2.0 with no usage restrictions — a dependable all-rounder for local daily use.",
    "color": "#F97316",
    "elo": 1303,
    "context_window": 128000,
    "strengths": ["Honest Daily Use"],
    "params_b": 24,
    "vram_gb": 14,
    "quantization": ["Q4_K_M", "Q5_K_M", "Q8_0"],
    "tokens_per_sec": 14.8,
    "reference_hardware": "GTX 1070 8GB + RTX 5060 8GB (llama.cpp RPC split, 1GbE)",
    "license": "Apache 2.0",
    "bench_source": { "type": "first-party", "date": "2026-07-15" }
  }
```

New entries (Elo values are curated fallbacks; Step 3 refreshes them from LMArena where listed):

```json
  {
    "id": "qwen30ba3b",
    "name": "Qwen3 30B-A3B",
    "provider": "Qwen Team",
    "url": "https://huggingface.co/Qwen/Qwen3-30B-A3B",
    "tag": "MoE Champion",
    "desc": "A 30B mixture-of-experts with only ~3B parameters active per token. We measured 44.7 tok/s on a two-GPU budget cluster — faster than the dense 8B while packing 4x the capacity. Apache 2.0.",
    "color": "#8B5CF6",
    "elo": 1325,
    "context_window": 128000,
    "strengths": ["Coding & Engineering"],
    "params_b": 30.5,
    "vram_gb": 14,
    "quantization": ["Q3_K_M"],
    "tokens_per_sec": 44.7,
    "reference_hardware": "GTX 1070 8GB + RTX 5060 8GB (llama.cpp RPC split, 1GbE)",
    "license": "Apache 2.0",
    "bench_source": { "type": "first-party", "date": "2026-07-15" }
  },
  {
    "id": "qwen14b",
    "name": "Qwen3 14B",
    "provider": "Qwen Team",
    "url": "https://huggingface.co/Qwen/Qwen3-14B",
    "tag": "Two-GPU Pick",
    "desc": "The model that makes pooling two budget GPUs worth it: ~10.5 GB of weights fit neither of our 8 GB cards alone, but the cluster ran it at a measured 19.3 tok/s — 12x faster than single-card CPU offload. Apache 2.0.",
    "color": "#7C3AED",
    "elo": 1300,
    "context_window": 128000,
    "strengths": ["Hard Reasoning & Science"],
    "params_b": 14,
    "vram_gb": 11,
    "quantization": ["Q5_K_M"],
    "tokens_per_sec": 19.3,
    "reference_hardware": "GTX 1070 8GB + RTX 5060 8GB (llama.cpp RPC split, 1GbE)",
    "license": "Apache 2.0",
    "bench_source": { "type": "first-party", "date": "2026-07-06" }
  },
  {
    "id": "qwen8b",
    "name": "Qwen3 8B",
    "provider": "Qwen Team",
    "url": "https://huggingface.co/Qwen/Qwen3-8B",
    "tag": "Starter Pick",
    "desc": "The lowest-friction way into real local AI: fits any 6 GB+ GPU at Q4_K_M and measured 43.5 tok/s on our budget two-GPU cluster. Hybrid thinking modes, Apache 2.0.",
    "color": "#A78BFA",
    "elo": 1275,
    "context_window": 128000,
    "strengths": ["Honest Daily Use"],
    "params_b": 8,
    "vram_gb": 5,
    "quantization": ["Q4_K_M"],
    "tokens_per_sec": 43.5,
    "reference_hardware": "GTX 1070 8GB + RTX 5060 8GB (llama.cpp RPC split, 1GbE)",
    "license": "Apache 2.0",
    "bench_source": { "type": "first-party", "date": "2026-07-05" }
  }
```

- [ ] **Step 2: Add LMArena aliases for the new models**

In `scripts/arena.py`, extend `_OPEN_WEIGHT_NAME_MAP` (keep existing entries):

```python
_OPEN_WEIGHT_NAME_MAP: dict[str, list[str]] = {
    "gemma": [
        "gemma-4-31b-it",
    ],
    "qwen32b": [
        "qwen3-32b",
    ],
    "mistral": [
        "mistral-small-3.2-24b-instruct-2506",
    ],
    "qwen8b": [
        "qwen3-8b",
    ],
    "qwen14b": [
        "qwen3-14b",
    ],
    "qwen30ba3b": [
        "qwen3-30b-a3b",
    ],
}
```

- [ ] **Step 3: Refresh Elos and sort**

Run: `/home/cmc/git/grok/helloai/.venv/bin/python3 scripts/update_leaderboard.py`
Expected: exact-name-map matches get live LMArena Elos; unmatched ids keep the curated fallbacks; both model files re-sorted Elo-descending (the script sorts — `update_leaderboard.py:55,151`).

If the network is unavailable or a slug isn't listed on LMArena, set curated values explicitly instead:

```bash
/home/cmc/git/grok/helloai/.venv/bin/python3 scripts/update_leaderboard.py --set-ow qwen8b=1275 qwen14b=1300 qwen30ba3b=1325
```

Then confirm file order is Elo-descending (jest enforces this in Step 5).

- [ ] **Step 4: Bump site freshness date**

In `data/site.json`, set `"lastUpdated": "2026-07-16"`. (The PostToolUse auto-bump hook only watches `models.json`/`articles.json`, so this is manual — but note `update_leaderboard.py` may already have bumped it; verify the value.)

- [ ] **Step 5: Run the data suite**

Run: `npx jest`
Expected: PASS — including `has between 3 and 6 models` (now exactly 6), `models are sorted by Elo descending`, and Task 1's `bench_source` format test (now exercised by 4 real entries).

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add data/open_weight_models.json data/site.json scripts/arena.py
git commit -m "data: first-party cluster benchmarks — add Qwen3 8B/14B/30B-A3B, update Mistral"
```

---

### Task 3: "Independently measured" badge on the card

**Files:**
- Modify: `app/components/OpenWeightCard.tsx:50-55`
- Modify: `app/globals.css` (after the `.ow-spec` rule, ~line 529)

**Interfaces:**
- Consumes: `model.bench_source` from Task 1; populated data from Task 2.
- Produces: visual badge only — nothing downstream consumes it.

- [ ] **Step 1: Render the badge in the specs row**

In `app/components/OpenWeightCard.tsx`, replace the `.ow-specs` block:

```tsx
      <div className="ow-specs">
        <span className="ow-spec">{model.vram_gb} GB VRAM</span>
        <span className="ow-spec">{model.tokens_per_sec} t/s</span>
        <span className="ow-spec">{model.license}</span>
        {model.bench_source && (
          <span
            className="ow-spec ow-spec-measured"
            title={`Measured on our test cluster, ${model.bench_source.date}`}
          >
            ⚡ Independently measured
          </span>
        )}
      </div>
```

- [ ] **Step 2: Style the badge**

In `app/globals.css`, immediately after the `.ow-spec` rule:

```css
.ow-spec-measured {
  color: #00E5A0;
  background: rgba(0, 229, 160, 0.06);
  border-color: rgba(0, 229, 160, 0.25);
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: PASS (TypeScript strict + lint clean; the post-edit ESLint hook also fires on the tsx edit — fix anything it reports before building).

- [ ] **Step 4: Visual spot-check**

Run: `npm run dev` (background), then fetch `http://localhost:3000` and confirm the four badged cards show `⚡ Independently measured` in the specs row and unbadged cards (Gemma 4 31B, Qwen3 32B) are unchanged. Kill the dev server after.

- [ ] **Step 5: Commit**

```bash
git add app/components/OpenWeightCard.tsx app/globals.css
git commit -m "feat: independently-measured provenance badge on open-weight cards"
```

---

### Task 4: Drift guard — `scripts/check_cluster_bench.py`

**Files:**
- Create: `scripts/check_cluster_bench.py`
- Test: `scripts/test_check_cluster_bench.py`

**Interfaces:**
- Consumes: `data/open_weight_models.json` (via `config.open_weight_models_path`), ids from Task 2, `bench_source.date` from Task 1.
- Produces: CLI contract used by Task 5's docs: exit 1 on drift, exit 0 clean / file-missing / `--ok`; log lines `[new bench candidate] ...` and `cluster bench source unavailable (remote run?) — last integrated: <date>`. Testable functions: `parse_bench_table(text) -> list[BenchRow]`, `compare(rows, models) -> tuple[list[DriftFinding], list[str]]`, `last_integrated_date(models) -> str`.

- [ ] **Step 1: Write the failing tests**

Create `scripts/test_check_cluster_bench.py` (repo convention: plain asserts + main runner, run with the venv python — see `test_check_provider_catalog.py`):

```python
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `/home/cmc/git/grok/helloai/.venv/bin/python3 scripts/test_check_cluster_bench.py`
Expected: FAIL — `ModuleNotFoundError: No module named 'check_cluster_bench'`.

- [ ] **Step 3: Implement the guard**

Create `scripts/check_cluster_bench.py`:

```python
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
    "Qwen3-8B": "qwen8b",
    "Qwen3-14B": "qwen14b",
    "Mistral Small 3.2 24B": "mistral",
    "Qwen3-30B-A3B (MoE)": "qwen30ba3b",
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `/home/cmc/git/grok/helloai/.venv/bin/python3 scripts/test_check_cluster_bench.py`
Expected: `PASS: 6 tests`

- [ ] **Step 5: Run the guard live, all three paths**

```bash
# Real file, post-Task-2 data — expect "No cluster bench drift detected." plus
# two [new bench candidate] lines (gpt-oss-20b, Qwen3-30B-A3B-Instruct-2507); exit 0
/home/cmc/git/grok/helloai/.venv/bin/python3 scripts/check_cluster_bench.py; echo "exit=$?"

# Missing file — expect "source unavailable ... last integrated: 2026-07-15"; exit 0
CLUSTER_BENCH_RESULTS=/nonexistent/results.md \
  /home/cmc/git/grok/helloai/.venv/bin/python3 scripts/check_cluster_bench.py; echo "exit=$?"
```

Both must print `exit=0`.

- [ ] **Step 6: Commit**

```bash
git add scripts/check_cluster_bench.py scripts/test_check_cluster_bench.py
git commit -m "feat: cluster bench drift guard (check_cluster_bench.py)"
```

---

### Task 5: Weekly pipeline wiring + final gate

**Files:**
- Modify: `.claude/skills/weekly-update/SKILL.md` (step 1a)
- Modify: `.claude/agents/leaderboard-updater.md` (body only — after the "Do not propose Elo changes" line in the open-weight review section)
- Modify: `CLAUDE.md` (scripts row is implicit; only the weekly workflow mention below)

**Interfaces:**
- Consumes: CLI contract of `check_cluster_bench.py` from Task 4 (exit codes, log-line formats).
- Produces: documentation only — the runtime consumer is Grok executing the leaderboard-updater role.

- [ ] **Step 1: Add the guard to weekly-update step 1a**

In `.claude/skills/weekly-update/SKILL.md`, after the existing 1a code block and its "Non-zero exit means..." sentence, append:

```markdown
Also run the local cluster-bench guard:

```bash
/home/cmc/git/grok/helloai/.venv/bin/python3 scripts/check_cluster_bench.py
```

Non-zero exit means the local gpu-cluster benchmarks (`/home/cmc/git/gpu-cluster/benchmarks/results.md`) diverge from `data/open_weight_models.json` — propose the JSON diffs through the normal change report + audit log before proceeding. `[new bench candidate]` lines feed the open-weight admission decision tree. When the source file is unavailable (remote runs), the guard logs the last integrated bench date and exits 0.
```

- [ ] **Step 2: Add the "Cluster bench sync" duty to the agent spec**

In `.claude/agents/leaderboard-updater.md`, insert after the line `**Do not propose Elo changes** for open-weight models — the Python script owns that (same as frontier).` and before `#### Open-weight admission decision tree`:

```markdown
#### Cluster bench sync (local runs only)

Run the deterministic guard:

```bash
/home/cmc/git/grok/helloai/.venv/bin/python3 scripts/check_cluster_bench.py
```

- **Exit 1** — first-party measurements in the local gpu-cluster `benchmarks/results.md` diverge from `open_weight_models.json`. Propose `tokens_per_sec` / `quantization` patches (kind: `open-weight-drift`, evidence_url: the results.md path) and bump the entry's `bench_source.date` to the bench table's date. Update `reference_hardware` only if the rig description changed.
- **`[new bench candidate]` lines** — a model was benchmarked on the cluster but isn't tracked. Run it through the open-weight admission decision tree below; first-party throughput on 2×8GB-class hardware counts toward the "Efficiency story" soft requirement. Skip candidates results.md flags as unconfirmed-provenance ggufs.
- **"source unavailable"** — remote run; note the last-integrated date in your report and move on.
- Record the bench table's latest date in `.claude/agent-memory/leaderboard-updater.md` each run so bench staleness is visible across sessions.
- Entries carrying a `bench_source` field hold first-party measured numbers — never replace them with vendor or community figures; only a newer first-party measurement via this guard updates them.
```

This is a body-only edit — the frontmatter (and therefore `integrity-hash-sha256`) must not change.

- [ ] **Step 3: Verify agent integrity hashes**

Run: `./verify-all-agents.sh`
Expected: all agents pass (the hash covers frontmatter only; Step 2 touched the body).

- [ ] **Step 4: Document the guard in CLAUDE.md**

In `CLAUDE.md`, in the **Data Update Workflow** section, add a paragraph directly after the line `Article prose continues to be generated by the \`article-writer\` agent (Opus). \`scripts/add_article.py\` inserts the finished JSON into \`data/articles.json\` deterministically.`:

```markdown
`scripts/check_cluster_bench.py` guards `data/open_weight_models.json` against drift from first-party benchmarks in `/home/cmc/git/gpu-cluster/benchmarks/results.md` (local runs only; exits 0 when the file is unreachable). Models with a `bench_source` field carry first-party measured numbers — vendor figures must not overwrite them.
```

- [ ] **Step 5: Full gate**

```bash
npx jest
npx tsc --noEmit
npm run build
./verify-all-agents.sh
```

Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add .claude/skills/weekly-update/SKILL.md .claude/agents/leaderboard-updater.md CLAUDE.md
git commit -m "feat: wire cluster bench guard into weekly update pipeline"
```
