/**
 * Branded types for endpoint-domain.
 *
 * No raw strings for paths, identifiers, or HTTP primitives.
 * All branded types use TypeScript's intersection with unique brand property.
 */

/**
 * REST API path (Cloudflare, Local, Prod).
 * Use for all public API endpoint paths.
 */
export type ApiPath = string & { readonly __brand: 'ApiPath' };

/**
 * Durable Object path/ID.
 * Use for internal DO routing paths.
 */
export type DOPath = string & { readonly __brand: 'DOPath' };

/**
 * Stable endpoint identifier for metrics, logging, and route registration.
 * Independent of path - remains stable even if path changes.
 */
export type EndpointId = string & { readonly __brand: 'EndpointId' };

/**
 * Route handler identifier. Opaque key for Cloudflare handler map.
 * Domain defines keys; Cloudflare wires handlers. No raw strings.
 */
export type HandlerKey = string & { readonly __brand: 'HandlerKey' };

/**
 * Path segment for route matching (e.g. subpath includes check).
 */
export type PathSegment = string & { readonly __brand: 'PathSegment' };

/**
 * Query parameter name.
 * Use for query parameter keys to prevent raw strings.
 */
export type QueryParam = string & { readonly __brand: 'QueryParam' };

/**
 * HTTP header name.
 * Use for header names to prevent raw strings.
 */
export type HeaderName = string & { readonly __brand: 'HeaderName' };
