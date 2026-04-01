$ErrorActionPreference = "Stop"

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = (Join-Path (Join-Path (Join-Path $scriptPath "..") "..") "..")
Set-Location $projectRoot

Write-Host "Running MCP Asset Management Tests..."
Write-Host ""

npm test -- vite/utils/__tests__/mcp-asset-management.test.ts

$reportPath = Join-Path $scriptPath "mcp-asset-management-report.html"

if (Test-Path $reportPath) {
    Write-Host ""
    Write-Host "Report generated: $reportPath"
    Write-Host "Opening report in browser..."
    Start-Process $reportPath
} else {
    Write-Host ""
    Write-Host "Warning: Report not found at $reportPath"
}

