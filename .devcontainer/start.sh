#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [ -n "${CODESPACE_NAME:-}" ] && command -v gh >/dev/null 2>&1; then
  gh codespace ports visibility 5173:public -c "$CODESPACE_NAME" >/dev/null 2>&1 || true
  gh codespace ports visibility 8000:public -c "$CODESPACE_NAME" >/dev/null 2>&1 || true
fi

if ! curl -sf "http://127.0.0.1:8000/api/health" >/dev/null 2>&1; then
  (cd "$ROOT/backend" && php artisan serve --host=0.0.0.0 --port=8000) >/tmp/laravel-serve.log 2>&1 &
fi

if ! curl -sf "http://127.0.0.1:5173" >/dev/null 2>&1; then
  (cd "$ROOT/frontend" && npm run dev -- --host 0.0.0.0 --port 5173) >/tmp/vite-dev.log 2>&1 &
fi
