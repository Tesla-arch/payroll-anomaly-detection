#!/usr/bin/env bash
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p /tmp/sms-logs

port_open() {
  bash -c "echo >/dev/tcp/127.0.0.1/$1" >/dev/null 2>&1
}

echo "[start] waiting for Composer and npm install to finish..."
for _ in $(seq 1 180); do
  if [ -f "$ROOT/backend/vendor/autoload.php" ] && [ -d "$ROOT/frontend/node_modules/vite" ]; then
    break
  fi
  sleep 2
done

if [ ! -f "$ROOT/backend/vendor/autoload.php" ] || [ ! -d "$ROOT/frontend/node_modules/vite" ]; then
  echo "[start] dependencies missing; running setup"
  bash "$ROOT/.devcontainer/setup.sh"
fi

if [ ! -f "$ROOT/backend/.env" ]; then
  cp "$ROOT/backend/.env.example" "$ROOT/backend/.env"
  php "$ROOT/backend/artisan" key:generate --force
fi

if [ ! -f "$ROOT/frontend/.env" ]; then
  printf 'VITE_API_URL=/api\n' > "$ROOT/frontend/.env"
fi

if ! port_open 8000; then
  echo "[start] launching Laravel on :8000"
  (cd "$ROOT/backend" && php artisan serve --host=0.0.0.0 --port=8000) >>/tmp/sms-logs/laravel.log 2>&1 &
else
  echo "[start] Laravel already on :8000"
fi

if ! port_open 5173; then
  echo "[start] launching Vite on :5173"
  (cd "$ROOT/frontend" && npm run dev -- --host 0.0.0.0 --port 5173) >>/tmp/sms-logs/vite.log 2>&1 &
else
  echo "[start] Vite already on :5173"
fi

echo "[start] servers launched; keeping this process alive"
wait
# If this script was a second copy (no child processes), stay up anyway.
sleep infinity
