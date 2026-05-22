"""
HelloAi Automation Configuration

All paths are relative to the project root.
"""

import os
from pathlib import Path
from dataclasses import dataclass
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

    # Article insertion
    max_articles: int = 10  # max articles to keep in articles.json

    def validate(self) -> list[str]:
        """Return list of issues, empty if all good."""
        issues = []
        if not self.models_path.exists():
            issues.append(f"Models file not found: {self.models_path}")
        if not self.articles_path.exists():
            issues.append(f"Articles file not found: {self.articles_path}")
        return issues


config = Config()
