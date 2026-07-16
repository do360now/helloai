# Cluster Benchmark Integration — Design

**Date:** 2026-07-16
**Status:** Approved
**Source data:** `/home/cmc/git/gpu-cluster/benchmarks/results.md` ("Model comparison — cluster-only" table)

## Goal

Surface independently-measured llama.cpp benchmark numbers (GTX 1070 8GB + RTX 5060 8GB cluster, RPC split over 1GbE) in the "Run it yourself" section of helloai.com, visibly distinguished from vendor/community-reported numbers. Make the weekly Grok-run leaderboard update detect when the benchmark source file has new or changed rows.

## Decisions (made during brainstorming)

1. **Scope:** data merge + provenance badge (no new page section).
2. **File access:** local-only check. The scheduled remote weekly run cannot read the gpu-cluster repo; the guard degrades gracefully when the file is absent.
3. **Card roster:** add Qwen3-8B, Qwen3-14B, Qwen3-30B-A3B; update Mistral Small 3.2 24B in place. Exclude gpt-oss-20b and Qwen3-30B-A3B-Instruct-2507 (unconfirmed gguf provenance per results.md). Total: 6 cards (test ceiling).
4. **Check mechanics:** deterministic Python drift guard + Grok judgment, mirroring `scripts/check_provider_catalog.py`. No LLM parsing of the markdown table; no auto-write of JSON.

## 1. Data changes — `data/open_weight_models.json`

### Update in place

- **Mistral Small 3.2 24B** (`mistral`):
  - `tokens_per_sec`: 65 → **14.8** (measured tg128: 14.76 ± 0.25)
  - `reference_hardware`: → `"GTX 1070 8GB + RTX 5060 8GB (llama.cpp RPC split, 1GbE)"`
  - `bench_source`: `{ "type": "first-party", "date": "2026-07-15" }`
  - Tag "Single-GPU Pick" and desc remain (still fits one 24 GB GPU); adjust desc only if it cites the old throughput.

### New entries

All three use `reference_hardware` = `"GTX 1070 8GB + RTX 5060 8GB (llama.cpp RPC split, 1GbE)"`. `bench_source.date` is the date the number was measured per results.md: 8B → `2026-07-05`, 14B → `2026-07-06`, 30B-A3B → `2026-07-15`.

| field | Qwen3-8B | Qwen3-14B | Qwen3-30B-A3B |
|---|---|---|---|
| `id` | `qwen8b` | `qwen14b` | `qwen30ba3b` |
| `name` | Qwen3 8B | Qwen3 14B | Qwen3 30B-A3B |
| `provider` | Qwen Team | Qwen Team | Qwen Team |
| `url` | HF Qwen/Qwen3-8B | HF Qwen/Qwen3-14B | HF Qwen/Qwen3-30B-A3B |
| `params_b` | 8 | 14 | 30.5 |
| `vram_gb` | 5 | 11 | 14 |
| `quantization` | `["Q4_K_M"]` | `["Q5_K_M"]` | `["Q3_K_M"]` |
| `tokens_per_sec` | 43.5 | 19.3 | 44.7 |
| `license` | Apache 2.0 | Apache 2.0 | Apache 2.0 |

- IDs are lowercase alphanumeric (test regex `^[a-z0-9]+$`), unique, no collision with frontier ids.
- `elo`: fetch from LMArena at implementation time; if a variant is unlisted, set a curated value via `update_leaderboard.py --set-ow` and record the provenance in the commit message. Test bounds: 1000–2000.
- `context_window`: verify per model card at implementation time (Qwen3 native 32K, 128K variants exist — cite what the linked HF card states).
- `tag`, `desc`, `color`, `strengths`: authored at implementation time; strengths must match existing category names exactly. Descs should mention the measured-on-budget-hardware angle (e.g. 30B-A3B: MoE that out-generates the dense 8B).
- List re-sorted Elo-descending after insertion (test-enforced).

### Elo refresh coverage

`scripts/update_leaderboard.py` `_OPEN_WEIGHT_NAME_MAP` gains exact-match entries for the three new models so weekly Elo refresh covers them.

## 2. Schema + UI — provenance badge

### `data/types.ts`

