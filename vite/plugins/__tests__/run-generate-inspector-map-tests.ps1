$ErrorActionPreference = "Stop"

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = (Join-Path (Join-Path (Join-Path $scriptPath "..") "..") "..")
Set-Location $projectRoot

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  Generate Inspector Map Plugin Test Suite" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Running Generate Inspector Map Tests..." -ForegroundColor Yellow
Write-Host ""

npm test -- vite/plugins/__tests__/generate-inspector-map.test.ts

$reportPath = Join-Path $scriptPath "generate-inspector-map-report.html"

if (Test-Path $reportPath) {
    Write-Host ""
    Write-Host "================================================================" -ForegroundColor Green
    Write-Host "  Report generated: $reportPath" -ForegroundColor Green
    Write-Host "  Opening report in browser..." -ForegroundColor Yellow
    Write-Host "================================================================" -ForegroundColor Green
    Start-Process $reportPath
} else {
    Write-Host ""
    Write-Host "Warning: Report not found at $reportPath" -ForegroundColor Yellow
    Write-Host "Tests may have failed before report generation." -ForegroundColor Yellow
}

