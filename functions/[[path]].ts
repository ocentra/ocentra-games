import {
  createRobotsTxt,
  createSitemapXml,
  injectSeoIntoHtml,
  isHtmlRouteRequest,
  resolveServerSeoMetadata,
} from '../src/seo/seoServer';
import { DEFAULT_SEO_SITE_ORIGIN } from '../src/seo/publicSeo';

interface PagesAssetsBinding {
  fetch(request: Request): Promise<Response>;
}

interface PagesEnv {
  ASSETS: PagesAssetsBinding;
  VITE_PUBLIC_SITE_ORIGIN?: string;
}

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

function isWorkerOrAssetRoute(pathname: string): boolean {
  return pathname.startsWith('/api/') || pathname.startsWith('/local/api/') || /\.[a-z0-9]+$/i.test(pathname);
}

async function fetchIndexHtml(request: Request, env: PagesEnv): Promise<string> {
  const url = new URL(request.url);
  url.pathname = '/';
  url.search = '';
  const response = await env.ASSETS.fetch(new Request(url, request));
  return response.text();
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

  if (isWorkerOrAssetRoute(url.pathname) || !isHtmlRouteRequest(url.pathname, request.headers.get('accept') ?? undefined)) {
    return env.ASSETS.fetch(request);
  }

  const metadata = resolveServerSeoMetadata(url.pathname, origin);
  return withHeaders(injectSeoIntoHtml(await fetchIndexHtml(request, env), metadata), 'text/html; charset=utf-8');
};
