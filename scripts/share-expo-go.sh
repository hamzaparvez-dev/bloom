#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
echo "Starting Expo Go + tunnel (wait up to ~90s for ngrok)..."
exec npx expo start --tunnel --go
