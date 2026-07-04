#!/usr/bin/env python3
"""
validate_brief.py — Validate an article brief against the typed handoff
contract between article-idea-generator and article-writer.

The brief schema is published in .claude/agents/article-idea-generator.md and
enforced (on the writer side) by .claude/agents/article-writer.md's "Input
contract". This script closes the gap between the two: run it on a brief
BEFORE handing it to the article-writer so a malformed Grok-produced brief is
caught deterministically rather than relying on Opus to refuse.

Usage:
  python scripts/validate_brief.py --file brief.json
  echo '{...}' | python scripts/validate_brief.py

Exit 0 = brief is valid. Exit 1 = one or more schema violations.
"""

import argparse
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
# Single source of truth: the category set, word-count contract, and injection
# patterns live in add_article.py (the insert-stage gate). Importing them here
# means the brief stage and the insert stage can never drift — a brief this
# script approves is never rejected later for a rule it didn't know about.
from add_article import (
    VALID_CATEGORIES,
    WORD_COUNT_MIN as TARGET_WORD_MIN,
    WORD_COUNT_MAX as TARGET_WORD_MAX,
    scan_injection,
)

REQUIRED_FIELDS = (
    "slug",
    "title",
    "category",
    "angle",
    "news_hook",
    "key_facts",
    "target_word_count",
    "voice_guidelines",
)

TITLE_MAX = 70
KEY_FACTS_MIN = 3
SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def validate_brief(brief: dict, allow_phrases: tuple[str, ...] = ()) -> list[str]:
    """Return a list of schema-violation strings; empty list = valid."""
    errors: list[str] = []

    for field in REQUIRED_FIELDS:
        if field not in brief:
            errors.append(f"Missing required field: '{field}'")
    if errors:
        return errors  # remaining checks need the fields present

    if not isinstance(brief["slug"], str) or not SLUG_RE.match(brief["slug"]):
        errors.append(f"'slug' must be lowercase-hyphenated (a-z0-9-), got: {brief['slug']!r}")

    if not isinstance(brief["title"], str):
        errors.append(f"'title' must be a string, got {type(brief['title']).__name__}")
    elif len(brief["title"]) > TITLE_MAX:
        errors.append(f"'title' must be ≤ {TITLE_MAX} chars, got len={len(brief['title'])}")

    if brief["category"] not in VALID_CATEGORIES:
        errors.append(
            f"'category' must be one of {sorted(VALID_CATEGORIES)}, "
            f"got: {brief['category']!r}"
        )

    if not isinstance(brief["angle"], str) or not brief["angle"].strip():
        errors.append("'angle' must be a non-empty one-sentence thesis")

    if not isinstance(brief["news_hook"], str) or not brief["news_hook"].strip():
        errors.append("'news_hook' must be a non-empty string")

    kf = brief["key_facts"]
    if not isinstance(kf, list) or len(kf) < KEY_FACTS_MIN:
        errors.append(f"'key_facts' must be a list of ≥ {KEY_FACTS_MIN} strings, got {len(kf) if isinstance(kf, list) else 'non-list'}")
    elif not all(isinstance(x, str) and x.strip() for x in kf):
        errors.append("every 'key_facts' entry must be a non-empty string")

    twc = brief["target_word_count"]
    if not isinstance(twc, (int, float)) or twc < TARGET_WORD_MIN or twc > TARGET_WORD_MAX:
        errors.append(
            f"'target_word_count' must be a number in [{TARGET_WORD_MIN}, {TARGET_WORD_MAX}], "
            f"got: {twc!r}"
        )

    vg = brief["voice_guidelines"]
    if not isinstance(vg, list) or len(vg) == 0 or not all(isinstance(x, str) and x.strip() for x in vg):
        errors.append("'voice_guidelines' must be a non-empty list of non-empty strings")

    # Prompt-injection posture: the exact pattern set add_article.py enforces
    # at insert time (imported — see top of file), applied at the brief stage
    # so an injection is caught BEFORE the article-writer consumes it.
    blobs = [str(brief.get("title", "")), str(brief.get("angle", "")), str(brief.get("news_hook", ""))]
    if isinstance(kf, list):
        blobs.extend(str(x) for x in kf)
    hard_hits, soft_hits = scan_injection(blobs, allow_phrases)
    if hard_hits:
        errors.append(
            f"prompt-injection patterns in brief: {hard_hits} — refusing per "
            f"untrusted-input policy (not overridable)"
        )
    if soft_hits:
        errors.append(
            f"editorial phrases matching injection patterns: {soft_hits} — review "
            f"the brief, then re-run with --allow-phrase '<pattern>' for each "
            f"phrase you accept"
        )

    return errors


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate an article brief against the idea-generator→writer handoff schema.")
    parser.add_argument("--file", type=Path, help="Path to brief JSON (default: read from stdin)")
    parser.add_argument(
        "--allow-phrase",
        action="append",
        default=[],
        metavar="PATTERN",
        help="Accept a reviewed SOFT injection pattern (e.g. 'system prompt') "
             "for this brief. Repeatable; exact pattern match.",
    )
    args = parser.parse_args()

    try:
        raw = args.file.read_text(encoding="utf-8") if args.file else sys.stdin.read()
        brief = json.loads(raw)
    except (OSError, json.JSONDecodeError) as e:
        print(f"ERROR: failed to read/parse brief JSON: {e}", file=sys.stderr)
        sys.exit(1)

    if not isinstance(brief, dict):
        print("ERROR: brief must be a JSON object", file=sys.stderr)
        sys.exit(1)

    errors = validate_brief(brief, allow_phrases=tuple(args.allow_phrase))
    if errors:
        for err in errors:
            print(f"VALIDATION ERROR: {err}", file=sys.stderr)
        sys.exit(1)

    print(f"✅ brief valid — slug={brief['slug']!r} category={brief['category']!r} target_words={brief['target_word_count']}")
    sys.exit(0)


if __name__ == "__main__":
    main()
