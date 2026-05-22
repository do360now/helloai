#!/usr/bin/env python3
"""
weekly_update.py — Deterministic HelloAi maintenance pipeline.

This script covers the deterministic part of the weekly update:
leaderboard refresh → data integrity tests → optional git commit → optional deploy.

Article generation is handled separately by the Claude Code /weekly-update skill
(article-idea-generator → article-writer → add_article.py). This script does NOT
generate articles.

Usage:
  python scripts/weekly_update.py             # Update leaderboard + run tests
  python scripts/weekly_update.py --auto-commit  # + git commit & push
  python scripts/weekly_update.py --dry-run   # Preview everything
"""

import argparse
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from utils import setup_logger, today_iso

log = setup_logger("weekly")

SCRIPTS_DIR = Path(__file__).parent


def run_command(cmd: list[str], description: str, dry_run: bool = False) -> bool:
    """Run a command and return success status."""
    log.info(f"{'[DRY RUN] ' if dry_run else ''}Running: {description}")
    log.info(f"  $ {' '.join(cmd)}")

    if dry_run:
        return True

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            cwd=SCRIPTS_DIR.parent,  # project root
        )
        if result.stdout.strip():
            for line in result.stdout.strip().split("\n"):
                log.info(f"  {line}")
        if result.returncode != 0:
            log.error(f"  Command failed (exit {result.returncode})")
            if result.stderr.strip():
                for line in result.stderr.strip().split("\n"):
                    log.error(f"  {line}")
            return False
        return True
    except FileNotFoundError:
        log.error(f"  Command not found: {cmd[0]}")
        return False


def main() -> None:
    parser = argparse.ArgumentParser(description="HelloAi deterministic update pipeline")
    parser.add_argument("--dry-run", action="store_true", help="Preview only")
    parser.add_argument(
        "--auto-commit", action="store_true", help="Git commit and push"
    )
    parser.add_argument(
        "--deploy", action="store_true",
        help="Build, push Docker image, and update Azure App Service"
    )
    parser.add_argument(
        "--skip-tests", action="store_true", help="Skip running tests"
    )
    args = parser.parse_args()

    log.info("=" * 50)
    log.info(f"HelloAi Weekly Update — {today_iso()}")
    log.info("=" * 50)

    success = True

    # ── Step 1: Update leaderboard ──────────────────────
    log.info("\nStep 1: Updating leaderboard...")
    cmd = [sys.executable, str(SCRIPTS_DIR / "update_leaderboard.py")]
    if args.dry_run:
        cmd.append("--dry-run")
    if not run_command(cmd, "Leaderboard update", dry_run=False):
        log.warning("Leaderboard update had issues, continuing...")

    # ── Step 2: Run tests ───────────────────────────────
    if not args.skip_tests:
        log.info("\nStep 2: Running data integrity tests...")
        if not run_command(
            ["npx", "jest", "--passWithNoTests"],
            "Data tests",
            dry_run=args.dry_run,
        ):
            log.error("Tests failed! Aborting commit.")
            success = False
    else:
        log.info("\nStep 2: Skipping tests")

    # ── Step 3: Git commit & push ───────────────────────
    if args.auto_commit and success and not args.dry_run:
        log.info("\nStep 3: Committing and pushing...")
        date = today_iso()
        msg = f"data: weekly update {date}"

        commands = [
            (["git", "add", "data/"], "Stage data changes"),
            (["git", "commit", "-m", msg], "Commit"),
            (["git", "push"], "Push to remote"),
        ]
        for cmd, desc in commands:
            if not run_command(cmd, desc):
                log.error(f"Git operation failed at: {desc}")
                break
    elif args.auto_commit and args.dry_run:
        log.info("\nStep 3: [DRY RUN] Would commit and push")
    elif args.auto_commit and not success:
        log.warning("\nStep 3: Skipping commit due to earlier failures")
    else:
        log.info("\nStep 3: Skipping commit (use --auto-commit to enable)")

    # ── Step 4: Deploy to Azure ─────────────────────────
    if args.deploy and success:
        log.info("\nStep 4: Deploying to Azure...")
        deploy_cmd = [sys.executable, str(SCRIPTS_DIR / "deploy.py")]
        if args.dry_run:
            deploy_cmd.append("--dry-run")
        if not run_command(deploy_cmd, "Build, push, and deploy", dry_run=False):
            log.warning("Deployment had issues — check output above")
            success = False
    elif args.deploy and not success:
        log.warning("\nStep 4: Skipping deploy due to earlier failures")
    else:
        log.info("\nStep 4: Skipping deploy (use --deploy to enable)")

    # ── Summary ─────────────────────────────────────────
    log.info("\n" + "=" * 50)
    if success:
        log.info("Weekly update complete!")
    else:
        log.warning("Completed with warnings — check output above")
    log.info("=" * 50)


if __name__ == "__main__":
    main()
