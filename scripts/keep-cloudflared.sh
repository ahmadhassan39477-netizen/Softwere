#!/usr/bin/env bash
# DEMO ONLY — Cloudflare *quick* tunnels (*.trycloudflare.com).
# Hostnames expire / NXDOMAIN when the process or Cloudflare session ends.
# For a permanent business URL use a named tunnel + your domain:
#   deploy/cloudflare-tunnel/README.md
#   (project docs) production-hosting.md
# Writes current demo URL to public-url.txt on (re)start.
set -u
CF="${CF_BIN:-/tmp/cloudflared}"
[ -x "$CF" ] || CF=$(command -v cloudflared)
URL_FILE="/cursor/stores/bc-f68e2669-d869-4042-bdc8-561e018ac479/internal/public-url.txt"
LOG=/tmp/tunnel/cloudflared.log
mkdir -p /tmp/tunnel "$(dirname "$URL_FILE")"

extract_url() {
  grep -oE 'https://[a-zA-Z0-9-]+\.trycloudflare\.com' "$LOG" 2>/dev/null | tail -1 || true
}

while true; do
  echo "[$(date -Is)] starting cloudflared quick tunnel" | tee -a /tmp/tunnel/watchdog.log
  : > "$LOG"
  "$CF" tunnel --url http://127.0.0.1:3000 --no-autoupdate >"$LOG" 2>&1 &
  pid=$!

  for i in $(seq 1 90); do
    if ! kill -0 "$pid" 2>/dev/null; then break; fi
    PUBLIC=$(extract_url)
    if [ -n "$PUBLIC" ]; then
      echo "$PUBLIC" > "$URL_FILE"
      echo "$PUBLIC" > /tmp/tunnel/public-url.txt
      echo "[$(date -Is)] wrote public URL: $PUBLIC" | tee -a /tmp/tunnel/watchdog.log
      break
    fi
    sleep 1
  done

  while kill -0 "$pid" 2>/dev/null; do
    sleep 5
    u=$(extract_url)
    [ -n "$u" ] && echo "$u" > "$URL_FILE" && echo "$u" > /tmp/tunnel/public-url.txt
  done
  wait "$pid" 2>/dev/null || true
  echo "[$(date -Is)] cloudflared exited — restarting in 3s" | tee -a /tmp/tunnel/watchdog.log
  sleep 3
done
