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

# Match the agent spec + add_article.py. Single source of truth for the
# category set across the pipeline.
VALID_CATEGORIES = {"Analysis", "Opinion", "Discovery", "Review"}

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

# article-writer contract: 4–5 paragraphs, 350–500 words. The brief's
# target_word_count should target that range.
TARGET_WORD_MIN = 350
TARGET_WORD_MAX = 500
TITLE_MAX = 70
KEY_FACTS_MIN = 3
SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def validate_brief(brief: dict) -> list[str]:
    """Return a list of schema-violation strings; empty list = valid."""
    errors: list[str] = []

    for field in REQUIRED_FIELDS:
        if field not in brief:
            errors.append(f"Missing required field: '{field}'")
    if errors:
        return errors  # remaining checks need the fields present

    if not isinstance(brief["slug"], str) or not SLUG_RE.match(brief["slug"]):
        errors.append(f"'slug' must be lowercase-hyphenated (a-z0-9-), got: {brief['slug']!r}")

    if not isinstance(brief["title"], str) or len(brief["title"]) > TITLE_MAX:
        errors.append(f"'title' must be a string ≤ {TITLE_MAX} chars, got len={len(brief.get('title', ''))}")

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

    # Prompt-injection posture (parity with add_article.py / article-writer).
    blobs = [str(brief.get("angle", "")), str(brief.get("news_hook", ""))]
    if isinstance(kf, list):
        blobs.extend(str(x) for x in kf)
    haystack = "\n".join(blobs).lower()
    for pat in ("ignore previous", "ignore the above", "disregard the", "</system", "<|im", "you are now", "new instructions:"):
        if pat in haystack:
            errors.append(f"possible prompt-injection pattern in brief: '{pat}' — refusing per untrusted-input policy")
            break

    return errors


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate an article brief against the idea-generator→writer handoff schema.")
    parser.add_argument("--file", type=Path, help="Path to brief JSON (default: read from stdin)")
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

    errors = validate_brief(brief)
    if errors:
        for err in errors:
            print(f"VALIDATION ERROR: {err}", file=sys.stderr)
        sys.exit(1)

    print(f"✅ brief valid — slug={brief['slug']!r} category={brief['category']!r} target_words={brief['target_word_count']}")
    sys.exit(0)


if __name__ == "__main__":
    main()
