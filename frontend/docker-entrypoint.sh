#!/bin/sh
set -e

cd /app

if [ ! -f "package.json" ]; then
  echo "Error: package.json not found in /app"
  exit 1
fi

if [ ! -d "node_modules" ] || [ -z "$(ls -A node_modules 2>/dev/null)" ]; then
  echo "Installing dependencies..."
  npm install --include=optional
elif [ ! -d "node_modules/@rollup/rollup-linux-x64-gnu" ] && [ ! -d "node_modules/@rollup/rollup-linux-arm64-gnu" ] && [ ! -d "node_modules/@rollup/rollup-darwin-x64" ]; then
  echo "Rollup native module missing, cleaning and reinstalling dependencies..."
  rm -rf node_modules package-lock.json
  npm install --include=optional
fi

exec "$@"
