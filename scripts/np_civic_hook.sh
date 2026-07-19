#!/usr/bin/env sh
# Optional terminal hook. Source it from shell config only after trust review.

NP_CIVIC_ROOT="${NP_CIVIC_ROOT:-$(pwd)}"
NP_CIVIC_CLI="$NP_CIVIC_ROOT/scripts/np_civic.mjs"

if [ ! -f "$NP_CIVIC_CLI" ]; then
  return 0 2>/dev/null || exit 0
fi

NP_CIVIC_CACHE="${XDG_CACHE_HOME:-$HOME/.cache}/np-civic-tools"
NP_CIVIC_STAMP="$NP_CIVIC_CACHE/update-check.stamp"
NP_CIVIC_TODAY="$(date +%Y-%m-%d)"

mkdir -p "$NP_CIVIC_CACHE" 2>/dev/null || true

if [ "$(cat "$NP_CIVIC_STAMP" 2>/dev/null)" != "$NP_CIVIC_TODAY" ]; then
  printf "%s" "$NP_CIVIC_TODAY" > "$NP_CIVIC_STAMP" 2>/dev/null || true
  node "$NP_CIVIC_CLI" update-check --quiet 2>/dev/null || true
fi
