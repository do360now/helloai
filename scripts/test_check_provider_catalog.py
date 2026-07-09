"""
test_check_provider_catalog.py — Offline tests for catalog drift logic.

Run with: python scripts/test_check_provider_catalog.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from check_provider_catalog import _extract_versions, _version_key, check_provider


GROK_DOCS_SNIPPET = """
## Which model should I choose?
For everything else, including code, use Grok 4.5.
| grok-4.3 | 1M | $1.25 | $2.50 |
| grok-4.5 | 500k | $2.00 | $6.00 |
"""

GROK_NEWS_SNIPPET = """
# Introducing Grok 4.5
Grok 4.5 is SpaceXAI's smartest model built for coding.
"""


def test_version_key_ordering() -> None:
    assert _version_key("4.5") > _version_key("4.3")
    assert _version_key("5.6") > _version_key("5.5")
    assert _version_key("3.10") > _version_key("3.9")
    assert _version_key("4.5.") == _version_key("4.5")


def test_extract_grok_versions() -> None:
    versions = _extract_versions(
        GROK_DOCS_SNIPPET + GROK_NEWS_SNIPPET,
        ["Grok ([0-9.]+)"],
    )
    assert "4.5" in versions


def test_check_provider_flags_grok_drift(monkeypatch=None) -> None:
    """Simulate fetch by patching _fetch inside check_provider via entry URLs."""

    model = {
        "id": "grok",
        "name": "Grok 4.3",
    }
    entry = {
        "model_id": "grok",
        "provider": "xAI",
        "catalog_url": "https://docs.x.ai/docs/models",
        "news_url": "https://x.ai/news/grok-4-5",
        "tracked_name_pattern": "Grok ([0-9.]+)",
        "catalog_name_patterns": ["Grok ([0-9.]+)"],
        "recommendation_patterns": ["use Grok ([0-9.]+)", "Introducing Grok ([0-9.]+)"],
    }

    import check_provider_catalog as mod

    def fake_fetch(url: str) -> str:
        if "docs" in url:
            return GROK_DOCS_SNIPPET
        return GROK_NEWS_SNIPPET

    original = mod._fetch
    mod._fetch = fake_fetch
    try:
        findings = check_provider(model, entry)
    finally:
        mod._fetch = original

    assert len(findings) >= 1
    assert any(f.catalog_version == "4.5" for f in findings)
    assert findings[0].model_id == "grok"


def main() -> None:
    failures: list[str] = []
    tests = [
        test_version_key_ordering,
        test_extract_grok_versions,
        test_check_provider_flags_grok_drift,
    ]
    for test in tests:
        try:
            test()
        except AssertionError as exc:
            failures.append(f"FAIL: {test.__name__}: {exc}")

    if failures:
        for msg in failures:
            print(msg)
        raise SystemExit(1)
    print(f"PASS: {len(tests)} tests")


if __name__ == "__main__":
    main()