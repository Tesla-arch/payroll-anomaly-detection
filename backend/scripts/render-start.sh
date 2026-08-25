#!/bin/sh
set -e

cd /var/www/html

if [ -n "$RENDER_EXTERNAL_URL" ]; then
  export APP_URL="${APP_URL:-$RENDER_EXTERNAL_URL}"
  export FRONTEND_URL="${FRONTEND_URL:-$RENDER_EXTERNAL_URL}"
fi

mkdir -p \
  database \
  storage/framework/cache/data \
  storage/framework/sessions \
  storage/framework/views \
  storage/logs \
  bootstrap/cache

touch database/database.sqlite
chmod -R ugo+rw storage bootstrap/cache database

if [ -z "$APP_KEY" ]; then
  php artisan key:generate --force
fi

# Free-plan disks are ephemeral. Reseed demo accounts after every cold start.
if [ "${SEED_ON_BOOT:-true}" = "true" ]; then
  php artisan migrate:fresh --force --seed
else
  php artisan migrate --force
fi

php artisan config:cache
php artisan route:cache
php artisan view:cache

exec php artisan serve --host=0.0.0.0 --port="${PORT:-10000}"
