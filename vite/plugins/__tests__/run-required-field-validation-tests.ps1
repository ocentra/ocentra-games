$ErrorActionPreference = "Stop"

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = (Join-Path (Join-Path (Join-Path $scriptPath "..") "..") "..")
Set-Location $projectRoot

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  Required Field Validation Test Suite" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Running Required Field Validation Tests..." -ForegroundColor Yellow
Write-Host ""

npm test -- vite/plugins/__tests__/requiredFieldValidation.test.ts

$reportPath = Join-Path $scriptPath "required-field-validation-report.html"

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

