FROM node:20-alpine AS frontend
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
ENV VITE_API_URL=/api
RUN npm run build

FROM composer:2 AS vendor
WORKDIR /app
# Bump when seeders/app code must not reuse a stale COPY layer on Render.
ARG CACHE_BUST=2026-09-03-classroll-nofaker
COPY backend/composer.json backend/composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist
COPY backend/ ./
RUN composer dump-autoload --optimize --no-dev --classmap-authoritative

FROM php:8.4-cli-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends \
        libsqlite3-0 \
        libsqlite3-dev \
        libpq-dev \
        libzip-dev \
        libpng-dev \
        libjpeg62-turbo-dev \
        libfreetype6-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) pdo_sqlite pdo_pgsql zip gd bcmath \
    && echo "memory_limit=256M" > /usr/local/etc/php/conf.d/memory.ini \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /var/www/html
COPY --from=vendor /app ./
COPY --from=frontend /frontend/dist /tmp/spa

RUN cp /tmp/spa/index.html /var/www/html/public/spa.html \
    && cp -R /tmp/spa/assets /var/www/html/public/assets \
    && cp /var/www/html/.env.example /var/www/html/.env \
    && find /tmp/spa -maxdepth 1 -type f ! -name 'index.html' -exec cp {} /var/www/html/public/ \; \
    && rm -rf /tmp/spa \
    && sed -i 's/\r$//' /var/www/html/scripts/render-start.sh \
    && chmod +x /var/www/html/scripts/render-start.sh \
    && mkdir -p storage/framework/cache/data storage/framework/sessions storage/framework/views storage/logs bootstrap/cache database \
    && chmod -R 777 storage bootstrap/cache database

ENV APP_ENV=production \
    APP_DEBUG=false \
    LOG_CHANNEL=stderr \
    LOG_LEVEL=error \
    DB_CONNECTION=sqlite \
    SESSION_DRIVER=file \
    CACHE_STORE=file \
    QUEUE_CONNECTION=sync \
    BROADCAST_CONNECTION=log \
    MAIL_MAILER=log \
    RESET_DATABASE=false

EXPOSE 10000
CMD ["sh", "/var/www/html/scripts/render-start.sh"]
