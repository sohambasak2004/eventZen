#!/bin/sh
set -eu

DB_HOST="${DB_HOST:-mysql}"
DB_PORT="${DB_PORT:-3306}"

echo "Waiting for MySQL at ${DB_HOST}:${DB_PORT}..."
until nc -z "$DB_HOST" "$DB_PORT"; do
  sleep 2
done

echo "MySQL TCP port is open. Giving MySQL extra time to finish initialization..."
sleep 12

echo "Starting auth-service..."
exec java -jar app.jar
