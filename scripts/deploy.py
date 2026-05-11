#!/usr/bin/env python3
"""
deploy.py — Build, push, and deploy HelloAi to Azure App Service.

Closes the automation loop:
  1. Bumps the version tag (patch, minor, or explicit)
  2. Builds the Next.js app
  3. Builds and pushes the Docker image to Docker Hub
  4. Updates the Azure App Service container image tag
  5. Restarts the app and verifies health

Prerequisites:
  - docker CLI logged in to Docker Hub (`docker login`)
  - az CLI logged in (`az login`)
  - npm installed (for `npm run build`)

Usage:
  python scripts/deploy.py                          # Auto-bump patch version
  python scripts/deploy.py --bump minor             # Bump minor version
  python scripts/deploy.py --version 3.0.0          # Explicit version
  python scripts/deploy.py --skip-build             # Rebuild image only, skip npm
  python scripts/deploy.py --dry-run                # Preview all commands
  python scripts/deploy.py --skip-azure             # Build + push, skip Azure update

Environment variables (or set in .env):
  AZURE_WEBAPP_NAME          — App Service name (e.g. "helloai-web")
  AZURE_RESOURCE_GROUP       — Resource group name
  DOCKER_REGISTRY            — Docker Hub username/org (default: "do360now")
  DOCKER_IMAGE_NAME          — Image name (default: "helloai-web")
"""

import argparse
import os
import re
import subprocess
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from utils import setup_logger, read_json, write_json, today_iso
from config import config

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

log = setup_logger("deploy")

# ─── CONFIGURATION ──────────────────────────────────────────────────────────

DOCKER_REGISTRY = os.getenv("DOCKER_REGISTRY", "do360now")
DOCKER_IMAGE = os.getenv("DOCKER_IMAGE_NAME", "helloai-web")
AZURE_WEBAPP = os.getenv("AZURE_WEBAPP_NAME", "")
AZURE_RG = os.getenv("AZURE_RESOURCE_GROUP", "")
SITE_URL = os.getenv("SITE_URL", "https://helloai.com")

PROJECT_ROOT = Path(__file__).parent.parent
MAKEFILE = PROJECT_ROOT / "Makefile"


# ─── VERSION MANAGEMENT ────────────────────────────────────────────────────

def get_current_version() -> str:
    """Read current version from Makefile."""
    if MAKEFILE.exists():
        content = MAKEFILE.read_text()
        match = re.search(r"^VERSION\s*=\s*(.+)$", content, re.MULTILINE)
        if match:
            return match.group(1).strip()

    # Fallback: read from package.json
    pkg = read_json(PROJECT_ROOT / "package.json")
    return pkg.get("version", "0.1.0")


def bump_version(current: str, bump_type: str) -> str:
    """Bump a semver version string."""
    parts = current.split(".")
    if len(parts) != 3:
        log.warning(f"Non-semver version '{current}', appending .1")
        return current + ".1"

    major, minor, patch = int(parts[0]), int(parts[1]), int(parts[2])

    if bump_type == "major":
        return f"{major + 1}.0.0"
    elif bump_type == "minor":
        return f"{major}.{minor + 1}.0"
    else:  # patch
        return f"{major}.{minor}.{patch + 1}"


def write_version(version: str) -> None:
    """Update version in Makefile."""
    if MAKEFILE.exists():
        content = MAKEFILE.read_text()
        updated = re.sub(
            r"^VERSION\s*=\s*.+$",
            f"VERSION={version}",
            content,
            flags=re.MULTILINE,
        )
        MAKEFILE.write_text(updated)
        log.info(f"  Updated Makefile VERSION={version}")


# ─── COMMAND RUNNER ─────────────────────────────────────────────────────────

def run(
    cmd: list[str],
    description: str,
    dry_run: bool = False,
    check: bool = True,
    cwd: Path | None = None,
) -> subprocess.CompletedProcess | None:
    """Run a shell command with logging."""
    log.info(f"{'[DRY RUN] ' if dry_run else ''}{description}")
    log.info(f"  $ {' '.join(cmd)}")

    if dry_run:
        return None

    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        cwd=cwd or PROJECT_ROOT,
    )

    if result.stdout.strip():
        for line in result.stdout.strip().split("\n")[:10]:
            log.info(f"  {line}")

    if result.returncode != 0 and check:
        log.error(f"  FAILED (exit {result.returncode})")
        if result.stderr.strip():
            for line in result.stderr.strip().split("\n")[:10]:
                log.error(f"  {line}")
        sys.exit(1)

    return result


# ─── DEPLOYMENT STEPS ───────────────────────────────────────────────────────

def build_app(dry_run: bool = False) -> None:
    """Step 1: Build the Next.js app."""
    run(["npm", "run", "build"], "Building Next.js app...", dry_run=dry_run)


def build_image(tag: str, dry_run: bool = False) -> str:
    """Step 2: Build Docker image. Returns full image:tag string."""
    full_tag = f"{DOCKER_REGISTRY}/{DOCKER_IMAGE}:{tag}"
    latest_tag = f"{DOCKER_REGISTRY}/{DOCKER_IMAGE}:latest"

    run(
        ["docker", "build", "-t", full_tag, "-t", latest_tag, "."],
        f"Building Docker image {full_tag}...",
        dry_run=dry_run,
    )
    return full_tag


