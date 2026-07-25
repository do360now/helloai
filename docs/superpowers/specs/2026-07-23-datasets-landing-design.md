# Datasets Landing Page (`/datasets`) — Design

**Date:** 2026-07-23  
**Status:** Draft (implementation gated)  
**Upstream source:** gpu-cluster Phase 3 Task 16  
  - Spec: `~/git/gpu-cluster/docs/superpowers/specs/2026-07-22-tinystories-distillation-design.md` (§ Publishing & distribution)  
  - Plan: `~/git/gpu-cluster/docs/superpowers/plans/2026-07-22-tinystories-distillation-implementation.md` (Task 16)  
  - **Required input:** `~/git/gpu-cluster/docs/helloai-handoff.md` (does not exist until Task 16 Step 4 lands)

## Goal

Add a public **front door** on helloai.com for the cluster-produced TinyStories-class dataset and the ~33M student model published on Hugging Face.

- **HF hosts the bytes** (dataset shards, goldset split, model weights, cards).
- **helloai.com hosts the story** — how it was made, samples, rubric, headline eval numbers — with download links out to HF.
- Extends the existing brand: *independently measured / trained on our own cluster* (same hardware narrative as open-weight first-party benches).

### Win condition

A visitor who knows nothing about the gpu-cluster repo can:

1. Understand what the dataset and model are (and are not).
2. Read 3 sample stories and the quality bar (rubric).
3. See honest headline metrics (size + bpb + blind ranking).
4. Click through to HF to download.
5. Optionally support the project (no paywall on data).

### Non-goals (v1)

- Hosting dataset bytes or model weights on helloai infrastructure.
- Paywall, paid tier, or premium-only graded subset.
- Training or evaluation tooling in this repo.
- Using the **eval gold set** as the public story corpus (gold set is holdout; may appear only as a labeled HF split, not as “the dataset”).
- Building this page before the handoff doc exists (no placeholder numbers).

---

## Gate: do not implement until handoff is ready

| Gate | Check |
|------|--------|
| G0 | `~/git/gpu-cluster/docs/helloai-handoff.md` exists and is committed on gpu-cluster |
| G1 | Handoff passes the **Handoff acceptance checklist** below (all required sections present, no placeholders) |
| G2 | HF dataset URL and model URL both resolve (200) and cards render |
| G3 | Owner confirms support-link decision (Sponsors / Stripe / omit for v1) |

Until G0–G2: design only. G3 may be decided earlier; if undecided at implement time, ship **without** a support link (link is optional; paywall is forbidden).

---

## Upstream contract (gpu-cluster → helloai)

### What gpu-cluster Task 16 ships

| Artifact | Role for helloai |
|----------|------------------|
| HF dataset repo (e.g. `{user}/tinystories-cluster-250M`) | Download target; provenance columns live there |
| HF model repo (e.g. `{user}/tinystories-cluster-33M`) | Weights + tokenizer download |
| `docs/helloai-handoff.md` | **Sole content input** for this page — copy numbers/stories/narrative from here, not by re-reading shards or inventing stats |
| Dataset / model cards on HF | Canonical long-form; page may summarize and link |

### Explicit non-inputs

- `training/eval/goldset.jsonl` alone is **not** enough to build the page (eval-only holdout; incomplete product story).
- Live scrape of HF at build time is **not** required for v1 (static content from handoff is fine).
- Direct reads of gpu-cluster paths from the Next.js app or CI (remote deploys cannot see that repo).

### Handoff document schema

`docs/helloai-handoff.md` must be self-contained. Required sections (exact headings encouraged so a future session can grep them):

```markdown
# Helloai handoff — TinyStories cluster dataset + model

## Status
- handoff_version: 1
- produced_at: YYYY-MM-DD
- gpu_cluster_plan: 2026-07-22-tinystories-distillation (Task 16)
- ready_for_helloai: yes | no   # must be "yes" to start page work

## Hugging Face
- dataset_url: https://huggingface.co/datasets/<user>/<repo>
- model_url: https://huggingface.co/<user>/<repo>
- dataset_id: <user>/<repo>
- model_id: <user>/<repo>
- license: Apache-2.0   # or as published; state goldset origin separately if different

## Headline numbers
- approx_tokens: <int>          # from MANIFEST.json
- story_count: <int>
- model_params: <int or ~33M string>
- tokenizer: 8K BPE tokenizer-v1 (or exact name)
- teacher: gpt-oss-20b (note quantization / serving if relevant)
- hardware_one_liner: GTX 1070 8GB + RTX 5060 8GB, llama.cpp RPC over 1GbE
- curriculum_version: <string>

## Sample stories
### Sample 1
- id / provenance fields if available
- full story text

### Sample 2
...

### Sample 3
...

## Rubric (summary)
- dimensions used for grading vs blind judging
- short anchor description (can quote training/eval/rubric.md)
- note: gold set is eval-only, never trained on

## Evaluation tables
### Bits-per-byte (bpb)
| model | bpb | notes |
| ... filled from Task 15 — no TODOs ... |

### Blind ranking
| rank | model | scores / summary |
| ... filled from Task 15 — no TODOs ... |

## How it was made
Five short paragraphs max, suitable for web:
1. Motivation / what we set out to do
2. Data factory (teacher, curriculum, scale)
3. Cluster hardware story
4. Training (student size, modernization flags if notable)
5. Eval honesty (baselines, gold set role, limitations)

## Suggested page structure
(may restate; helloai owns final IA)

## Monetization note
- No paywall on data or weights.
- Optional support / pay-what-you-want link only (owner chooses target).

## Explicit scope note
This document is the only input the helloai repo work should need.
```

