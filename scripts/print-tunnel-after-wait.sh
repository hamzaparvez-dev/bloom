#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo "Waiting 35s for Metro + tunnel..."
sleep 35
cd "$ROOT"
exec npm run share:expo-go:url
