#!/bin/bash
# CarePilot boot script — start.sh executes this (as user z) instead of the
# default bun flow whenever this file exists. Everything here must be
# offline-safe: the default flow died at `bun run db:push` because prisma
# tried to reach binaries.prisma.sh, which is unreachable from the sandbox.
set -e
cd /home/z/my-project

# Resolve bun defensively — sudo may reset PATH (secure_path)
BUN="$(command -v bun || true)"
if [ -z "$BUN" ]; then
  for c in /usr/local/bin/bun /opt/bun/bin/bun "$HOME/.bun/bin/bun" /root/.bun/bin/bun; do
    [ -x "$c" ] && BUN="$c" && break
  done
fi
if [ -z "$BUN" ]; then
  echo "[dev.sh] FATAL: bun not found" >&2
  exit 1
fi
echo "[dev.sh] using bun at $BUN"

echo "[dev.sh] CarePilot boot start at $(date -u +%FT%TZ)"

# 1) Dependencies — no-op when node_modules is complete (bun uses its cache).
if [ ! -d node_modules/next ] || [ ! -d node_modules/@prisma ]; then
  echo "[dev.sh] installing dependencies..."
  "$BUN" install
fi

# 2) Database — instant & offline (creates db/custom.db + schema when absent).
"$BUN" .zscripts/db-init.ts

# 3) Dev server — this script runs in the boot context, so the server it
#    starts persists for the life of the sandbox and serves the preview URL.
echo "[dev.sh] starting dev server on :3000..."
exec "$BUN" run dev