**Rejection criteria for handoff** (any one fails G1):

- Any `TODO`, `TBD`, `FIXME`, or `placeholder` in required sections  
- Missing or non-`https://huggingface.co…` dataset/model URLs  
- Fewer than 3 complete sample stories  
- Empty bpb or blind-ranking tables  
- `ready_for_helloai` not `yes`  
- Claims that contradict “no paywall”

---

## Page design (helloai.com)

### Route and IA

| Item | Decision |
|------|----------|
| Primary URL | `/datasets` |
| v1 content | Single dataset+model package (the cluster TinyStories run). Not a multi-dataset catalog yet — page copy can say “our first public dataset” so a catalog can grow later. |
| Nav | **v1 default:** no change to homepage hash-nav (`models`, `leaderboard`, …). Discoverability via footer link + sitemap + optional homepage teaser card. Adding a top-level nav item is a product call if traffic warrants. |
| Articles | Optional later: one launch article via normal weekly/article pipeline. Not required for page ship. |

### Suggested page sections (top → bottom)

1. **Hero** — Title + one-sentence pitch (“Children’s stories distilled on a two-GPU hobby cluster”) + primary CTAs: *Download dataset* / *Download model* (external HF).
2. **At a glance** — Token/story counts, param count, license, hardware one-liner (from handoff headline numbers).
3. **How it was made** — The five-paragraph narrative from handoff (edit lightly for web voice; do not invent facts).
4. **Sample stories** — Three stories in readable cards; label provenance if present.
5. **Quality bar** — Rubric summary; state gold set = eval-only holdout, not training data.
6. **Results** — bpb table + blind-ranking table; caption that full cards live on HF.
7. **Limitations** — English-only, single-teacher fingerprint, children’s domain only, not a general assistant — pull from handoff/cards.
8. **Downloads** — Repeat HF links; optional “reproduce from scratch” pointer if handoff names the gpu-cluster plan/repo.
9. **Support (optional)** — One muted line + link if owner provided Sponsors/Stripe; never gate downloads.

### Visual / design system

- Match site tokens: background `#080A12`, accent `#00E5A0`, secondary `#6366F1`.
- Prefer server components + static content (no client filter tree required).
- Reuse patterns from `SectionHeader`, article typography, open-weight “independently measured” tone — not a new brand.
- Tables: simple, readable on mobile (horizontal scroll ok if needed).

### SEO & discoverability

| Surface | Work |
|---------|------|
| `app/datasets/page.tsx` | `metadata` title/description unique to this page; canonical `/datasets` |
| Optional `app/datasets/opengraph-image.tsx` | Dynamic OG like articles (nice-to-have, not ship-blocker) |
| `app/sitemap.ts` | Add `/datasets` entry (weekly, priority ~0.7–0.8) |
| Footer and/or homepage | At least one internal link so the page is not orphaned |
| Structured data | Optional `Dataset` schema.org JSON-LD pointing at HF distribution URL |

### Data storage in this repo

**Recommended v1:** keep content in a small typed JSON (or TS module) under `data/`, filled **only** by copying from the handoff at implement time — e.g. `data/datasets.json` with one entry.

Rationale:

- Matches existing data-layer pattern (`models.json`, `articles.json`, …).
- Enables a later multi-dataset index without a redesign.
- Avoids committing multi-MB story dumps; samples only (3 stories).

Do **not** auto-sync from gpu-cluster paths in CI. Manual (or scripted one-shot) import from handoff is fine.

Illustrative shape (finalize at implement time):

```ts
// data/types.ts — additive
export interface PublicDataset {
  id: string;                    // e.g. "tinystories-cluster-250M"
  title: string;
  summary: string;
  license: string;
  dataset_url: string;
  model_url: string;
  headline: {
    approx_tokens: number;
    story_count: number;
    model_params: string;
    tokenizer: string;
    teacher: string;
    hardware_one_liner: string;
  };
  narrative: string[];           // paragraphs
  samples: { title?: string; text: string; provenance?: string }[];
  rubric_summary: string;
  eval: {
    bpb: { model: string; bpb: number | string; notes?: string }[];
    blind_ranking: { rank: number; model: string; summary: string }[];
  };
  limitations: string[];
  support_url?: string;          // omit if none
  handoff_ref: string;           // path or commit of source handoff for audit
  published_at: string;          // ISO date
}
```

### Monetization

| Rule | Detail |
|------|--------|
| **Forbidden** | Paywall, login wall, or paid-only download of dataset/model |
| **Allowed** | Optional support / pay-what-you-want link (GitHub Sponsors or Stripe Payment Link) |
| **Deferred** | Premium graded subset, paid writeups, weight exclusives — separate decision |

