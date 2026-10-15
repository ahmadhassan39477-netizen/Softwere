# Named Cloudflare Tunnel (permanent)

`scripts/keep-cloudflared.sh` uses **quick tunnels** (`*.trycloudflare.com`). Those hostnames are disposable and will NXDOMAIN when the session ends.

For a business URL:

1. Own a domain on Cloudflare DNS.
2. Install `cloudflared` on the server that runs `next start`.
3. `cloudflared tunnel login` → `tunnel create` → `tunnel route dns`.
4. Copy `config.example.yml` to `~/.cloudflared/config.yml` and fill IDs.
5. Install as a system service so it survives reboot.

Customers then use `https://app.yourdomain.com` forever — not a random trycloudflare link.

See also: project store `docs/production-hosting.md`.
