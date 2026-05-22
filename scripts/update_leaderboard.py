#!/usr/bin/env python3
"""
update_leaderboard.py — Fetch latest Elo ratings and update models/categories.

Usage:
  python scripts/update_leaderboard.py                    # Auto-fetch from Arena
  python scripts/update_leaderboard.py --dry-run          # Preview without writing
  python scripts/update_leaderboard.py --set gemini=1510  # Manual Elo override
  python scripts/update_leaderboard.py --add-model        # Interactive: add new model
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from config import config
from utils import setup_logger, read_json, write_json, today_iso, report_changes
import arena

log = setup_logger("leaderboard")


# ─── UPDATE LOGIC ───────────────────────────────────────────────────────────

def update_models(
    models: list[dict],
    scores: dict[str, float],
    manual_overrides: dict[str, float],
) -> tuple[list[dict], bool]:
    """
    Update model Elo scores. Manual overrides take priority over fetched scores.
    Returns (updated_models, has_changes).
    """
    has_changes = False

    for model in models:
        mid = model["id"]
        old_elo = model["elo"]

        if mid in manual_overrides:
            new_elo = int(manual_overrides[mid])
        elif mid in scores:
            new_elo = int(scores[mid])
        else:
            log.info(f"  No score for '{mid}', keeping Elo={old_elo}")
            continue

        if new_elo != old_elo:
            log.info(f"  {mid}: {old_elo} → {new_elo}")
            model["elo"] = new_elo
            has_changes = True

    models.sort(key=lambda m: m["elo"], reverse=True)
    return models, has_changes


def update_category_leaders(
    categories: list[dict], models: list[dict]
) -> tuple[list[dict], bool]:
    """Update category leaders based on current model rankings."""
    has_changes = False
    if not models:
        return categories, has_changes

    leader_map = {
        "Overall": models[0]["name"],
        "Coding": next(
            (m["name"] for m in models if "claude" in m["id"].lower()),
            models[0]["name"],
        ),
        "Reasoning": next(
            (m["name"] for m in models if "gemini" in m["id"].lower()),
            models[0]["name"],
        ),
        "Honest": next(
            (m["name"] for m in models if "grok" in m["id"].lower()),
            models[0]["name"],
        ),
    }

    for cat in categories:
        for keyword, leader in leader_map.items():
            if keyword.lower() in cat["name"].lower():
                if cat["leader"] != leader:
                    log.info(f"  Category '{cat['name']}': {cat['leader']} → {leader}")
                    cat["leader"] = leader
                    has_changes = True
                break

    return categories, has_changes


def update_site_timestamp(dry_run: bool = False) -> None:
    """Update the lastUpdated field in site.json."""
    site = read_json(config.site_path)
    today = today_iso()
    if site.get("lastUpdated") != today:
        site["lastUpdated"] = today
        if not dry_run:
            write_json(config.site_path, site)
        log.info(f"  site.json lastUpdated → {today}")


# ─── ADD MODEL ──────────────────────────────────────────────────────────────

def add_model_interactive(models: list[dict]) -> list[dict]:
    """Interactively add a new model."""
    print("\n── Add New Model ──")
    model = {
        "id": input("  ID (lowercase, e.g. 'llama'): ").strip(),
        "name": input("  Display name (e.g. 'LLaMA 4 Scout'): ").strip(),
        "provider": input("  Provider (e.g. 'Meta'): ").strip(),
        "url": input("  Chat URL: ").strip(),
        "tag": input("  Tag (e.g. 'Open Source'): ").strip(),
        "desc": input("  Description (1 sentence): ").strip(),
        "color": input("  Hex color (e.g. '#0668E1'): ").strip(),
        "elo": int(input("  Elo rating: ").strip()),
    }

    existing_ids = {m["id"] for m in models}
    if model["id"] in existing_ids:
        log.error(f"Model ID '{model['id']}' already exists!")
        return models

    # Register arena names so future fetches can match this model
    arena_name = input("  Arena name (e.g. 'llama-4-scout', or blank): ").strip()
    if arena_name:
        arena.add_model_names(model["id"], [arena_name])

    models.append(model)
    models.sort(key=lambda m: m["elo"], reverse=True)
    log.info(f"  Added '{model['name']}' with Elo={model['elo']}")
    return models


# ─── CLI ────────────────────────────────────────────────────────────────────

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Update HelloAi leaderboard data"
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Preview changes without writing files",
    )
    parser.add_argument(
        "--set", nargs="+", metavar="ID=ELO",
        help="Manual Elo overrides (e.g. --set gemini=1510 claude=1508)",
    )
    parser.add_argument(
        "--add-model", action="store_true",
        help="Interactively add a new model",
    )
    parser.add_argument(
        "--skip-fetch", action="store_true",
        help="Skip fetching from LMArena",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    setup_logger("arena")

    log.info("=" * 50)
    log.info("HelloAi Leaderboard Updater")
    log.info("=" * 50)

    # Load current data
    models = read_json(config.models_path)
    categories = read_json(config.categories_path)
    old_models = [m.copy() for m in models]

    # Parse manual overrides
    manual_overrides: dict[str, float] = {}
    if args.set:
        for item in args.set:
            if "=" not in item:
                log.error(f"Invalid format: '{item}' (expected ID=ELO)")
                sys.exit(1)
            mid, elo = item.split("=", 1)
            manual_overrides[mid.strip()] = float(elo.strip())
        log.info(f"Manual overrides: {manual_overrides}")

    # Add model interactively
    if args.add_model:
        models = add_model_interactive(models)

    # Fetch scores — the arena module handles all scraping complexity
    scores: dict[str, float] = {}
    if not args.skip_fetch:
        model_ids = [m["id"] for m in models]
        scores = arena.fetch_scores(our_model_ids=model_ids)

    # Update models
    models, models_changed = update_models(models, scores, manual_overrides)

    # Update categories
    categories, cats_changed = update_category_leaders(categories, models)

    # Report
    changes = report_changes(old_models, models, "models.json")
    for line in changes:
        log.info(line)

    if not models_changed and not cats_changed and not args.add_model:
        log.info("No changes detected.")
        return

    # Write
    if args.dry_run:
        log.info("[DRY RUN] Would write changes to:")
        log.info(f"  - {config.models_path}")
        log.info(f"  - {config.categories_path}")
        log.info(f"  - {config.site_path}")
    else:
        write_json(config.models_path, models)
        log.info(f"✅ Wrote {config.models_path}")

        write_json(config.categories_path, categories)
        log.info(f"✅ Wrote {config.categories_path}")

        update_site_timestamp()
        log.info("✅ Done! Run `npx jest` to validate.")


if __name__ == "__main__":
    main()
