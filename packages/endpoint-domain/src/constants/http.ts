import type { HeaderName } from '@/types/brands';

export const HttpMethod = {
  Get: 'GET',
  Post: 'POST',
  Put: 'PUT',
  Patch: 'PATCH',
  Delete: 'DELETE',
  Options: 'OPTIONS',
  Head: 'HEAD',
} as const;

export type HttpMethod = typeof HttpMethod[keyof typeof HttpMethod];

export const HttpScheme = {
  Http: 'http://',
  Https: 'https://',
} as const;

export type HttpSchemeValue = typeof HttpScheme[keyof typeof HttpScheme];

export const HttpStatus = {
  SwitchingProtocols: 101,
  Ok: 200,
  Created: 201,
  Accepted: 202,
  NoContent: 204,
  PartialContent: 206,
  Found: 302,
  NotModified: 304,
  BadRequest: 400,
  Unauthorized: 401,
  Forbidden: 403,
  NotFound: 404,
  MethodNotAllowed: 405,
  PaymentRequired: 402,
  Conflict: 409,
  Gone: 410,
  UnsupportedMediaType: 415,
  PayloadTooLarge: 413,
  LengthRequired: 411,
  UnprocessableEntity: 422,
  UpgradeRequired: 426,
  TooManyRequests: 429,
  InternalServerError: 500,
  NotImplemented: 501,
  BadGateway: 502,
  ServiceUnavailable: 503,
  GatewayTimeout: 504,
} as const;

export type HttpStatus = typeof HttpStatus[keyof typeof HttpStatus];

export const HttpHeader = {
  Accept: 'Accept' as HeaderName,
  ContentType: 'Content-Type' as HeaderName,
  ContentLength: 'Content-Length' as HeaderName,
  TransferEncoding: 'Transfer-Encoding' as HeaderName,
  Connection: 'Connection' as HeaderName,
  Host: 'Host' as HeaderName,
  Authorization: 'Authorization' as HeaderName,
  XWalletId: 'X-Wallet-Id' as HeaderName,
  XUserId: 'X-User-Id' as HeaderName,
  CFConnectingIP: 'CF-Connecting-IP' as HeaderName,
  XCorrelationId: 'X-Correlation-ID' as HeaderName,
  XTestName: 'X-Test-Name' as HeaderName,
  XRunId: 'X-Run-Id' as HeaderName,
  XTestLogServerUrl: 'X-Test-Log-Server-Url' as HeaderName,
  XSuitePath: 'X-Suite-Path' as HeaderName,
  XSuiteType: 'X-Suite-Type' as HeaderName,
  XRunType: 'X-Run-Type' as HeaderName,
  XDebugModules: 'X-Debug-Modules' as HeaderName,
  XTestKillSwitch: 'X-Test-Kill-Switch' as HeaderName,
  Origin: 'Origin' as HeaderName,
  Referer: 'Referer' as HeaderName,
  UserAgent: 'User-Agent' as HeaderName,
  IfNoneMatch: 'If-None-Match' as HeaderName,
  ETag: 'ETag' as HeaderName,
  XEnableAbortDebug: 'X-Enable-Abort-Debug' as HeaderName,
  CacheControl: 'Cache-Control' as HeaderName,
  LastModified: 'Last-Modified' as HeaderName,
  ContentRange: 'Content-Range' as HeaderName,
  Range: 'Range' as HeaderName,
  Location: 'Location' as HeaderName,
  XRateLimitRemaining: 'X-RateLimit-Remaining' as HeaderName,
  XRateLimitReset: 'X-RateLimit-Reset' as HeaderName,
  IdempotencyKey: 'Idempotency-Key' as HeaderName,
  Upgrade: 'Upgrade' as HeaderName,
  Http2Settings: 'HTTP2-Settings' as HeaderName,
  Signature: 'Signature' as HeaderName,
  StripeSignature: 'Stripe-Signature' as HeaderName,
  AccessControlAllowOrigin: 'Access-Control-Allow-Origin' as HeaderName,
  AccessControlAllowMethods: 'Access-Control-Allow-Methods' as HeaderName,
  AccessControlAllowHeaders: 'Access-Control-Allow-Headers' as HeaderName,
  AccessControlAllowCredentials: 'Access-Control-Allow-Credentials' as HeaderName,
  AccessControlMaxAge: 'Access-Control-Max-Age' as HeaderName,
  Allow: 'Allow' as HeaderName,
  XContentTypeOptions: 'X-Content-Type-Options' as HeaderName,
  XFrameOptions: 'X-Frame-Options' as HeaderName,
  WwwAuthenticate: 'WWW-Authenticate' as HeaderName,
  AcceptEncoding: 'Accept-Encoding' as HeaderName,
  AcceptLanguage: 'Accept-Language' as HeaderName,
  XRequestedWith: 'X-Requested-With' as HeaderName,
  SecWebSocketKey: 'Sec-WebSocket-Key' as HeaderName,
  SecWebSocketVersion: 'Sec-WebSocket-Version' as HeaderName,
} as const;

export type HttpHeader = typeof HttpHeader[keyof typeof HttpHeader];

const OctetStreamValue = 'application/octet-stream';
export const ContentType = {
  ApplicationJson: 'application/json',
  ApplicationJavascript: 'application/javascript',
  TextPlain: 'text/plain',
  TextHtml: 'text/html',
  TextCss: 'text/css',
  ImagePng: 'image/png',
  ImageJpeg: 'image/jpeg',
  ImageGif: 'image/gif',
  ImageWebp: 'image/webp',
  ImageSvgXml: 'image/svg+xml',
  FontWoff: 'font/woff',
  FontWoff2: 'font/woff2',
  FontTtf: 'font/ttf',
  FontOtf: 'font/otf',
  MultipartFormData: 'multipart/form-data',
  ApplicationOctetStream: OctetStreamValue,
  OctetStream: OctetStreamValue,
  ApplicationXWwwFormUrlencoded: 'application/x-www-form-urlencoded',
} as const;

export type ContentType = typeof ContentType[keyof typeof ContentType];
export const HttpContentType = ContentType;
export type HttpContentType = ContentType;

export const HttpAuthScheme = {
  Bearer: 'Bearer',
} as const;

export type HttpAuthScheme = typeof HttpAuthScheme[keyof typeof HttpAuthScheme];

export const WebSocketProtocol = {
  WebSocket: 'websocket',
} as const;

export type WebSocketProtocol = typeof WebSocketProtocol[keyof typeof WebSocketProtocol];

export const ConnectionValue = {
  Upgrade: 'Upgrade',
  KeepAlive: 'keep-alive',
  KeepAliveCommaUpgrade: 'keep-alive, Upgrade',
  UpgradeWithWhitespace: '  Upgrade  ',
} as const;

export type ConnectionValue = typeof ConnectionValue[keyof typeof ConnectionValue];

export const WebSocketCloseCode = {
  NormalClosure: 1000,
} as const;

export type WebSocketCloseCodeValue = typeof WebSocketCloseCode[keyof typeof WebSocketCloseCode];

export const CacheControl = {
  PublicImmutable: 'public, max-age=31536000, immutable',
  PublicLongTerm: 'public, max-age=31536000',
  PublicShortTerm: 'public, max-age=300',
  PrivateShortTerm: 'private, max-age=300',
} as const;

export type CacheControl = typeof CacheControl[keyof typeof CacheControl];
