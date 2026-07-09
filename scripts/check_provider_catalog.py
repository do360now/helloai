#!/usr/bin/env python3
"""
check_provider_catalog.py — Deterministic provider-catalog drift guard.

Fetches each tracked provider's official catalog/news pages and compares
against data/models.json. Catches version bumps that memory-based searches
miss (e.g. Grok 4.5 shipping while the agent watches for Grok 4.4).

Run at the start of every /weekly-update before judgment-heavy drift work:

  python scripts/check_provider_catalog.py          # report drift (exit 1)
  python scripts/check_provider_catalog.py --ok     # always exit 0 (log only)

Usage in pipeline: non-zero exit forces the executor to investigate and patch
before proceeding with Elo refresh and article generation.
"""

from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).parent))
from config import config
from utils import read_json, setup_logger

log = setup_logger("catalog-check")

_CATALOG_PATH = Path(__file__).parent / "provider_catalog.json"
_TIMEOUT = 20
_USER_AGENT = "HelloAi-Bot/1.0 (+https://helloai.com)"


@dataclass
class DriftFinding:
    model_id: str
    provider: str
    tracked_version: str
    catalog_version: str
    source_url: str
    kind: str  # "version-ahead" | "recommended-ahead"
    detail: str


def _normalize_version(version: str) -> str:
    """Strip trailing punctuation from captured version groups."""
    return version.strip().rstrip(".")


def _version_key(version: str) -> tuple[int, ...]:
    """Sortable tuple from dotted version strings (4.10 > 4.5)."""
    version = _normalize_version(version)
    parts: list[int] = []
    for piece in version.split("."):
        if not piece:
            continue
        digits = re.match(r"^(\d+)", piece)
        if digits:
            parts.append(int(digits.group(1)))
    return tuple(parts) if parts else (0,)


def _extract_versions(text: str, patterns: list[str]) -> list[str]:
    found: list[str] = []
    for pattern in patterns:
        for match in re.finditer(pattern, text, re.IGNORECASE):
            found.append(_normalize_version(match.group(1)))
    return found


def _tracked_version(model: dict, pattern: str) -> str | None:
    match = re.search(pattern, model["name"], re.IGNORECASE)
    return match.group(1) if match else None


def _fetch(url: str) -> str:
    resp = requests.get(
        url,
        timeout=_TIMEOUT,
        headers={"User-Agent": _USER_AGENT},
    )
    resp.raise_for_status()
    return resp.text


def check_provider(
    model: dict,
    entry: dict,
) -> list[DriftFinding]:
    findings: list[DriftFinding] = []
    tracked = _tracked_version(model, entry["tracked_name_pattern"])
    if tracked is None:
        log.warning(
            f"  [{entry['model_id']}] cannot parse version from '{model['name']}'"
        )
        return findings

    catalog_patterns = entry.get("catalog_name_patterns", [])
    recommendation_patterns = entry.get("recommendation_patterns", [])

    catalog_versions: list[str] = []
    for url in (entry["catalog_url"], entry.get("news_url")):
        if not url:
            continue
        try:
            body = _fetch(url)
        except requests.RequestException as exc:
            log.warning(f"  [{entry['model_id']}] fetch failed for {url}: {exc}")
            continue
        catalog_versions.extend(_extract_versions(body, catalog_patterns))
        if recommendation_patterns:
            catalog_versions.extend(_extract_versions(body, recommendation_patterns))

    if not catalog_versions:
        log.info(f"  [{entry['model_id']}] no catalog versions parsed — skip")
        return findings

    catalog_max = max(catalog_versions, key=_version_key)
    rec_versions = []
    for url in (entry["catalog_url"], entry.get("news_url")):
        if not url or not recommendation_patterns:
            continue
        try:
            body = _fetch(url)
        except requests.RequestException:
            continue
        rec_versions.extend(_extract_versions(body, recommendation_patterns))
    rec_max = max(rec_versions, key=_version_key) if rec_versions else None

    if _version_key(catalog_max) > _version_key(tracked):
        findings.append(
            DriftFinding(
                model_id=entry["model_id"],
                provider=entry["provider"],
                tracked_version=tracked,
                catalog_version=catalog_max,
                source_url=entry["catalog_url"],
                kind="version-ahead",
                detail=(
                    f"Catalog lists {entry['provider']} {catalog_max} but "
                    f"models.json tracks {model['name']} ({tracked})"
                ),
            )
        )

    if rec_max and _version_key(rec_max) > _version_key(tracked):
        # Avoid duplicate if same version already flagged
        if not any(f.catalog_version == rec_max for f in findings):
            findings.append(
                DriftFinding(
                    model_id=entry["model_id"],
                    provider=entry["provider"],
                    tracked_version=tracked,
                    catalog_version=rec_max,
                    source_url=entry["catalog_url"],
                    kind="recommended-ahead",
                    detail=(
                        f"Provider docs recommend {entry['provider']} {rec_max} "
                        f"but models.json tracks {model['name']} ({tracked})"
                    ),
                )
            )

    return findings


def run_check() -> list[DriftFinding]:
    models = read_json(config.models_path)
    catalog = read_json(_CATALOG_PATH)
    models_by_id = {m["id"]: m for m in models}

    all_findings: list[DriftFinding] = []
    log.info("Provider catalog drift check")
    for entry in catalog["providers"]:
        mid = entry["model_id"]
        model = models_by_id.get(mid)
        if model is None:
            log.warning(f"  [{mid}] not in models.json — skip")
            continue
        log.info(f"  Checking {entry['provider']} (tracked: {model['name']})...")
        all_findings.extend(check_provider(model, entry))

    return all_findings


def main() -> int:
    parser = argparse.ArgumentParser(description="Check provider catalog vs models.json")
    parser.add_argument(
        "--ok",
        action="store_true",
        help="Always exit 0 (log findings only; for dry runs)",
    )
    args = parser.parse_args()

    findings = run_check()

    if not findings:
        log.info("No catalog drift detected.")
        return 0

    log.warning(f"Found {len(findings)} catalog drift finding(s):")
    for f in findings:
        log.warning(f"  [{f.kind}] {f.model_id}: {f.detail}")
        log.warning(f"           source: {f.source_url}")

    if args.ok:
        return 0
    return 1


if __name__ == "__main__":
    raise SystemExit(main())