Owner decision before or during implement (G3): choose Sponsors, Stripe, or omit.

---

## Implementation outline (when unblocked)

Rough file touch list (not a full plan — produce a plan file only if the page grows multi-PR):

| Path | Action |
|------|--------|
| `data/datasets.json` (+ `types.ts`, `index.ts` export) | Create; populate from handoff |
| `app/datasets/page.tsx` | Create landing page + metadata |
| `app/datasets/opengraph-image.tsx` | Optional |
| `app/sitemap.ts` | Register `/datasets` |
| Footer / homepage teaser | One internal link |
| `__tests__/…` | Validate dataset JSON shape, required URLs, sample count ≥ 3 |
| `data/site.json` → `lastUpdated` | Bump on ship |

Gates: `npx jest`, `npx tsc --noEmit`, `npm run lint`, `npm run build`. Deploy via normal Makefile path when ready.

---

## Relationship to other helloai work

| Related | Relationship |
|---------|----------------|
| Open-weight first-party benches | Same cluster brand; different surface (`/datasets` vs “Run it yourself” cards) |
| Articles pipeline | Optional launch article; not a substitute for `/datasets` |
| Pay-loop / Lightning Pro | Unrelated — do not couple |
| Gold set in gpu-cluster `training/eval/` | Eval-only; may be an HF split; never presented as the training corpus |

---

## Out of scope

- Implementing `publish.py` or HF auth (gpu-cluster).
- Building the page on incomplete handoff or invented metrics.
- Multi-dataset marketplace, search, or API endpoint for stories.
- Interactive story playground / on-site model inference.
- Any change that requires secrets or HF tokens in this repo.

---

## Acceptance checklists

### A. Handoff readiness (gpu-cluster / pre-implement)

Use when Task 16 claims handoff is done. All must pass before page work starts.

- [ ] `docs/helloai-handoff.md` committed on gpu-cluster
- [ ] `ready_for_helloai: yes`
- [ ] `produced_at` date present
- [ ] `dataset_url` and `model_url` are live HTTPS HF links
- [ ] `dataset_id` / `model_id` match the URLs
- [ ] License stated
- [ ] Headline numbers present: tokens, stories, params, tokenizer, teacher, hardware one-liner
- [ ] Exactly or at least **3** full sample stories (complete text, not stubs)
- [ ] Rubric summary present + gold-set eval-only called out
- [ ] bpb table filled (no empty rows / TODOs)
- [ ] Blind-ranking table filled (no empty rows / TODOs)
- [ ] “How it was made” narrative present (~5 short paragraphs, hardware included)
- [ ] Monetization note: no paywall
- [ ] Explicit “this doc is the only input helloai needs”
- [ ] Spot-check: no `TODO` / `TBD` / `FIXME` / `placeholder` in required sections
- [ ] Spot-check: numbers match HF cards / MANIFEST at a glance (no obvious contradiction)

### B. Implementation complete (helloai)

- [ ] `data/datasets.json` (or equivalent) populated **only** from handoff; `handoff_ref` recorded
- [ ] `/datasets` renders all sections: hero, at-a-glance, narrative, samples, rubric, results, limitations, downloads
- [ ] Primary CTAs open the correct HF dataset and model URLs (`target="_blank"` + `rel="noopener noreferrer"`)
- [ ] No paywall; support link only if `support_url` set
- [ ] Gold set not mislabeled as training data
- [ ] Sitemap includes `/datasets`
- [ ] At least one internal link (footer and/or homepage) to `/datasets`
- [ ] Page-specific title + meta description
- [ ] Design tokens match site (dark bg, mint accent)
- [ ] Mobile-readable tables / samples
- [ ] Tests cover data shape + URL presence + ≥3 samples
- [ ] `npx jest` / `npx tsc --noEmit` / `npm run lint` / `npm run build` green
- [ ] `site.json` lastUpdated bumped
- [ ] No HF tokens or gpu-cluster absolute paths required at runtime

### C. Launch / post-deploy

- [ ] Production `https://helloai.com/datasets` returns 200
- [ ] HF outbound links work from production
- [ ] OG preview acceptable (default or custom)
- [ ] Optional: seo-auditor includes `/datasets` on next audit pass
- [ ] Optional: short launch article via normal pipeline (not a ship blocker)

---

## Open decisions (owner)

| # | Decision | Default if undecided at implement |
|---|----------|-----------------------------------|
| O1 | Support link: GitHub Sponsors vs Stripe vs omit | **Omit** support section |
| O2 | Homepage teaser card vs footer-only link | **Footer link** minimum; teaser optional |
| O3 | Custom OG image for `/datasets` | **Skip** if timeboxed; use default site OG |
| O4 | Launch article same week as page | **Optional**; page can ship alone |

---

## Revision history

| Date | Change |
|------|--------|
| 2026-07-23 | Initial draft — handoff contract + page design + acceptance checklists; implementation gated on gpu-cluster Task 16 |
