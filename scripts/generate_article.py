#!/usr/bin/env python3
"""
generate_article.py — Generate a new article for HelloAi using Claude or Ollama.

Takes a topic/prompt and generates a full article with title, excerpt,
content paragraphs, category, and estimated read time. Appends to
data/articles.json.

Usage:
  python scripts/generate_article.py "Why open-source models are catching up"
  python scripts/generate_article.py "Gemini 3.1 Pro deep dive" --category Review
  python scripts/generate_article.py --interactive
  python scripts/generate_article.py "topic" --dry-run

Environment:
  ANTHROPIC_API_KEY - Use Claude for generation
  OLLAMA_MODEL      - Use local Ollama (e.g., "gemma3:4b")
"""

import argparse
import json
import math
import sys
from pathlib import Path

try:
    import anthropic
except ImportError:
    anthropic = None

try:
    import httpx
except ImportError:
    httpx = None

sys.path.insert(0, str(Path(__file__).parent))
from config import config
from utils import (
    setup_logger,
    read_json,
    write_json,
    today_iso,
    slugify,
)

log = setup_logger("article-gen")

SYSTEM_PROMPT = """You are a sharp, knowledgeable AI industry analyst writing for HelloAi 
(helloai.com), an unbiased guide to frontier AI models. Your writing style:

- Direct and opinionated, but fair. No corporate fluff.
- Back claims with specific data points when possible (benchmarks, Elo scores, adoption numbers).
- Acknowledge trade-offs and counterarguments.
- End with actionable takeaways.
- Tone: like a smart friend who works in AI explaining things over coffee.

You write for an audience of developers, AI enthusiasts, and tech-savvy professionals.

IMPORTANT: Respond ONLY with valid JSON, no markdown fences, no preamble. The JSON must match 
this exact schema:
{
  "title": "Article title (compelling, specific, max 80 chars)",
  "excerpt": "1-2 sentence hook for the article card (max 160 chars)",
  "category": "One of: Analysis, Opinion, Discovery, Review, Tutorial",
  "content": ["paragraph 1", "paragraph 2", "...at least 4 paragraphs, max 8"]
}"""


def generate_article_content(
    topic: str, category: str | None = None
) -> dict | None:
    """Call Claude or Ollama to generate article content from a topic."""
    user_prompt = f"Write an article about: {topic}"
    if category:
        user_prompt += f"\nCategory: {category}"

    log.info(f"Generating article for: '{topic}'...")

    # Try Ollama first if configured
    if config.ollama_model:
        return generate_with_ollama(user_prompt)

    # Fall back to Anthropic
    if not config.anthropic_api_key:
        log.error("ANTHROPIC_API_KEY not set and OLLAMA_MODEL not configured.")
        return None

    return generate_with_anthropic(user_prompt)


def generate_with_ollama(user_prompt: str) -> dict | None:
    """Generate article using local Ollama."""
    import httpx

    try:
        response = httpx.post(
            f"{config.ollama_url}/api/generate",
            json={
                "model": config.ollama_model,
                "prompt": f"{SYSTEM_PROMPT}\n\n{user_prompt}",
                "stream": False,
            },
            timeout=120.0,
        )
        response.raise_for_status()
        raw = response.json()["response"].strip()

        # Clean potential markdown fences
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1]
        if raw.endswith("```"):
            raw = raw.rsplit("```", 1)[0]
        raw = raw.strip()

        article = json.loads(raw)

        # Validate structure
        required = {"title", "excerpt", "category", "content"}
        if not required.issubset(article.keys()):
            log.error(f"Missing fields: {required - article.keys()}")
            return None

        if not isinstance(article["content"], list) or len(article["content"]) < 3:
            log.error("Content must be a list of at least 3 paragraphs")
            return None

        log.info(f"Generated (Ollama): '{article['title']}'")
        return article

    except httpx.HTTPError as e:
        log.error(f"Ollama HTTP error: {e}")
        return None
    except json.JSONDecodeError as e:
        log.error(f"Failed to parse Ollama response as JSON: {e}")
        return None
    except Exception as e:
        log.error(f"Ollama error: {e}")
        return None


