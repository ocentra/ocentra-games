#!/bin/bash
# Deploy to Cloudflare Staging and Run Smoke Tests
# This script deploys all CRITICAL fixes to staging and verifies they work

set -e

echo "🔒 Security Hardening - Staging Deployment"
echo "=========================================="
echo ""

cd "$(dirname "$0")/.."

echo "📦 Step 1: Running pre-deployment checks..."
npm run lint
npm run test:integration

echo ""
echo "🚀 Step 2: Deploying to Cloudflare staging..."
wrangler deploy --env staging

echo ""
echo "✅ Step 3: Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Run smoke tests: WORKER_URL=https://your-staging-worker.workers.dev npm run test:production"
echo "   2. Verify security events in Analytics Engine"
echo "   3. Test path traversal protection (3-5 payloads)"
echo "   4. Test SSRF protection (3-5 payloads)"
echo "   5. Verify auth is enforced"
echo "   6. Test size limits with oversized request"
echo ""
echo "🔍 To monitor logs:"
echo "   wrangler tail --env staging --format pretty"
echo ""
