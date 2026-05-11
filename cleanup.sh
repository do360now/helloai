#!/bin/bash
# cleanup.sh — Remove loose/duplicate files from the repo root
# Run from the repo root: bash cleanup.sh

echo "🧹 Cleaning up HelloAiV2 repo..."

# Files that are duplicated in /public or are empty/unnecessary
FILES_TO_REMOVE=(
  "hello-robot-transparent.png"   # duplicated in public/
  "hello-robot.png"               # duplicated in public/
  "image.png"                     # loose screenshot
  "image2.png"                    # loose screenshot
  "Build"                         # empty file
  "next"                          # empty file
  "helloai@0.1.0"                 # empty/artifact
  "tree.txt"                      # 1.3MB debug output
  "hero-robot.png"                # in app/ but unused now
)

REMOVED=0
for f in "${FILES_TO_REMOVE[@]}"; do
  if [ -e "$f" ]; then
    rm -v "$f"
    ((REMOVED++))
  fi
done

# Also clean from app/ if present
if [ -e "app/hero-robot.png" ]; then
  rm -v "app/hero-robot.png"
  ((REMOVED++))
fi

# Remove unused default Next.js public assets
NEXT_DEFAULTS=("public/file.svg" "public/globe.svg" "public/next.svg" "public/vercel.svg" "public/window.svg")
for f in "${NEXT_DEFAULTS[@]}"; do
  if [ -e "$f" ]; then
    rm -v "$f"
    ((REMOVED++))
  fi
done

echo ""
echo "✅ Removed $REMOVED files."
echo "💡 Don't forget to: git add -A && git commit -m 'chore: clean up repo root'"
