# Cloudflare Tunnel Guide – Test Log Bridge

Step-by-step guide to set up a Cloudflare Tunnel so the worker (or any isolate) can POST logs to a public HTTPS URL. Traffic is forwarded to a local Node log bridge on your machine.

**What you get:** A URL like `https://ocentra-log-bridge.<your-domain>` that reaches `http://localhost:8765` (or your chosen port) on your PC. The logger POSTs to that URL; the local bridge receives logs and writes NDJSON.

---

## Why is this needed?

Cloudflare Workers run in **isolated environments** (Miniflare threads mode). When a Worker calls `fetch('http://localhost:8765')`, that `localhost` refers to the Worker's isolated environment — **NOT your machine**.

```text
Worker's localhost ≠ Your machine's localhost
```

The tunnel solves this by providing a public HTTPS URL that routes through Cloudflare's edge network back to your local machine.

---

## Quick Start (VS Code)

If `cloudflared` is already installed and configured, just open the project:

1. **Open folder** in VS Code → task auto-starts (runs in background)
2. Or manually: **Terminal → Run Task → "Start tunnel and log bridge"**
3. Verify: `curl http://127.0.0.1:8765/__health__`

**Without cloudflared:** The task still runs the bridge locally at `http://127.0.0.1:8765` for local-only testing. Workers won't be able to reach it, but you can test the bridge with curl.

---

## Prerequisites

- **Required:** Node.js, npm
- **For tunnel:** Cloudflare account with a domain you control (DNS managed by Cloudflare)
- **For tunnel:** `cloudflared` CLI installed (see Step 1)

---

## Step 1: Install cloudflared (Required for tunnel)

Install the Cloudflare Tunnel client (cloudflared):

- **Windows:** [Install cloudflared (Windows)](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/#windows)
- **macOS:** `brew install cloudflared`
- **Linux:** See [Installation](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/)

Check installation:

```bash
cloudflared --version
```

---

## Step 2: Create a tunnel

Create a named tunnel (e.g. for the log bridge):

```bash
cloudflared tunnel create ocentra-log-bridge
```

Output will include:

- **Tunnel ID** (e.g. `ac439038-f369-4b19-ae81-cddece0ebd10`)
- **Credentials file path** (e.g. `C:\Users\<You>\.cloudflared\<tunnel-id>.json`)

**Important:** Keep the credentials file secret. Do not edit the `.json` file.

---

## Step 3: Add a DNS CNAME record (Cloudflare)

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → select your domain (e.g. `ocentra.ca`).
2. Open **DNS** → **Records** → **Add record**.
3. Set:
   - **Type:** CNAME
   - **Name:** `ocentra-log-bridge` (or the subdomain you want)
   - **Target:** `<tunnel-id>.cfargotunnel.com`  
     Example: `ac439038-f369-4b19-ae81-cddece0ebd10.cfargotunnel.com`
   - **Proxy status:** Proxied (orange cloud)
   - **TTL:** Auto
4. Save.

Your log bridge URL will be: `https://ocentra-log-bridge.<your-domain>` (e.g. `https://ocentra-log-bridge.ocentra.ca`).

---

## Step 4: Create the tunnel config file

Create or edit the config file so cloudflared knows which hostname to route and where to send traffic.

**Config file location:**

- **Windows:** `C:\Users\<You>\.cloudflared\config.yml`
- **macOS / Linux:** `~/.cloudflared/config.yml`

**Example content** (replace `<tunnel-id>`, `<your-domain>`, and port if needed):

```yaml
tunnel: <tunnel-id>
credentials-file: C:\Users\<You>\.cloudflared\<tunnel-id>.json

ingress:
  - hostname: ocentra-log-bridge.<your-domain>
    service: http://127.0.0.1:8765
  - service: http_status:404
```

**Concrete example** (ocentra.ca, tunnel ID `ac439038-f369-4b19-ae81-cddece0ebd10`, port 8765):

```yaml
tunnel: ac439038-f369-4b19-ae81-cddece0ebd10
credentials-file: C:\Users\sujan\.cloudflared\ac439038-f369-4b19-ae81-cddece0ebd10.json

ingress:
  - hostname: ocentra-log-bridge.ocentra.ca
    service: http://127.0.0.1:8765
  - service: http_status:404
```

- `hostname` must match the CNAME you added (subdomain + domain).
- `service` is where traffic is sent locally; use the port your log bridge will listen on (e.g. `8765`).

---

## Step 5: Run the tunnel

In a terminal, run:

```bash
cloudflared tunnel run ocentra-log-bridge
```

Leave this running. While it is running, traffic to `https://ocentra-log-bridge.<your-domain>` is forwarded to `http://127.0.0.1:8765` (or the port in your config).

---

## Step 6: Run the log bridge

A log bridge script lives in **packages/logging-domain/scripts/log-bridge.ts**. It:

- Listens on port **8765** (or `PORT` env).
- **POST /__logs__** – accepts body `[{ testName, runId, log }]` (same shape as infra), buffers in memory.
- **POST /__flush__** with body `{ runId }` or **GET /__flush__?runId=xxx** – flushes that run’s logs to NDJSON under `LOG_BRIDGE_OUTPUT` (default `packages/logging-domain/log-bridge-output`) as `runType/suiteType/fileName/testName.ndjson`.
- **GET /__health__** – health check.

**Auto-flush:** Vitest global teardown POSTs to the bridge `/__flush__` with the current `runId` when the run ends, so you don’t need to manually flush. The test run uses `LOG_BRIDGE_URL` (default `http://127.0.0.1:8765`) for that POST. If the bridge isn’t running, the POST is ignored and teardown continues.

**From repo root:**

```bash
cd packages/logging-domain && npm run bridge
```

**From Cursor/VS Code:** Run the **"Start log bridge"** task (Terminal → Run Task…). It runs in the background like the tunnel task.

**Env (optional):** `PORT` (default 8765), `LOG_BRIDGE_OUTPUT` (default `./log-bridge-output`), `LOG_BRIDGE_RUN_TYPE` (default `single-threads`).

Set the logger’s test log endpoint URL to `https://ocentra-log-bridge.<your-domain>` so the worker and tests POST to the tunnel; the tunnel forwards to this bridge.

---

## Summary checklist

- [ ] **Step 1:** Install cloudflared; `cloudflared --version` works.
- [ ] **Step 2:** Create tunnel: `cloudflared tunnel create ocentra-log-bridge`; note tunnel ID and credentials path.
- [ ] **Step 3:** In Cloudflare DNS, add CNAME: Name = subdomain (e.g. `ocentra-log-bridge`), Target = `<tunnel-id>.cfargotunnel.com`, Proxied.
- [ ] **Step 4:** Create `~/.cloudflared/config.yml` (or Windows path) with correct `tunnel`, `credentials-file`, `hostname`, and `service` (localhost port).
- [ ] **Step 5:** Run `cloudflared tunnel run ocentra-log-bridge` and keep it running.
- [ ] **Step 6:** Run the log bridge on that port; set logger endpoint to `https://ocentra-log-bridge.<your-domain>`.

---

## Optional: List or delete tunnels

**List tunnels:**

```bash
cloudflared tunnel list
```

**Delete a tunnel:**

```bash
cloudflared tunnel delete <tunnel-name>
```

After deleting a tunnel, remove or update any DNS CNAME that pointed to it, and update `config.yml` if you use a different tunnel.
