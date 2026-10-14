#!/usr/bin/env bash
set -u
CF="/tmp/cloudflared"
URL_FILE="/cursor/stores/bc-f68e2669-d869-4042-bdc8-561e018ac479/internal/public-url.txt"
LOG=/tmp/tunnel/cloudflared.log
mkdir -p /tmp/tunnel "$(dirname "$URL_FILE")"

extract_and_write_url() {
  local u
  u=$(grep -oE 'https://[a-zA-Z0-9-]+\.trycloudflare\.com' "$LOG" 2>/dev/null | tail -1 || true)
  if [ -n "$u" ]; then
    echo "$u" > "$URL_FILE"
    echo "$u" > /tmp/tunnel/public-url.txt
    echo "[$(date -Is)] wrote public URL: $u" | tee -a /tmp/tunnel/watchdog.log
  fi
}

while true; do
  echo "[$(date -Is)] starting cloudflared quick tunnel -> http://127.0.0.1:3000" | tee -a /tmp/tunnel/watchdog.log
  : > "$LOG"
  "$CF" tunnel --url http://127.0.0.1:3000 --no-autoupdate >"$LOG" 2>&1 &
  pid=$!
  # Poll for URL while process lives
  for i in $(seq 1 120); do
    if ! kill -0 "$pid" 2>/dev/null; then
      break
    fi
    extract_and_write_url
    if [ -s "$URL_FILE" ]; then
      # keep polling occasionally in case of reconnect messages; mainly wait on process
      sleep 5
      # wait until process exits
      while kill -0 "$pid" 2>/dev/null; do
        sleep 5
        extract_and_write_url
      done
      break
    fi
    sleep 1
  done
  wait "$pid" 2>/dev/null || true
  code=$?
  extract_and_write_url
  echo "[$(date -Is)] cloudflared exited code=$code — restarting in 3s" | tee -a /tmp/tunnel/watchdog.log
  sleep 3
done
