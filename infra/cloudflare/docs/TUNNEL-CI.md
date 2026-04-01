# CI tunnel and hostname (separate from local dev)

The Cloudflare security tests workflow needs the **worker** to reach the log bridge. The worker runs inside Miniflare and cannot use the runner’s localhost, so the bridge must be reachable at a **public URL**. That URL is provided by a **separate CI tunnel** and hostname (e.g. `https://ocentra-log-bridge-ci.ocentra.ca`).

Local dev keeps using the existing tunnel (`ocentra-log-bridge.ocentra.ca`). CI uses its own tunnel and hostname so both can run at the same time.

---

## One-time setup (Cloudflare + GitHub)

### 1. Create the CI tunnel (Cloudflare dashboard)

1. Open [Cloudflare Zero Trust](https://one.dash.cloudflare.com/) (or [Cloudflare Dashboard](https://dash.cloudflare.com) → Networks → Tunnels).
2. **Networks** → **Tunnels** → **Create a tunnel**.
3. Choose **Cloudflared**.
4. Name: e.g. `ocentra-log-bridge-ci`.
5. Finish the wizard. You will get an **install command** that includes a **token** (long base64 string). Copy the token; you will store it in GitHub.

### 2. Configure public hostname and service

In the same tunnel’s configuration:

- **Public hostname:** e.g. `ocentra-log-bridge-ci.ocentra.ca` (subdomain of your domain).
- **Service:** `http://localhost:8765` (or `http://127.0.0.1:8765`).

Save. Cloudflare will create the DNS record (or you add a CNAME: `ocentra-log-bridge-ci` → `<tunnel-id>.cfargotunnel.com`).

Your CI bridge URL is then: `https://ocentra-log-bridge-ci.ocentra.ca` (or whatever hostname you chose).

### 3. GitHub secret

1. Repo → **Settings** → **Secrets and variables** → **Actions**.
2. **New repository secret**:
   - Name: `CLOUDFLARE_TUNNEL_CI_TOKEN`
   - Value: the token from the tunnel’s install command.

### 4. Workflow and code

- The workflow installs `cloudflared`, starts the **bridge** on the runner, then runs `cloudflared tunnel run --token ${{ secrets.CLOUDFLARE_TUNNEL_CI_TOKEN }}` so the CI hostname routes to the runner’s `localhost:8765`.
- The workflow sets **`LOG_BRIDGE_URL`** to the CI hostname (e.g. `https://ocentra-log-bridge-ci.ocentra.ca`). All bridge traffic in CI (helper, reporter, worker) uses that URL.

No code changes are required beyond reading `LOG_BRIDGE_URL` where the bridge URL is used (see WORKFLOW-UPDATE-GUIDE and this repo’s bridge URL handling).

---

## Summary

| Item              | Local dev                         | CI                                      |
|-------------------|-----------------------------------|-----------------------------------------|
| Tunnel name       | `ocentra-log-bridge`              | `ocentra-log-bridge-ci`                 |
| Hostname          | `ocentra-log-bridge.ocentra.ca`   | `ocentra-log-bridge-ci.ocentra.ca`      |
| LOG_BRIDGE_URL    | unset (default tunnel URL used)   | set to CI hostname in workflow           |
| Token / secret    | local config / `~/.cloudflared`   | `CLOUDFLARE_TUNNEL_CI_TOKEN` in GitHub  |
