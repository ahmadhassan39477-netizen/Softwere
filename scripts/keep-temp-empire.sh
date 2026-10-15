#!/usr/bin/env bash
set -u
cd /workspace
URL_FILE="/cursor/stores/bc-f68e2669-d869-4042-bdc8-561e018ac479/internal/public-url.txt"
while true; do
  if [ -f "$URL_FILE" ]; then
    PUB=$(tr -d '\n' < "$URL_FILE")
    if [ -n "$PUB" ]; then
      export AUTH_URL="$PUB"
      export AUTH_TRUST_HOST="true"
      unset NEXTAUTH_URL || true
      echo "[$(date -Is)] AUTH_URL=$AUTH_URL"
    fi
  fi
  echo "[$(date -Is)] starting next start -H :: -p 3000"
  npx next start -H :: -p 3000
  echo "[$(date -Is)] next exited; restarting in 2s"
  sleep 2
done
