#!/bin/bash
# PostToolUse hook: Run linter on TypeScript/TSX files in app/ after Edit
# Usage: Called by Claude Code with JSON arguments

# Just run eslint on the app directory - simple and effective
echo "Checking TypeScript files..."
npx eslint "app/**/*.ts" "app/**/*.tsx" --max-warnings=1 2>/dev/null || true
