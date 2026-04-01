/**
 * DevPanelPage — local-only Cloudflare feature tester.
 *
 * Accessible at /dev-panel (registered in App.tsx).
 * Only useful when the wrangler worker is running on localhost:8787
 * (via `npm run dev:full` or `npm run dev:worker` separately).
 *
 * Sections:
 *  1. Worker Status    — health-check ping
 *  2. Shop / PRODUCT_KV — list products returned by /api/v1/shop/products
 *  3. AI Catalog KV    — list models from /api/v1/ai/catalog
 *  4. Asset R2 bucket  — list, upload (drag-drop), download, delete
 */

import { useState, useRef, useCallback } from 'react';
import { auth } from '@/adapters/firebase/config';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import './DevPanelPage.css';

const BASE = 'http://localhost:8787';

// ── tiny fetch helpers ──────────────────────────────────────────────────────

async function apiGet(path: string, token?: string | null) {
  const res = await fetch(`${BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const text = await res.text();
  try { return { ok: res.ok, status: res.status, data: JSON.parse(text) }; }
  catch { return { ok: res.ok, status: res.status, data: text }; }
}

async function getToken(): Promise<string | null> {
  try { return auth?.currentUser ? await auth.currentUser.getIdToken(true) : null; }
  catch { return null; }
}

// ── types ───────────────────────────────────────────────────────────────────

interface Result { label: string; ok: boolean; data: unknown }

// ── sections ─────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="dp-section">
      <h2 className="dp-section-title">{title}</h2>
      {children}
    </div>
  );
}

function ResultBox({ result }: { result: Result | null }) {
  if (!result) return null;
  return (
    <div className={`dp-result ${result.ok ? 'dp-result-ok' : 'dp-result-err'}`}>
      <span className="dp-result-label">{result.label}</span>
      <pre className="dp-result-pre">{JSON.stringify(result.data, null, 2)}</pre>
    </div>
  );
}

function RunBtn({ label, loading, onClick }: { label: string; loading: boolean; onClick: () => void }) {
  return (
    <button className="dp-btn" disabled={loading} onClick={onClick}>
      {loading ? <span className="dp-spin" /> : null}
      {label}
    </button>
  );
}

// ── 1. Worker Status ─────────────────────────────────────────────────────────

function WorkerStatus() {
  const [res, setRes] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);

  const ping = async () => {
    setLoading(true);
    try {
      const r = await apiGet(ApiEndpoint.Health);
      setRes({ label: `GET /api/v1/health  →  ${r.status}`, ok: r.ok, data: r.data });
    } catch (e) {
      setRes({ label: 'health check failed', ok: false, data: String(e) });
    } finally { setLoading(false); }
  };

  return (
    <Section title="1. Worker Status">
      <p className="dp-hint">
        Make sure <code>npm run dev:worker</code> (or <code>npm run dev:full</code>) is running first.
      </p>
      <RunBtn label="Ping worker health" loading={loading} onClick={ping} />
      <ResultBox result={res} />
    </Section>
  );
}

// ── 2. Shop Products ─────────────────────────────────────────────────────────

function ShopProducts() {
  const [res, setRes] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);

  const fetch_ = async () => {
    setLoading(true);
    try {
      const r = await apiGet(ApiEndpoint.Shop.Products);
      setRes({ label: `GET /api/v1/shop/products  →  ${r.status}`, ok: r.ok, data: r.data });
    } catch (e) {
      setRes({ label: 'shop fetch failed', ok: false, data: String(e) });
    } finally { setLoading(false); }
  };

  return (
    <Section title="2. Shop / PRODUCT_KV">
      <p className="dp-hint">
        Needs <code>npm run dev:seed</code> first (or <code>npm run dev:full</code> does it automatically).
      </p>
      <RunBtn label="List products" loading={loading} onClick={fetch_} />
      <ResultBox result={res} />
    </Section>
  );
}

// ── 3. AI Catalog KV ─────────────────────────────────────────────────────────

function AiCatalog() {
  const [res, setRes] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);

  const fetch_ = async () => {
    setLoading(true);
    try {
      const r = await apiGet(ApiEndpoint.AI.Catalog);
      setRes({ label: `GET /api/v1/ai/catalog  →  ${r.status}`, ok: r.ok, data: r.data });
    } catch (e) {
      setRes({ label: 'catalog fetch failed', ok: false, data: String(e) });
    } finally { setLoading(false); }
  };

  return (
    <Section title="3. AI Catalog KV">
      <p className="dp-hint">
        Seeded by <code>dev:full</code>. Lists available AI models from AI_CATALOG_KV.
      </p>
      <RunBtn label="List AI catalog" loading={loading} onClick={fetch_} />
      <ResultBox result={res} />
    </Section>
  );
}

// ── 4. Asset R2 Bucket ───────────────────────────────────────────────────────

function AssetBucket() {
  const [listRes, setListRes]     = useState<Result | null>(null);
  const [uploadRes, setUploadRes] = useState<Result | null>(null);
  const [getRes, setGetRes]       = useState<Result | null>(null);
  const [listLoading, setListLoading]     = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [getLoading, setGetLoading]       = useState(false);
  const [assetKey, setAssetKey]   = useState('dev-test/hello.txt');
  const [getKey, setGetKey]       = useState('dev-test/hello.txt');
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver]   = useState(false);

  const listAssets = async () => {
    setListLoading(true);
    try {
      const token = await getToken();
      const r = await apiGet(`${ApiEndpoint.Assets.Base}?prefix=dev-test/`, token);
      setListRes({ label: `GET /api/v1/assets  →  ${r.status}`, ok: r.ok, data: r.data });
    } catch (e) {
      setListRes({ label: 'list failed', ok: false, data: String(e) });
    } finally { setListLoading(false); }
  };

  const uploadFile = useCallback(async (file: File) => {
    setUploadLoading(true);
    setUploadRes(null);
    const key = assetKey || `dev-test/${file.name}`;
    try {
      const token = await getToken();
      const res = await fetch(`${BASE}${ApiEndpoint.Assets.ById(key)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: await file.arrayBuffer(),
      });
      const text = await res.text();
      let data: unknown;
      try { data = JSON.parse(text); } catch { data = text; }
      setUploadRes({ label: `PUT /api/v1/assets/${key}  →  ${res.status}`, ok: res.ok, data });
    } catch (e) {
      setUploadRes({ label: 'upload failed', ok: false, data: String(e) });
    } finally { setUploadLoading(false); }
  }, [assetKey]);

  const getAsset = async () => {
    setGetLoading(true);
    try {
      const res = await fetch(`${BASE}${ApiEndpoint.Assets.ById(getKey)}`);
      if (!res.ok) {
        const text = await res.text();
        setGetRes({ label: `GET /api/v1/assets/${getKey}  →  ${res.status}`, ok: false, data: text });
        return;
      }
      const ct = res.headers.get('content-type') ?? '';
      const isText = ct.includes('text') || ct.includes('json');
      const data = isText ? await res.text() : `[binary ${ct}, ${res.headers.get('content-length') ?? '?'} bytes]`;
      setGetRes({ label: `GET /api/v1/assets/${getKey}  →  ${res.status}`, ok: true, data });
    } catch (e) {
      setGetRes({ label: 'get failed', ok: false, data: String(e) });
    } finally { setGetLoading(false); }
  };

  return (
    <Section title="4. Assets — R2 Bucket">
      <p className="dp-hint">
        PUT requires auth (sign in first). GET is public. R2 local bucket: <code>ocentra-assets</code>.
      </p>

      {/* List */}
      <div className="dp-row">
        <RunBtn label="List dev-test/ assets" loading={listLoading} onClick={listAssets} />
      </div>
      <ResultBox result={listRes} />

      {/* Upload */}
      <div className="dp-upload-area">
        <div className="dp-row">
          <label className="dp-label" htmlFor="dp-upload-key">Upload key:</label>
          <input id="dp-upload-key" className="dp-input" value={assetKey} onChange={e => setAssetKey(e.target.value)} />
        </div>
        <div
          role="button"
          tabIndex={0}
          className={`dp-dropzone ${dragOver ? 'dp-dropzone-over' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) uploadFile(f); }}
          onClick={() => fileRef.current?.click()}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileRef.current?.click(); } }}
        >
          {uploadLoading ? <span className="dp-spin dp-spin-lg" /> : (
            <span>
              {dragOver ? 'Drop to upload' : 'Drag & drop a file here, or click to browse'}
            </span>
          )}
        </div>
        <input ref={fileRef} type="file" className="dp-file-input" aria-label="Choose file to upload"
          onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f); }} />
      </div>
      <ResultBox result={uploadRes} />

      {/* Get/download */}
      <div className="dp-row dp-row--spaced">
        <label className="dp-label" htmlFor="dp-get-key">Get key:</label>
        <input id="dp-get-key" className="dp-input" value={getKey} onChange={e => setGetKey(e.target.value)} />
        <RunBtn label="Get asset" loading={getLoading} onClick={getAsset} />
      </div>
      <ResultBox result={getRes} />
    </Section>
  );
}

// ── 5. Credits / Token Escrow ────────────────────────────────────────────────

function CreditsCheck() {
  const [res, setRes] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);

  const check = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) { setRes({ label: 'Not signed in', ok: false, data: 'Sign into the app first' }); return; }
      const r = await apiGet(ApiEndpoint.Credits.Balance('me'), token);
      setRes({ label: `GET /api/v1/credits/balance  →  ${r.status}`, ok: r.ok, data: r.data });
    } catch (e) {
      setRes({ label: 'credits check failed', ok: false, data: String(e) });
    } finally { setLoading(false); }
  };

  return (
    <Section title="5. Credits (CreditsDO)">
      <p className="dp-hint">Requires being signed in. Reads your AC balance from the Durable Object.</p>
      <RunBtn label="Check AC balance" loading={loading} onClick={check} />
      <ResultBox result={res} />
    </Section>
  );
}

// ── Root page ─────────────────────────────────────────────────────────────────

export function DevPanelPage() {
  return (
    <div className="dp-root">
      <div className="dp-header">
        <h1 className="dp-title">⚙️ Dev Panel</h1>
        <p className="dp-subtitle">
          Local Cloudflare feature tester. Worker must be running on{' '}
          <a href="http://localhost:8787" target="_blank" rel="noopener noreferrer">localhost:8787</a>.
          <br />
          Start everything with: <code>npm run dev:full</code>
        </p>
      </div>
      <div className="dp-body">
        <WorkerStatus />
        <ShopProducts />
        <AiCatalog />
        <AssetBucket />
        <CreditsCheck />
      </div>
    </div>
  );
}
