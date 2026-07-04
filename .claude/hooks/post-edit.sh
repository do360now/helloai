#!/bin/bash
# PostToolUse hook: Run linter on TypeScript/TSX files in app/ after Edit
# Usage: Called by Claude Code with JSON arguments

# Lint app/ TypeScript. A lint failure now blocks the post-edit hook (the
# previous `|| true` swallowed every failure, defeating the guardrail).
# Stderr is suppressed to keep the hook quiet on clean runs.
echo "Checking TypeScript files..."
npx eslint "app/**/*.ts" "app/**/*.tsx" --max-warnings=1 2>/dev/null
