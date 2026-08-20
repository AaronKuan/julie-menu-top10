#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
node scripts/setup-firebase.mjs "${1:-julie-menu-top10}" "${2:-Julie Menu Top10}"
