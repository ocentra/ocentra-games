export interface HomepageEnvironment {
  ENVIRONMENT?: string;
}

export function generateHomepageHtml(baseUrl: string, env: HomepageEnvironment): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Claim Storage API</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
      background: #1a1a1a;
      color: #e0e0e0;
      line-height: 1.6;
    }
    h1 { color: #4a9eff; }
    .endpoint {
      background: #2a2a2a;
      padding: 1rem;
      margin: 1rem 0;
      border-radius: 8px;
      border-left: 3px solid #4a9eff;
    }
    .endpoint code {
      background: #1a1a1a;
      padding: 0.2rem 0.4rem;
      border-radius: 4px;
      color: #4a9eff;
    }
    a {
      color: #4a9eff;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    .status {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      background: #2a7a2a;
      color: #90ee90;
      border-radius: 4px;
      font-size: 0.9rem;
      margin-left: 0.5rem;
    }
  </style>
</head>
<body>
  <h1>🎮 Claim Storage API</h1>
  <p>API for storing and managing game match records, disputes, and AI decisions.</p>
  
  <div class="endpoint">
    <h2>📚 API Documentation</h2>
    <p>
      <a href="${baseUrl}/api/docs" target="_blank">Swagger UI</a> <span class="status">Interactive</span><br>
      <a href="${baseUrl}/openapi.json" target="_blank">OpenAPI JSON</a> <span class="status">Import to Postman</span>
    </p>
  </div>

  <div class="endpoint">
    <h2>🔍 Quick Links</h2>
    <ul>
      <li><a href="${baseUrl}/health">Health Check</a> - <code>GET /health</code></li>
      <li><a href="${baseUrl}/api/metrics">Metrics</a> - <code>GET /api/metrics</code></li>
      <li><a href="${baseUrl}/api/docs">API Docs</a> - <code>GET /api/docs</code></li>
    </ul>
  </div>

  <div class="endpoint">
    <h2>📡 Available Endpoints</h2>
    <ul>
      <li><code>PUT /api/matches/:matchId</code> - Upload match record</li>
      <li><code>GET /api/matches/:matchId</code> - Get match record</li>
      <li><code>DELETE /api/matches/:matchId</code> - Delete match record</li>
      <li><code>GET /api/signed-url/:matchId</code> - Generate signed URL</li>
      <li><code>POST /api/disputes</code> - Create dispute</li>
      <li><code>GET /api/disputes/:disputeId</code> - Get dispute</li>
      <li><code>POST /api/disputes/:disputeId/evidence</code> - Upload evidence</li>
      <li><code>POST /api/archive/:matchId</code> - Archive match</li>
      <li><code>POST /api/ai/on_event</code> - Handle AI event</li>
      <li><code>GET /api/data-export/:userId</code> - Export user data (GDPR)</li>
      <li><code>DELETE /api/data/:userId</code> - Delete user data (GDPR)</li>
      <li><code>POST /api/matches/:matchId/anonymize</code> - Anonymize match (GDPR)</li>
      <li><code>GET /api/leaderboard/:game_type</code> - Get leaderboard (requires indexer)</li>
      <li><code>GET /api/leaderboard/:game_type/user/:user_id</code> - Get user rank (requires indexer)</li>
      <li><code>GET /api/leaderboard/:game_type/tier</code> - Filter by tier (requires indexer)</li>
      <li><code>GET /api/leaderboard/:game_type/nearby/:user_id</code> - Nearby players (requires indexer)</li>
    </ul>
  </div>

  <div class="endpoint" style="border-left-color: #ff6b6b;">
    <h2>🧪 Test Endpoints (Development Only)</h2>
    <p style="color: #ff6b6b; font-weight: bold;">⚠️  WARNING: These endpoints are DANGEROUS and only available in development!</p>
    <ul>
      <li><code>DELETE /api/test/clear-all?confirm=true</code> - Clear ALL records from R2 (IRREVERSIBLE!)</li>
    </ul>
    <p style="color: #ff6b6b; font-size: 0.9rem;">These endpoints are automatically disabled in production.</p>
  </div>

  <div class="endpoint">
    <h2>🌐 Environment</h2>
    <p><strong>Environment:</strong> ${env.ENVIRONMENT || 'development'}</p>
    <p><strong>Base URL:</strong> <code>${baseUrl}</code></p>
  </div>

  <div class="endpoint">
    <h2>📖 Documentation</h2>
    <p>For complete API documentation, validation rules, and examples, see:</p>
    <ul>
      <li><a href="${baseUrl}/api/docs" target="_blank">Interactive Swagger UI</a></li>
      <li><a href="${baseUrl}/openapi.json" target="_blank">OpenAPI 3.0 Specification</a></li>
      <li><a href="${baseUrl}/explore" target="_blank">🎮 Match Explorer</a> - Browse and explore match records</li>
    </ul>
  </div>
</body>
</html>`;
}
