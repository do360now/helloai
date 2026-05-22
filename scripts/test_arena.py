"""
test_arena.py — Offline, dependency-free tests for arena.py resolution logic.

Run with: python scripts/test_arena.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from arena import _resolve_model_id, _ArenaEntry


def main() -> None:
    failures: list[str] = []

    # The first (highest-priority) name-map candidate for "claude"
    CLAUDE_ARENA_NAME = "claude-opus-4-7-thinking"

    # Test 1: exact name-map match — should return the entry
    exact_entries = {CLAUDE_ARENA_NAME: _ArenaEntry(name=CLAUDE_ARENA_NAME, score=1520.0)}
    result = _resolve_model_id("claude", exact_entries)
    if result is None:
        failures.append(
            f"FAIL: _resolve_model_id('claude', {{'{CLAUDE_ARENA_NAME}': ...}}) "
            f"returned None — expected an entry"
        )
    elif result.name != CLAUDE_ARENA_NAME:
        failures.append(
            f"FAIL: expected name='{CLAUDE_ARENA_NAME}', got '{result.name}'"
        )

    # Test 2: fuzzy match MUST NOT fire — "claude" substring in "claude-3-opus-20240229"
    # should return None because that name is not in the name map
    fuzzy_entries = {
        "claude-3-opus-20240229": _ArenaEntry(name="claude-3-opus-20240229", score=1350.0)
    }
    result2 = _resolve_model_id("claude", fuzzy_entries)
    if result2 is not None:
        failures.append(
            "FAIL: _resolve_model_id('claude', {'claude-3-opus-20240229': ...}) "
            f"returned '{result2.name}' — fuzzy match must be gone"
        )

    if failures:
        for f in failures:
            print(f)
        sys.exit(1)

    print("✅ arena resolution tests passed")
    sys.exit(0)


if __name__ == "__main__":
    main()
