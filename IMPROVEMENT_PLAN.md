# helloai — Open Follow-ups (slimmed from the 2026-07-04 improvement plan)

> Slimmed 2026-07-17. Parts B–E of the original plan (18 code/docs tasks) are **done** — executed via subagent-driven development and merged to master (see `git log` around `a154dbb`, final gate: tsc/jest/lint/build/agents all green). What remains below are the owner actions and deferred items that were only tracked in this file.

## 1. DMARC ramp — **next action due ~2026-07-18**

State (verified via dig 2026-07-04): SPF ✅ hard-fail, DKIM ✅ (selector `dkim`, 2048-bit), DMARC ✅ Phase 1 monitor mode live:
`v=DMARC1; p=none; rua=mailto:dmarc@helloai.com; ruf=mailto:dmarc@helloai.com; fo=1; adkim=s; aspf=s`

- [ ] **Phase 2 (after ≥2 weeks of clean aggregate reports — i.e. from ~2026-07-18):** review the reports at `dmarc@helloai.com`; if all legitimate mail passes SPF or DKIM with alignment, update `_dmarc.helloai.com` TXT to:
  ```
  "v=DMARC1; p=quarantine; pct=25; rua=mailto:dmarc@helloai.com; ruf=mailto:dmarc@helloai.com; fo=1; adkim=s; aspf=s"
  ```
  Ramp `pct=25 → 50 → 100` over 2–3 weeks, watching reports at each step.
- [ ] **Phase 3 (after ≥2 more clean weeks at quarantine/100):**
  ```
  "v=DMARC1; p=reject; rua=mailto:dmarc@helloai.com; adkim=s; aspf=s"
  ```
- [ ] Same ramp applies to sister domain **do360now.com** (currently `p=none; adkim=r; aspf=r`, reports authorized cross-domain to dmarc@helloai.com).
- [ ] Raw XML reports are painful — consider a free-tier processor (e.g. postmarkapp.com/dmarc) as the `rua` target.

## 2. Credential rotation (from A1 — confirm or do)

`.env` (untracked) contained what appeared to be live secrets on 2026-07-04:

- [ ] Revoke + reissue the GitHub fine-grained PAT (`GH_TOKEN`)
- [ ] Rotate the Fireworks key (`FIREWORKS_API_KEY`)
- [ ] Keep both out of `.env` — only scripts need them, never the web process. (The Docker build-context leak was fixed in the plan's Task 1; rotation is still required if not already done.)

## 3. Owner decisions (from A4/A5)

- [ ] **Azure service principal for the cron deploy** — `make deploy` on cron (Sun 00:00) fails silently once the interactive `az login` token expires. Either `az ad sp create-for-rbac` + `az login --service-principal` in the cron path, or drop the cron entry and deploy manually.
- [ ] **TLS-RPT** (trivial, zero risk, anytime): `_smtp._tls.helloai.com. TXT "v=TLSRPTv1; rua=mailto:dmarc@helloai.com"`
- [ ] **MTA-STS** — deferred until DMARC reaches `p=reject` (needs `mta-sts.helloai.com` hosting + MX TLS confidence).

## 4. Deferred engineering backlog (carried over verbatim)

| Item | Why deferred |
|---|---|
| Homepage RSC refactor (`app/page.tsx` is one big `'use client'` tree; full articles JSON ships in the client bundle) | Invasive — deserves its own plan with visual regression checks |
| Pay-loop pre-mainnet hardening (funding concurrency race, unsigned proposals, ledger tail-truncation, sweep-range validation) | Gated behind `MAINNET_ENABLED=false`; see `docs/pay-loop.md:32-58` |
| Replace the frozen Arena Elo source | The >30d staleness guard makes it safe; picking a new source is an editorial decision — see `.claude/agent-memory/leaderboard-updater.md` |
| Pro-endpoint rate-limit isolation (paying agents share the public 100/min per-IP bucket) | Revisit with demand data from `scripts/pro_demand_report.py` |
| Article narrative drift (older articles describe a 4-model/19-point frontier) | Dated editorial content; a drift test would fight legitimate history |
| `/datasets` landing (TinyStories cluster dataset + model front door) | Gated on gpu-cluster Phase 3 Task 16 → `docs/helloai-handoff.md`. Design + acceptance checklists: `docs/superpowers/specs/2026-07-23-datasets-landing-design.md` |

---

*Archive copy of the original plan (Part A verbatim + DNS probe details + deferred table): `.superpowers/sdd/archive-improvement-plan/IMPROVEMENT_PLAN-2026-07-04-full.md`. The executed Parts B–E are documented by their commits on master and the SDD ledger `.superpowers/sdd/progress-improvement-plan-2026-07.md`.*
