"""
Shared utilities for HelloAi automation scripts.
"""

import json
import logging
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

# ─── LOGGING ────────────────────────────────────────────────────────────────

def setup_logger(name: str, level: int = logging.INFO) -> logging.Logger:
    """Create a formatted logger."""
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(
            logging.Formatter(
                "%(asctime)s [%(name)s] %(levelname)s: %(message)s",
                datefmt="%Y-%m-%d %H:%M:%S",
            )
        )
        logger.addHandler(handler)
    logger.setLevel(level)
    return logger


# ─── JSON I/O ───────────────────────────────────────────────────────────────

def read_json(path: Path) -> Any:
    """Read and parse a JSON file."""
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def write_json(path: Path, data: Any, indent: int = 2) -> None:
    """Write data to a JSON file with consistent formatting."""
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=indent, ensure_ascii=False)
        f.write("\n")  # trailing newline for git


# ─── DATE HELPERS ───────────────────────────────────────────────────────────

def today_iso() -> str:
    """Return today's date as YYYY-MM-DD."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def format_date(iso_date: str) -> str:
    """Convert YYYY-MM-DD to 'Mar 5, 2026' style."""
    dt = datetime.strptime(iso_date, "%Y-%m-%d")
    return dt.strftime("%b %-d, %Y")


# ─── SLUG HELPER ────────────────────────────────────────────────────────────

def slugify(text: str) -> str:
    """Convert text to a URL-safe slug."""
    import re
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    text = re.sub(r"-+", "-", text)
    return text.strip("-")


# ─── DIFF REPORTER ──────────────────────────────────────────────────────────

def report_changes(old_data: Any, new_data: Any, context: str = "") -> list[str]:
    """Compare two data structures and return human-readable change descriptions."""
    changes = []

    if isinstance(old_data, list) and isinstance(new_data, list):
        # Compare lists of dicts by 'id' or 'slug' key
        key_field = None
        for k in ("id", "slug"):
            if old_data and isinstance(old_data[0], dict) and k in old_data[0]:
                key_field = k
                break

        if key_field:
            old_map = {item[key_field]: item for item in old_data}
            new_map = {item[key_field]: item for item in new_data}

            for k in new_map:
                if k not in old_map:
                    changes.append(f"  + Added: {k}")
                elif old_map[k] != new_map[k]:
                    # Find what changed
                    for field in new_map[k]:
                        if old_map[k].get(field) != new_map[k].get(field):
                            changes.append(
                                f"  ~ {k}.{field}: "
                                f"{old_map[k].get(field)} → {new_map[k].get(field)}"
                            )

            for k in old_map:
                if k not in new_map:
                    changes.append(f"  - Removed: {k}")

    if changes:
        changes.insert(0, f"Changes in {context}:")

    return changes
