#!/usr/bin/env bash
set -u
cd /workspace
while true; do
  echo "[$(date -Is)] starting: npx next start -H :: -p 3000"
  npx next start -H :: -p 3000
  code=$?
  echo "[$(date -Is)] next exited code=$code — restarting in 2s"
  sleep 2
done
