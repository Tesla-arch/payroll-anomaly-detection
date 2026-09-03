#!/bin/sh
set -e

cd /var/www/html

if [ -n "$RENDER_EXTERNAL_URL" ]; then
  export APP_URL="${APP_URL:-$RENDER_EXTERNAL_URL}"
  export FRONTEND_URL="${FRONTEND_URL:-$RENDER_EXTERNAL_URL}"
fi

# Render injects DATABASE_URL for Postgres. Laravel reads DB_URL.
if [ -n "$DATABASE_URL" ]; then
  export DB_CONNECTION="${DB_CONNECTION:-pgsql}"
  export DB_URL="${DB_URL:-$DATABASE_URL}"
fi

if [ -n "$APP_KEY" ] && [ "${APP_KEY#base64:}" = "$APP_KEY" ]; then
  export APP_KEY="base64:${APP_KEY}"
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

# Never wipe on boot. Postgres keeps staff, students, parents and officers
# after the free web service sleeps. Seed only fills an empty database.
# Do not abort boot if seeding fails (e.g. stale image still calling fake()).
if [ "${RESET_DATABASE:-false}" = "true" ]; then
  php artisan migrate:fresh --force --seed || echo "WARNING: migrate:fresh --seed failed; continuing startup"
else
  php artisan migrate --force
  php artisan db:seed --force || echo "WARNING: db:seed failed; continuing startup"
fi

php artisan config:cache
php artisan route:cache
php artisan view:cache

exec php artisan serve --host=0.0.0.0 --port="${PORT:-10000}"
