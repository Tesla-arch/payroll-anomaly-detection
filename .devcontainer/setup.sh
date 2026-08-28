#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

cd "$ROOT/backend"
composer install --no-interaction --prefer-dist
if [ ! -f .env ]; then
  cp .env.example .env
fi
php artisan key:generate --force
mkdir -p database
touch database/database.sqlite
php artisan migrate --force
php artisan db:seed --force

cd "$ROOT/frontend"
if [ ! -f .env ]; then
  printf 'VITE_API_URL=/api\n' > .env
fi
npm install
