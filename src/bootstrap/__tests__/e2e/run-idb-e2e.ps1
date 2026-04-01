# Simple script to run IndexedDB E2E tests
# Drag and drop this file into PowerShell terminal to run

# Find project root by looking for package.json
function Find-ProjectRoot {
    $currentPath = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
    
    if (-not $currentPath) {
        $currentPath = Get-Location
    }
    
    $searchPath = $currentPath
    $maxDepth = 10
    $depth = 0
    
    while ($depth -lt $maxDepth) {
        $packageJson = Join-Path $searchPath "package.json"
        if (Test-Path $packageJson) {
            return $searchPath
        }
        $parent = Split-Path -Parent $searchPath
        if ($parent -eq $searchPath) { break }
        $searchPath = $parent
        $depth++
    }
    
    throw "Could not find project root (package.json)"
}

# Check npm
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: npm is not installed or not in PATH" -ForegroundColor Red
    exit 1
}

# Find project root
try {
    $projectRoot = Find-ProjectRoot
    Push-Location $projectRoot
} catch {
    Write-Host "ERROR: $_" -ForegroundColor Red
    exit 1
}

try {
    Write-Host "`nRunning IndexedDB E2E Tests...`n" -ForegroundColor Cyan
    
    # Run IndexedDB tests - Playwright automatically generates and opens HTML report
    # Use npx playwright directly to ensure project filter works correctly
    & npx playwright test --project=db-e2e
    
    exit $LASTEXITCODE
} finally {
    Pop-Location
}