```ts
export interface OpenWeightModel {
  // ...existing fields...
  bench_source?: {
    type: 'first-party';      // absent field = vendor/community-reported
    date: string;             // ISO YYYY-MM-DD — when the number was measured
  };
}
```

### `app/components/OpenWeightCard.tsx`

When `bench_source` is present, render a small mint-accent (`#00E5A0`) badge next to the `tokens_per_sec` spec: **"⚡ Independently measured"**, with `title={`Measured on our test cluster, ${date}`}` tooltip. Cards without the field render unchanged (Gemma 4 31B, Qwen3 32B keep their RTX 4090 numbers, no badge).

No section-level copy changes required; subtitle tweak optional and out of scope.

## 3. Drift guard — `scripts/check_cluster_bench.py`

Mirrors `check_provider_catalog.py` conventions (stdlib-only if possible, venv python, clear report, exit codes).

- **Source path:** `/home/cmc/git/gpu-cluster/benchmarks/results.md`, overridable via `CLUSTER_BENCH_RESULTS` env var.
- **Parsing:** extract the "Model comparison — cluster-only" section's markdown table (columns: Model, Quant, Size, Params, pp512, tg128, Fit). Deterministic string parsing; tg128 values like `44.70 ± 0.53` reduce to the mean.
- **Mapping:** module-level `_BENCH_NAME_MAP` — exact bench-table-name → open-weight `id` (same exact-match philosophy as the Elo scraper). Initial map covers the four measured models on the roster.
- **Comparison per mapped row:** `tokens_per_sec` (tolerance ±0.5 to absorb rounding), quant membership in `quantization`, size-vs-`vram_gb` sanity (warn only).
- **Output / exit codes:**
  - Drift found → print per-field report → **exit 1** (weekly step must resolve before proceeding).
  - Unmapped table rows → print as **"new bench candidates"** (informational, exit 0 unless drift also present) — new benchmark rows automatically surface to Grok as admission candidates.
  - Clean → **exit 0**.
  - File missing/unreadable → print `cluster bench source unavailable (remote run?) — last integrated: <max bench_source.date in JSON>` → **exit 0**.

## 4. Weekly pipeline wiring

- **`.claude/skills/weekly-update/SKILL.md` step 1a** adds the second guard command:
  ```bash
  /home/cmc/git/grok/helloai/.venv/bin/python3 scripts/check_cluster_bench.py
  ```
  with a sentence: non-zero exit means the local cluster benchmarks diverge from `open_weight_models.json`; Grok proposes the JSON diffs (change report + append to `.claude/state/leaderboard-changes.jsonl`); "new bench candidates" feed the open-weight admission decision tree.
- **`.claude/agents/leaderboard-updater.md`** gains a short "Cluster bench sync" duty in the body (run the guard, act on drift/candidates, record last-seen bench date in agent memory). Body-only change; if any frontmatter changes, recompute `integrity-hash-sha256` and run `./verify-all-agents.sh`.

## 5. Validation & testing

- Existing `__tests__/open-weight.test.ts` already enforces count (≤6), field shapes, unique ids, Elo sort, strengths-match — new entries must pass unmodified.
- Add to that suite: when `bench_source` is present, `type === 'first-party'` and `date` matches `^\d{4}-\d{2}-\d{2}$`.
- Python parser: fixture test (`scripts/tests/` or inline `--self-test`) against a snapshot of the real table, exercising drift, clean, unmapped-row, and missing-file paths. Match however existing script tests are organized; if none exist, a pytest-style file runnable via the venv is fine and wired into no CI (manual).
- Full gate: `npx jest`, `npx tsc --noEmit`, `npm run build`, `./verify-all-agents.sh`.
- `data/site.json → lastUpdated` bumped manually (auto-bump hook only watches `models.json`/`articles.json`).

## Out of scope

- Rendering the Task 7 A–F clustering matrix or "when clustering wins" prose on the site.
- Schema support for multiple hardware datapoints per model (explicitly decided against, 2026-07-15, recorded in results.md).
- A launch article ("we benchmarked these on a $400 GPU cluster") — pairs naturally, but separate piece of work via the normal article pipeline.
- Any remote-run access to the gpu-cluster repo.
