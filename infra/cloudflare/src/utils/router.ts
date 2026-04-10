import type { Env } from '@/constants/env';
import { HttpHeader, HttpMethod, HttpContentType, HttpStatus } from '@ocentra/endpoint-domain/constants/http';
import { ErrorMessage } from '@ocentra/endpoint-domain/constants/errors';
import { getCorsHeaders } from '@/utils/cors';
import { Logger, getStackTrace } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = Logger.instance;
log.register(import.meta.url);

const LOG_ROUTER_MATCH_LIFECYCLE = false;
const LOG_ROUTER_MATCH_STEPS = false;

const logDebug = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = true, batchKey?: string) => {
  log.logDebug(message, stackTrace, data, enabled, batchKey);
};

const logError = (message: string, stackTrace: StackTrace, data?: unknown) => {
  log.logError(message, stackTrace, data);
};

export type RouteMatcher = (path: string, method: string) => boolean;
export type RouteHandler = (request: Request, env: Env, context?: RouteContext) => Promise<Response>;
export type RouteMiddleware = (request: Request, env: Env, context?: RouteContext) => Promise<Response | null>;

export interface RouteContext {
  path?: string;
  url?: URL;
  requestOrigin?: string;
  executionContext?: ExecutionContext;
}

export interface Route {
  matcher: RouteMatcher;
  handler: RouteHandler;
  middleware?: RouteMiddleware[];
  priority?: number;
  allowedMethods?: HttpMethod[];
}

export function exactPath(paths: string | string[]): RouteMatcher {
  const pathArray = Array.isArray(paths) ? paths : [paths];
  return (path: string) => pathArray.includes(path);
}

export function startsWith(prefix: string): RouteMatcher {
  return (path: string) => path.startsWith(prefix);
}

export function pathWithParam(endpoint: string): RouteMatcher {
  const normalizedEndpoint = endpoint.replace(/\/+$/, '');
  return (path: string) => {
    if (path === normalizedEndpoint) return true;
    const prefix = `${normalizedEndpoint}/`;
    if (!path.startsWith(prefix)) return false;
    const afterPrefix = path.slice(prefix.length);
    return afterPrefix.length > 0;
  };
}

export function includes(substring: string): RouteMatcher {
  return (path: string) => path.includes(substring);
}

export function combineMatchers(...matchers: RouteMatcher[]): RouteMatcher {
  return (path: string, method: string) => matchers.every(matcher => matcher(path, method));
}

export function methodMatcher(methods: HttpMethod | HttpMethod[]): RouteMatcher {
  const methodArray = Array.isArray(methods) ? methods : [methods];
  return (_path: string, method: string) => methodArray.includes(method as HttpMethod);
}

export function pathAndMethod(pathMatcher: RouteMatcher, methodMatcher: RouteMatcher): RouteMatcher {
  return (path: string, method: string) => pathMatcher(path, method) && methodMatcher(path, method);
}

export class Router {
  private routes: Route[] = [];

  add(route: Route): void {
    this.routes.push(route);
    this.routes.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }

  async match(request: Request, env: Env, context?: RouteContext): Promise<Response | null> {
    const path = new URL(request.url).pathname;
    const method = request.method;
    const requestOrigin = context?.requestOrigin;
    let pathMatchedButMethodNotAllowed = false;
    const allowedMethods = new Set<HttpMethod>();

    logDebug('[ROUTER-MATCH] Starting route matching', getStackTrace(), { path, method, url: request.url }, LOG_ROUTER_MATCH_LIFECYCLE);

    for (let i = 0; i < this.routes.length; i++) {
      const route = this.routes[i];
      const matches = route.matcher(path, method);
      logDebug(`[ROUTER-MATCH] Checking route ${i + 1}/${this.routes.length}`, getStackTrace(), { 
        path, 
        method, 
        matches,
        hasMiddleware: !!route.middleware,
        priority: route.priority ?? 0
      }, LOG_ROUTER_MATCH_STEPS, 'Router.match');
      
      if (matches) {
        if (route.allowedMethods && !route.allowedMethods.includes(method as HttpMethod)) {
          pathMatchedButMethodNotAllowed = true;
          for (const allowedMethod of route.allowedMethods) {
            allowedMethods.add(allowedMethod);
          }
          continue;
        }

        if (pathMatchedButMethodNotAllowed && !route.allowedMethods) {
          continue;
        }

        logDebug('[ROUTER-MATCH] Route matched!', getStackTrace(), { path, method }, LOG_ROUTER_MATCH_LIFECYCLE);
        
        if (route.middleware) {
          logDebug('[ROUTER-MATCH] Running middleware', getStackTrace(), { middlewareCount: route.middleware.length }, LOG_ROUTER_MATCH_LIFECYCLE);
          for (const middleware of route.middleware) {
            const middlewareResponse = await middleware(request, env, context);
            if (middlewareResponse) {
              log.flushBatchContext('Router.match');
              logDebug('[ROUTER-MATCH] Middleware returned response', getStackTrace(), { status: middlewareResponse.status }, LOG_ROUTER_MATCH_LIFECYCLE);
              return middlewareResponse;
            }
          }
        }
        
        log.flushBatchContext('Router.match');
        logDebug('[ROUTER-MATCH] Invoking handler', getStackTrace(), { path, method }, LOG_ROUTER_MATCH_LIFECYCLE);
        try {
          const response = await route.handler(request, env, context);
          logDebug('[ROUTER-MATCH] Handler returned response', getStackTrace(), { path, method, status: response.status }, LOG_ROUTER_MATCH_LIFECYCLE);
          return response;
        } catch (error) {
          logError('[ROUTER-MATCH] Handler threw exception', getStackTrace(), { 
            path, 
            method, 
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
          });
          throw error;
        }
      }
    }

    if (pathMatchedButMethodNotAllowed) {
      log.flushBatchContext('Router.match');
      return new Response(ErrorMessage.MethodNotAllowed, {
        status: HttpStatus.MethodNotAllowed,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.TextPlain,
          [HttpHeader.Allow]: Array.from(allowedMethods).join(', '),
          ...getCorsHeaders(env, requestOrigin || undefined),
        },
      });
    }

    log.flushBatchContext('Router.match');
    logDebug('[ROUTER-MATCH] No route matched', getStackTrace(), { path, method }, LOG_ROUTER_MATCH_LIFECYCLE);
    return null;
  }
}
