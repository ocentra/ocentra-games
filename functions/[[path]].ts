import {
  createRobotsTxt,
  createSitemapXml,
  injectSeoIntoHtml,
  isHtmlRouteRequest,
  resolveServerSeoMetadata,
} from '../src/seo/seoServer';
import { DEFAULT_SEO_SITE_ORIGIN } from '../src/seo/publicSeo';
import { OpenApiServer } from '../packages/endpoint-domain/src/constants/openapi';
import { ApiPathPrefix } from '../packages/endpoint-domain/src/constants/versions';
import { isLocalHostname } from '../packages/endpoint-domain/src/constants/hostname';

interface PagesAssetsBinding {
  fetch(request: Request): Promise<Response>;
}

interface PagesEnv {
  ASSETS: PagesAssetsBinding;
  ASSETS_WORKER_URL_DEV?: string;
  ASSETS_WORKER_URL_PROD?: string;
  CF_PAGES_BRANCH?: string;
  CLAIM_STORAGE_ASSETS_URL_DEV?: string;
  CLAIM_STORAGE_ASSETS_URL_PROD?: string;
  CLAIM_STORAGE_WORKER_URL_DEV?: string;
  CLAIM_STORAGE_WORKER_URL_PROD?: string;
  VITE_ASSETS_WORKER_URL?: string;
  VITE_CLAIM_STORAGE_URL?: string;
  VITE_MAIN_LOCAL_CLAIM_STORAGE_URL?: string;
  VITE_MAIN_LOCAL_WORKER_URL?: string;
  VITE_MAIN_REAL_CLAIM_STORAGE_URL?: string;
  VITE_R2_WORKER_URL?: string;
  VITE_PUBLIC_SITE_ORIGIN?: string;
}

type WorkerOriginEnvKey = Exclude<keyof PagesEnv, 'ASSETS'>;

const WORKER_ORIGIN_ENV_KEYS: ReadonlyArray<WorkerOriginEnvKey> = [
  'VITE_MAIN_LOCAL_WORKER_URL',
  'VITE_MAIN_LOCAL_CLAIM_STORAGE_URL',
  'VITE_R2_WORKER_URL',
  'VITE_CLAIM_STORAGE_URL',
  'VITE_ASSETS_WORKER_URL',
  'VITE_MAIN_REAL_CLAIM_STORAGE_URL',
  'CLAIM_STORAGE_WORKER_URL_DEV',
  'CLAIM_STORAGE_WORKER_URL_PROD',
  'CLAIM_STORAGE_ASSETS_URL_DEV',
  'CLAIM_STORAGE_ASSETS_URL_PROD',
  'ASSETS_WORKER_URL_DEV',
  'ASSETS_WORKER_URL_PROD',
];

function siteOrigin(env: PagesEnv): string {
  return env.VITE_PUBLIC_SITE_ORIGIN || DEFAULT_SEO_SITE_ORIGIN;
}

function withHeaders(body: string, contentType: string): Response {
  return new Response(body, {
    headers: {
      'content-type': contentType,
      'cache-control': 'public, max-age=300',
    },
  });
}

function normalizeOrigin(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  try {
    const url = new URL(trimmed);
    return `${url.protocol}//${url.host}`;
  } catch {
    return undefined;
  }
}

function defaultWorkerOrigin(env: PagesEnv): string {
  const branch = env.CF_PAGES_BRANCH?.trim();
  return branch && branch !== 'main' ? OpenApiServer.Development : OpenApiServer.Production;
}

function resolveWorkerOrigin(env: PagesEnv): string {
  for (const key of WORKER_ORIGIN_ENV_KEYS) {
    const origin = normalizeOrigin(env[key]);
    if (origin) return origin;
  }
  return defaultWorkerOrigin(env);
}

function isApiRoute(pathname: string): boolean {
  return pathname === ApiPathPrefix || pathname.startsWith(`${ApiPathPrefix}/`);
}

function isWorkerOrAssetRoute(pathname: string): boolean {
  return isApiRoute(pathname) || pathname.startsWith('/local/api/') || /\.[a-z0-9]+$/i.test(pathname);
}

async function fetchIndexHtml(request: Request, env: PagesEnv): Promise<string> {
  const url = new URL(request.url);
  url.pathname = '/';
  url.search = '';
  const response = await env.ASSETS.fetch(new Request(url, request));
  return response.text();
}

function proxyApiRequest(request: Request, env: PagesEnv): Promise<Response> {
  const sourceUrl = new URL(request.url);
  const targetUrl = new URL(request.url);
  const workerOrigin = new URL(resolveWorkerOrigin(env));
  targetUrl.protocol = workerOrigin.protocol;
  targetUrl.host = workerOrigin.host;

  if (isLocalHostname(workerOrigin.hostname)) {
    return Promise.resolve(Response.redirect(targetUrl.toString(), 307));
  }

  const proxiedRequest = new Request(targetUrl.toString(), request);
  proxiedRequest.headers.set('x-forwarded-host', sourceUrl.host);
  proxiedRequest.headers.set('x-forwarded-proto', sourceUrl.protocol.replace(':', ''));
  return fetch(proxiedRequest);
}

export const onRequest = async ({ request, env }: { request: Request; env: PagesEnv }): Promise<Response> => {
  const url = new URL(request.url);
  const origin = siteOrigin(env);

  if (url.pathname === '/robots.txt') {
    return withHeaders(createRobotsTxt({ siteOrigin: origin }), 'text/plain; charset=utf-8');
  }

  if (url.pathname === '/sitemap.xml') {
    return withHeaders(createSitemapXml({ siteOrigin: origin }), 'application/xml; charset=utf-8');
  }

  if (isApiRoute(url.pathname)) {
    return proxyApiRequest(request, env);
  }

  if (isWorkerOrAssetRoute(url.pathname) || !isHtmlRouteRequest(url.pathname, request.headers.get('accept') ?? undefined)) {
    return env.ASSETS.fetch(request);
  }

  const metadata = resolveServerSeoMetadata(url.pathname, origin);
  return withHeaders(injectSeoIntoHtml(await fetchIndexHtml(request, env), metadata), 'text/html; charset=utf-8');
};
