#!/bin/sh
set -e

cd /app

if [ ! -f "package.json" ]; then
  echo "Error: package.json not found in /app"
  exit 1
fi

if [ ! -d "node_modules" ] || [ -z "$(ls -A node_modules 2>/dev/null)" ]; then
  echo "Installing dependencies..."
  npm install
fi

exec "$@"
