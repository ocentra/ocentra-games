// AUTO-GENERATED from @ocentra/endpoint-domain and src/constants/*.ts
// DO NOT EDIT MANUALLY - run: npm run generate:k6-constants

export const ApiEndpoint = {
  "Root": "/",
  "Health": "/health",
  "Explore": "/explore",
  "ExploreLeaderboard": "/explore/leaderboard",
  "ExploreBenchmark": "/explore/benchmark",
  "ApiExploreMatches": "/api/v1/explore/matches",
  "ApiExploreBenchmarks": "/api/v1/explore/benchmarks",
  "ApiMatches": "/api/v1/matches",
  "ApiDisputes": "/api/v1/disputes",
  "ApiCredits": "/api/v1/credits",
  "ApiBadges": "/api/v1/badges",
  "ApiLogs": "/api/v1/logs",
  "ApiResources": "/api/v1/resources",
  "ApiAssets": "/api/v1/assets",
  "ApiTest": "/api/v1/test",
  "ApiTestClearAll": "/api/v1/test/clear-all",
  "ApiAi": "/api/v1/ai",
  "ApiAiOnEvent": "/api/v1/ai/on_event",
  "ApiLeaderboard": "/api/v1/leaderboard",
  "ApiPlayers": "/api/v1/players",
  "ApiDocs": "/api/v1/docs",
  "Docs": "/api/v1/docs",
  "Swagger": "/swagger",
  "SwaggerJson": "/swagger.json",
  "OpenApiJson": "/openapi.json",
  "ApiOpenApiJson": "/openapi.json",
  "ApiMetrics": "/api/v1/metrics",
  "ApiAlerts": "/api/v1/alerts",
  "ApiImageProxy": "/api/v1/image-proxy",
  "ApiMatchesAnonymize": "/anonymize",
  "ApiDisputesEvidence": "/evidence"
};

export const HttpHeader = {
  "Accept": "Accept",
  "ContentType": "Content-Type",
  "ContentLength": "Content-Length",
  "TransferEncoding": "Transfer-Encoding",
  "Connection": "Connection",
  "Host": "Host",
  "Authorization": "Authorization",
  "XWalletId": "X-Wallet-Id",
  "XUserId": "X-User-Id",
  "CFConnectingIP": "CF-Connecting-IP",
  "XCorrelationId": "X-Correlation-ID",
  "XTestName": "X-Test-Name",
  "XRunId": "X-Run-Id",
  "XTestLogServerUrl": "X-Test-Log-Server-Url",
  "XSuitePath": "X-Suite-Path",
  "XSuiteType": "X-Suite-Type",
  "XRunType": "X-Run-Type",
  "XDebugModules": "X-Debug-Modules",
  "XTestKillSwitch": "X-Test-Kill-Switch",
  "Origin": "Origin",
  "Referer": "Referer",
  "UserAgent": "User-Agent",
  "IfNoneMatch": "If-None-Match",
  "ETag": "ETag",
  "XEnableAbortDebug": "X-Enable-Abort-Debug",
  "CacheControl": "Cache-Control",
  "LastModified": "Last-Modified",
  "ContentRange": "Content-Range",
  "Range": "Range",
  "Location": "Location",
  "XRateLimitRemaining": "X-RateLimit-Remaining",
  "XRateLimitReset": "X-RateLimit-Reset",
  "IdempotencyKey": "Idempotency-Key",
  "Upgrade": "Upgrade",
  "Http2Settings": "HTTP2-Settings",
  "Signature": "Signature",
  "StripeSignature": "Stripe-Signature",
  "AccessControlAllowOrigin": "Access-Control-Allow-Origin",
  "AccessControlAllowMethods": "Access-Control-Allow-Methods",
  "AccessControlAllowHeaders": "Access-Control-Allow-Headers",
  "AccessControlAllowCredentials": "Access-Control-Allow-Credentials",
  "AccessControlMaxAge": "Access-Control-Max-Age",
  "Allow": "Allow",
  "XContentTypeOptions": "X-Content-Type-Options",
  "XFrameOptions": "X-Frame-Options",
  "WwwAuthenticate": "WWW-Authenticate",
  "AcceptEncoding": "Accept-Encoding",
  "AcceptLanguage": "Accept-Language",
  "XRequestedWith": "X-Requested-With",
  "SecWebSocketKey": "Sec-WebSocket-Key",
  "SecWebSocketVersion": "Sec-WebSocket-Version"
};

export const HttpStatus = {
  "SwitchingProtocols": 101,
  "Ok": 200,
  "Created": 201,
  "Accepted": 202,
  "NoContent": 204,
  "PartialContent": 206,
  "Found": 302,
  "NotModified": 304,
  "BadRequest": 400,
  "Unauthorized": 401,
  "Forbidden": 403,
  "NotFound": 404,
  "MethodNotAllowed": 405,
  "PaymentRequired": 402,
  "Conflict": 409,
  "Gone": 410,
  "UnsupportedMediaType": 415,
  "PayloadTooLarge": 413,
  "LengthRequired": 411,
  "UnprocessableEntity": 422,
  "UpgradeRequired": 426,
  "TooManyRequests": 429,
  "InternalServerError": 500,
  "NotImplemented": 501,
  "BadGateway": 502,
  "ServiceUnavailable": 503,
  "GatewayTimeout": 504
};

export const Currency = {
  "GP": "GP",
  "AC": "AC",
  "USD": "USD"
};

export const HttpContentType = {
  "ApplicationJson": "application/json",
  "ApplicationJavascript": "application/javascript",
  "TextPlain": "text/plain",
  "TextHtml": "text/html",
  "TextCss": "text/css",
  "ImagePng": "image/png",
  "ImageJpeg": "image/jpeg",
  "ImageGif": "image/gif",
  "ImageWebp": "image/webp",
  "ImageSvgXml": "image/svg+xml",
  "FontWoff": "font/woff",
  "FontWoff2": "font/woff2",
  "FontTtf": "font/ttf",
  "FontOtf": "font/otf",
  "MultipartFormData": "multipart/form-data",
  "ApplicationOctetStream": "application/octet-stream",
  "OctetStream": "application/octet-stream",
  "ApplicationXWwwFormUrlencoded": "application/x-www-form-urlencoded"
};

export const HttpAuthScheme = {
  "Bearer": "Bearer"
};

export const CreditAction = {
  "Balance": "balance",
  "Purchase": "purchase",
  "Consume": "consume",
  "ConsumeGP": "consume-gp",
  "Earn": "earn",
  "Redeem": "redeem",
  "Transactions": "transactions"
};

export const IdempotencyKeyPrefix = {
  "Earn": "earn-",
  "Purchase": "purchase-",
  "Consume": "consume-",
  "ConsumeAC": "consume-ac-",
  "Rollback": "rollback-",
  "BadgeReward": "badge-"
};

export const TestConfig = {
  "LocalhostOrigin2": "http://localhost:3000"
};

export const TestDefaults = {
  "LoadTestUserIdPrefix": "load-test-",
  "TestTokenPrefix": "test-token:",
  "DefaultWorkerUrl": "http://localhost:8787",
  "TestAcAmount": 10,
  "TestAmount": 0.1,
  "TestSleepSeconds": 0.1
};