def generate_with_anthropic(user_prompt: str) -> dict | None:
    """Generate article using Anthropic Claude."""
    if not anthropic:
        log.error("anthropic package not installed")
        return None

    client = anthropic.Anthropic(api_key=config.anthropic_api_key)

    try:
        response = client.messages.create(
            model=config.article_model,
            max_tokens=2000,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_prompt}],
        )

        raw = response.content[0].text.strip()

        # Clean potential markdown fences
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1]
        if raw.endswith("```"):
            raw = raw.rsplit("```", 1)[0]
        raw = raw.strip()

        article = json.loads(raw)

        # Validate structure
        required = {"title", "excerpt", "category", "content"}
        if not required.issubset(article.keys()):
            log.error(f"Missing fields: {required - article.keys()}")
            return None

        if not isinstance(article["content"], list) or len(article["content"]) < 3:
            log.error("Content must be a list of at least 3 paragraphs")
            return None

        log.info(f"Generated: '{article['title']}'")
        return article

    except json.JSONDecodeError as e:
        log.error(f"Failed to parse Claude response as JSON: {e}")
        log.debug(f"Raw response: {raw[:500]}")
        return None
    except anthropic.APIError as e:
        log.error(f"Anthropic API error: {e}")
        return None


def estimate_read_time(content: list[str]) -> str:
    """Estimate read time from paragraph list."""
    word_count = sum(len(p.split()) for p in content)
    minutes = max(1, math.ceil(word_count / 250))
    return f"{minutes} min"


def build_article_entry(generated: dict) -> dict:
    """Build a complete article entry for articles.json."""
    return {
        "slug": slugify(generated["title"]),
        "title": generated["title"],
        "excerpt": generated["excerpt"],
        "date": today_iso(),
        "category": generated.get("category", "Analysis"),
        "readTime": estimate_read_time(generated["content"]),
        "content": generated["content"],
    }


def add_article(article: dict, dry_run: bool = False) -> None:
    """Add article to articles.json (prepend, trim to max)."""
    articles = read_json(config.articles_path)

    # Check for duplicate slug
    existing_slugs = {a["slug"] for a in articles}
    if article["slug"] in existing_slugs:
        log.warning(f"Slug '{article['slug']}' already exists. Appending date suffix.")
        article["slug"] += f"-{today_iso()}"

    # Prepend (newest first)
    articles.insert(0, article)

    # Trim to max
    if len(articles) > config.max_articles:
        removed = articles[config.max_articles:]
        articles = articles[:config.max_articles]
        for r in removed:
            log.info(f"  Trimmed old article: '{r['title']}'")

    if dry_run:
        log.info("[DRY RUN] Would write article:")
        log.info(f"  Title: {article['title']}")
        log.info(f"  Slug: {article['slug']}")
        log.info(f"  Category: {article['category']}")
        log.info(f"  Read time: {article['readTime']}")
        log.info(f"  Paragraphs: {len(article['content'])}")
        print("\n--- PREVIEW ---")
        print(f"\n# {article['title']}\n")
        print(f"*{article['excerpt']}*\n")
        for p in article["content"]:
            print(f"{p}\n")
    else:
        write_json(config.articles_path, articles)
        log.info(f"✅ Article added: '{article['title']}'")

        # Update site timestamp
        site = read_json(config.site_path)
        site["lastUpdated"] = today_iso()
        write_json(config.site_path, site)
        log.info("✅ Updated site.json timestamp")


def interactive_mode() -> str:
    """Gather article topic interactively."""
    print("\n── Generate New Article ──")
    topic = input("  Topic/prompt: ").strip()
    if not topic:
        log.error("No topic provided.")
        sys.exit(1)
    return topic


# ─── CLI ────────────────────────────────────────────────────────────────────

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate a new HelloAi article using Claude"
    )
    parser.add_argument(
        "topic",
        nargs="?",
        help="Article topic or prompt",
    )
    parser.add_argument(
        "--category",
        choices=["Analysis", "Opinion", "Discovery", "Review", "Tutorial"],
        help="Article category (default: let Claude decide)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview article without writing to file",
    )
    parser.add_argument(
        "--interactive",
        action="store_true",
        help="Enter topic interactively",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    log.info("=" * 50)
    log.info("HelloAi Article Generator")
    log.info("=" * 50)

    # Validate
    issues = config.validate()
    api_issues = [i for i in issues if "API_KEY" in i]
    if api_issues:
        for issue in api_issues:
            log.error(issue)
        sys.exit(1)

    # Get topic
    topic = args.topic
    if args.interactive or not topic:
        topic = interactive_mode()

    # Generate
    generated = generate_article_content(topic, args.category)
    if not generated:
        log.error("Article generation failed.")
        sys.exit(1)

    # Build entry
    article = build_article_entry(generated)

    # Add to articles.json
    add_article(article, dry_run=args.dry_run)

    if not args.dry_run:
        log.info("Run `npx jest` to validate, then commit and deploy.")


if __name__ == "__main__":
    main()
