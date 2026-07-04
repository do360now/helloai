#!/bin/bash
# PostToolUse hook: Run linter on TypeScript/TSX files in app/ after Edit
# Usage: Called by Claude Code with JSON arguments

# Lint app/ TypeScript. A lint failure now blocks the post-edit hook (the
# previous `|| true` swallowed every failure, defeating the guardrail).
# Stderr must stay visible: ESLint reports lint violations on stdout but
# writes infrastructure failures (broken config, missing binary — exit code 2)
# to stderr, and a blocking hook with no diagnostic is undebuggable.
echo "Checking TypeScript files..."
npx eslint "app/**/*.ts" "app/**/*.tsx" --max-warnings=1
