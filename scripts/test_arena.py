"""
test_arena.py — Offline, dependency-free tests for arena.py resolution logic.

Run with: python scripts/test_arena.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from arena import (
    _resolve_model_id,
    _ArenaEntry,
    _NAME_MAP,
    _OPEN_WEIGHT_NAME_MAP,
)


def main() -> None:
    failures: list[str] = []

    # Read the first (highest-priority) name-map candidate for "claude" straight
    # from arena.py so this test can't rot when _NAME_MAP is updated. Hardcoding
    # the name here previously left the test passing against itself even after
    # the real first candidate changed (4-7 → 4-8).
    CLAUDE_ARENA_NAME = _NAME_MAP["claude"][0]
    if not CLAUDE_ARENA_NAME:
        failures.append("FAIL: _NAME_MAP['claude'] has no candidates")

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

    # Test 3: open-weight map resolves independently of frontier map
    OW_QWEN_ARENA_NAME = _OPEN_WEIGHT_NAME_MAP["qwen32b"][0]
    ow_entries = {OW_QWEN_ARENA_NAME: _ArenaEntry(name=OW_QWEN_ARENA_NAME, score=1323.0)}
    ow_result = _resolve_model_id("qwen32b", ow_entries, _OPEN_WEIGHT_NAME_MAP)
    if ow_result is None or ow_result.name != OW_QWEN_ARENA_NAME:
        failures.append(
            "FAIL: open-weight _resolve_model_id('qwen32b', ...) did not match qwen3-32b"
        )

    # Frontier qwen should NOT match qwen3-32b (API flagship uses different aliases)
    frontier_result = _resolve_model_id("qwen", ow_entries)
    if frontier_result is not None:
        failures.append(
            "FAIL: frontier qwen must not resolve against open-weight arena names"
        )

    if failures:
        for f in failures:
            print(f)
        sys.exit(1)

    print("✅ arena resolution tests passed")
    sys.exit(0)


if __name__ == "__main__":
    main()
