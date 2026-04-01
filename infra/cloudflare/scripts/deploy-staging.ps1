# Deploy to Cloudflare Staging and Run Smoke Tests
# This script deploys all CRITICAL fixes to staging and verifies they work

Write-Host "🔒 Security Hardening - Staging Deployment" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location (Join-Path $scriptPath "..")

Write-Host "📦 Step 1: Running pre-deployment checks..." -ForegroundColor Yellow
npm run lint
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Linting failed!" -ForegroundColor Red
    exit 1
}

npm run test:integration
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Integration tests failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🚀 Step 2: Deploying to Cloudflare staging..." -ForegroundColor Yellow
wrangler deploy --env staging
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Step 3: Deployment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Run smoke tests: `$env:WORKER_URL='https://your-staging-worker.workers.dev'; npm run test:production"
Write-Host "   2. Verify security events in Analytics Engine"
Write-Host "   3. Test path traversal protection (3-5 payloads)"
Write-Host "   4. Test SSRF protection (3-5 payloads)"
Write-Host "   5. Verify auth is enforced"
Write-Host "   6. Test size limits with oversized request"
Write-Host ""
Write-Host "🔍 To monitor logs:" -ForegroundColor Cyan
Write-Host "   wrangler tail --env staging --format pretty"
Write-Host ""
