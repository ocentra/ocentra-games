import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { PluginOption, PreviewServer, ViteDevServer } from 'vite';
import {
  createRobotsTxt,
  createSitemapXml,
  injectSeoIntoHtml,
  isHtmlRouteRequest,
  resolveServerSeoMetadata,
} from '../../src/seo/seoServer';
import { DEFAULT_SEO_SITE_ORIGIN } from '../../src/seo/publicSeo';

interface SeoRoutesPluginOptions {
  rootDir: string;
  siteOrigin?: string;
}

function sendText(response: ServerResponse, body: string, contentType: string): void {
  response.statusCode = 200;
  response.setHeader('Content-Type', contentType);
  response.end(body);
}

function requestPath(request: IncomingMessage): string {
  const rawUrl = request.url || '/';
  try {
    return new URL(rawUrl, 'http://localhost').pathname;
  } catch {
    return '/';
  }
}

async function readIndexHtml(filePath: string): Promise<string> {
  return readFile(filePath, 'utf8');
}

function isSeoAssetPath(pathname: string): boolean {
  return pathname === '/robots.txt' || pathname === '/sitemap.xml';
}

function handleSeoAsset(pathname: string, response: ServerResponse, siteOrigin: string): boolean {
  if (pathname === '/robots.txt') {
    sendText(response, createRobotsTxt({ siteOrigin }), 'text/plain; charset=utf-8');
    return true;
  }
  if (pathname === '/sitemap.xml') {
    sendText(response, createSitemapXml({ siteOrigin }), 'application/xml; charset=utf-8');
    return true;
  }
  return false;
}

async function handleDevHtmlRoute(
  server: ViteDevServer,
  request: IncomingMessage,
  response: ServerResponse,
  siteOrigin: string,
  indexHtmlPath: string,
): Promise<boolean> {
  const pathname = requestPath(request);
  if (!isHtmlRouteRequest(pathname, request.headers.accept)) {
    return false;
  }
  const transformed = await server.transformIndexHtml(pathname, await readIndexHtml(indexHtmlPath));
  sendText(response, injectSeoIntoHtml(transformed, resolveServerSeoMetadata(pathname, siteOrigin)), 'text/html; charset=utf-8');
  return true;
}

async function handlePreviewHtmlRoute(
  request: IncomingMessage,
  response: ServerResponse,
  siteOrigin: string,
  indexHtmlPath: string,
): Promise<boolean> {
  const pathname = requestPath(request);
  if (!isHtmlRouteRequest(pathname, request.headers.accept)) {
    return false;
  }
  sendText(response, injectSeoIntoHtml(await readIndexHtml(indexHtmlPath), resolveServerSeoMetadata(pathname, siteOrigin)), 'text/html; charset=utf-8');
  return true;
}

export function seoRoutesPlugin(options: SeoRoutesPluginOptions): PluginOption {
  const siteOrigin = options.siteOrigin?.trim() || DEFAULT_SEO_SITE_ORIGIN;
  const devIndexHtmlPath = path.join(options.rootDir, 'index.html');
  const previewIndexHtmlPath = path.join(options.rootDir, 'dist', 'index.html');

  return {
    name: 'ocentra-seo-routes',
    enforce: 'pre',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const pathname = requestPath(request);
        try {
          if (handleSeoAsset(pathname, response, siteOrigin)) {
            return;
          }
          if (await handleDevHtmlRoute(server, request, response, siteOrigin, devIndexHtmlPath)) {
            return;
          }
          next();
        } catch (error) {
          next(error);
        }
      });
    },
    configurePreviewServer(server: PreviewServer) {
      server.middlewares.use(async (request, response, next) => {
        const pathname = requestPath(request);
        try {
          if (handleSeoAsset(pathname, response, siteOrigin)) {
            return;
          }
          if (isSeoAssetPath(pathname)) {
            next();
            return;
          }
          if (await handlePreviewHtmlRoute(request, response, siteOrigin, previewIndexHtmlPath)) {
            return;
          }
          next();
        } catch (error) {
          next(error);
        }
      });
    },
    transformIndexHtml(html) {
      return injectSeoIntoHtml(html, resolveServerSeoMetadata('/', siteOrigin));
    },
  };
}
