"""
HelloAi Automation Configuration

Environment variables (set in .env or export):
  ANTHROPIC_API_KEY   — For article generation via Claude
  OLLAMA_MODEL       — Optional: use local Ollama (e.g., "gemma3:4b")
  OPENROUTER_API_KEY  — Optional: for multi-model Elo queries

All paths are relative to the project root.
"""

import os
from pathlib import Path
from dataclasses import dataclass, field
from dotenv import load_dotenv

load_dotenv()

PROJECT_ROOT = Path(__file__).parent.parent
DATA_DIR = PROJECT_ROOT / "data"


@dataclass
class Config:
    # Paths
    models_path: Path = DATA_DIR / "models.json"
    categories_path: Path = DATA_DIR / "categories.json"
    articles_path: Path = DATA_DIR / "articles.json"
    site_path: Path = DATA_DIR / "site.json"

    # API keys
    anthropic_api_key: str = field(
        default_factory=lambda: os.getenv("ANTHROPIC_API_KEY", "")
    )

    # Ollama (local model)
    ollama_model: str = field(
        default_factory=lambda: os.getenv("OLLAMA_MODEL", "")
    )
    ollama_url: str = "http://localhost:11434"

    # Article generation
    article_model: str = "claude-sonnet-4-20250514"
    max_articles: int = 10  # max articles to keep in articles.json

    def validate(self) -> list[str]:
        """Return list of issues, empty if all good."""
        issues = []
        if not self.models_path.exists():
            issues.append(f"Models file not found: {self.models_path}")
        if not self.articles_path.exists():
            issues.append(f"Articles file not found: {self.articles_path}")
        if not self.anthropic_api_key and not self.ollama_model:
            issues.append("ANTHROPIC_API_KEY or OLLAMA_MODEL must be set")
        return issues


config = Config()