def push_image(tag: str, dry_run: bool = False) -> None:
    """Step 3: Push Docker image to registry."""
    full_tag = f"{DOCKER_REGISTRY}/{DOCKER_IMAGE}:{tag}"
    latest_tag = f"{DOCKER_REGISTRY}/{DOCKER_IMAGE}:latest"

    run(
        ["docker", "push", full_tag],
        f"Pushing {full_tag}...",
        dry_run=dry_run,
    )
    run(
        ["docker", "push", latest_tag],
        f"Pushing {latest_tag}...",
        dry_run=dry_run,
    )


def update_azure(tag: str, dry_run: bool = False) -> None:
    """Step 4: Update Azure App Service to use the new image tag."""
    if not AZURE_WEBAPP or not AZURE_RG:
        log.warning(
            "AZURE_WEBAPP_NAME or AZURE_RESOURCE_GROUP not set. "
            "Skipping Azure deployment. Set these in .env or environment."
        )
        return

    full_tag = f"{DOCKER_REGISTRY}/{DOCKER_IMAGE}:{tag}"

    # Update the container image
    # Note: --docker-custom-image-name is deprecated but --container-image-name
    # doesn't work in all az CLI versions yet (see Azure/azure-cli#28862).
    # Use the flag that works with the installed version.
    run(
        [
            "az", "webapp", "config", "container", "set",
            "--name", AZURE_WEBAPP,
            "--resource-group", AZURE_RG,
            "--docker-custom-image-name", full_tag,
        ],
        f"Setting Azure container to {full_tag}...",
        dry_run=dry_run,
    )

    # Restart the app to pull the new image
    run(
        [
            "az", "webapp", "restart",
            "--name", AZURE_WEBAPP,
            "--resource-group", AZURE_RG,
        ],
        "Restarting Azure App Service...",
        dry_run=dry_run,
    )


def verify_health(dry_run: bool = False) -> None:
    """Step 5: Wait for the site to come up and verify it's healthy."""
    if dry_run:
        log.info("[DRY RUN] Would verify health at {SITE_URL}")
        return

    import requests

    log.info(f"Waiting for {SITE_URL} to come up...")
    for attempt in range(1, 7):
        time.sleep(10)
        try:
            resp = requests.get(SITE_URL, timeout=10)
            if resp.status_code == 200 and "Hello" in resp.text:
                log.info(f"  ✅ Site is healthy (attempt {attempt}, status {resp.status_code})")
                return
            else:
                log.info(f"  Attempt {attempt}: status {resp.status_code}")
        except requests.RequestException as e:
            log.info(f"  Attempt {attempt}: {e}")

    log.warning("  ⚠️  Site did not respond healthy within 60s. Check Azure logs:")
    log.warning(f"  az webapp log tail --name {AZURE_WEBAPP} --resource-group {AZURE_RG}")


# ─── CLI ────────────────────────────────────────────────────────────────────

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Deploy HelloAi to Azure")
    parser.add_argument(
        "--bump", choices=["patch", "minor", "major"], default="patch",
        help="Version bump type (default: patch)",
    )
    parser.add_argument(
        "--version", metavar="X.Y.Z",
        help="Explicit version (overrides --bump)",
    )
    parser.add_argument("--dry-run", action="store_true", help="Preview only")
    parser.add_argument("--skip-build", action="store_true", help="Skip npm build")
    parser.add_argument("--skip-azure", action="store_true", help="Skip Azure update")
    parser.add_argument("--skip-health", action="store_true", help="Skip health check")
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    log.info("=" * 50)
    log.info("HelloAi Deployment")
    log.info("=" * 50)

    # ── Version ─────────────────────────────────────────
    current = get_current_version()
    if args.version:
        new_version = args.version
    else:
        new_version = bump_version(current, args.bump)

    log.info(f"Version: {current} → {new_version}")

    if not args.dry_run:
        write_version(new_version)

    # ── Build ───────────────────────────────────────────
    if not args.skip_build:
        build_app(dry_run=args.dry_run)

    # ── Docker ──────────────────────────────────────────
    build_image(new_version, dry_run=args.dry_run)
    push_image(new_version, dry_run=args.dry_run)

    # ── Azure ───────────────────────────────────────────
    if not args.skip_azure:
        update_azure(new_version, dry_run=args.dry_run)

    # ── Health check ────────────────────────────────────
    if not args.skip_azure and not args.skip_health:
        verify_health(dry_run=args.dry_run)

    # ── Summary ─────────────────────────────────────────
    log.info("")
    log.info("=" * 50)
    log.info(f"✅ Deployed {DOCKER_REGISTRY}/{DOCKER_IMAGE}:{new_version}")
    if AZURE_WEBAPP:
        log.info(f"   Azure: {AZURE_WEBAPP} ({AZURE_RG})")
    log.info(f"   Site:  {SITE_URL}")
    log.info("=" * 50)


if __name__ == "__main__":
    main()
