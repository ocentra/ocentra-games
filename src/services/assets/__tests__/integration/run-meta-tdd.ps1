$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $scriptDir)))
$reportPath = Join-Path $scriptDir "meta-system-tdd-report.html"
$testLogPath = Join-Path $scriptDir ".meta-test-output.log"

$totalStartTime = Get-Date
$allTestsPassed = $true

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  Meta System Complete Test Suite - Full Automation" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

Push-Location $repoRoot

try {
    $testOutputBuilder = New-Object System.Text.StringBuilder
    
    Write-Host "STEP 1/4: Quick Validation Check..." -ForegroundColor Yellow
    Write-Host ""
    $step1Start = Get-Date
    try {
        $validationOutput = & npm run validate:meta-system 2>&1 | Out-String
        Write-Host $validationOutput
        [void]$testOutputBuilder.AppendLine("=== STEP 1: Quick Validation ===")
        [void]$testOutputBuilder.AppendLine($validationOutput)
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  [WARN] Validation script returned warnings (non-fatal)" -ForegroundColor Yellow
        } else {
            Write-Host "  [PASS] Quick validation passed" -ForegroundColor Green
        }
    } catch {
        Write-Host "  [WARN] Validation script error (non-fatal): $($_.Exception.Message)" -ForegroundColor Yellow
        [void]$testOutputBuilder.AppendLine("Validation error: $($_.Exception.Message)")
    }
    $step1Duration = [math]::Round(($(Get-Date) - $step1Start).TotalSeconds, 1)
    Write-Host "  Duration: $step1Duration s" -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "STEP 2/4: Vitest Integration Tests..." -ForegroundColor Yellow
    Write-Host ""
    $step2Start = Get-Date
    try {
        $vitestOutput = & npm test -- src/services/assets/__tests__/integration/meta-system-integration.test.ts --run 2>&1 | Out-String
        Write-Host $vitestOutput
        [void]$testOutputBuilder.AppendLine("=== STEP 2: Vitest Integration Tests ===")
        [void]$testOutputBuilder.AppendLine($vitestOutput)
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  [FAIL] Vitest integration tests failed" -ForegroundColor Red
            $allTestsPassed = $false
        } else {
            Write-Host "  [PASS] Vitest integration tests passed" -ForegroundColor Green
        }
    } catch {
        Write-Host "  [FAIL] Vitest integration tests error: $($_.Exception.Message)" -ForegroundColor Red
        [void]$testOutputBuilder.AppendLine("Vitest error: $($_.Exception.Message)")
        $allTestsPassed = $false
    }
    $step2Duration = [math]::Round(($(Get-Date) - $step2Start).TotalSeconds, 1)
    Write-Host "  Duration: $step2Duration s" -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "STEP 3/4: Comprehensive TDD Test Suite..." -ForegroundColor Yellow
    Write-Host ""
    $step3Start = Get-Date
    try {
        $tddOutput = & npm run test:meta-tdd 2>&1 | Out-String
        Write-Host $tddOutput
        [void]$testOutputBuilder.AppendLine("=== STEP 3: Comprehensive TDD Tests ===")
        [void]$testOutputBuilder.AppendLine($tddOutput)
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  [FAIL] Comprehensive TDD tests failed" -ForegroundColor Red
            $allTestsPassed = $false
        } else {
            Write-Host "  [PASS] Comprehensive TDD tests passed" -ForegroundColor Green
        }
    } catch {
        Write-Host "  [FAIL] Comprehensive TDD tests error: $($_.Exception.Message)" -ForegroundColor Red
        [void]$testOutputBuilder.AppendLine("TDD error: $($_.Exception.Message)")
        $allTestsPassed = $false
    }
    $step3Duration = [math]::Round(($(Get-Date) - $step3Start).TotalSeconds, 1)
    Write-Host "  Duration: $step3Duration s" -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "STEP 4/4: Unit Tests (MetaFileService)..." -ForegroundColor Yellow
    Write-Host ""
    $step4Start = Get-Date
    try {
        $unitOutput = & npm test -- src/services/assets/__tests__/MetaFileService.test.ts --run 2>&1 | Out-String
        Write-Host $unitOutput
        [void]$testOutputBuilder.AppendLine("=== STEP 4: Unit Tests (MetaFileService) ===")
        [void]$testOutputBuilder.AppendLine($unitOutput)
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  [FAIL] Unit tests failed" -ForegroundColor Red
            $allTestsPassed = $false
        } else {
            Write-Host "  [PASS] Unit tests passed" -ForegroundColor Green
        }
    } catch {
        Write-Host "  [FAIL] Unit tests error: $($_.Exception.Message)" -ForegroundColor Red
        [void]$testOutputBuilder.AppendLine("Unit test error: $($_.Exception.Message)")
        $allTestsPassed = $false
    }
    $step4Duration = [math]::Round(($(Get-Date) - $step4Start).TotalSeconds, 1)
    Write-Host "  Duration: $step4Duration s" -ForegroundColor Gray
    Write-Host ""
    
    $totalDuration = [math]::Round(($(Get-Date) - $totalStartTime).TotalSeconds, 1)
    
    $testOutput = $testOutputBuilder.ToString()
    $testOutput | Out-File -FilePath $testLogPath -Encoding UTF8
    
    Write-Host "================================================================" -ForegroundColor $(if ($allTestsPassed) { "Green" } else { "Red" })
    Write-Host "                    Test Suite Complete!" -ForegroundColor $(if ($allTestsPassed) { "Green" } else { "Red" })
    Write-Host "================================================================" -ForegroundColor $(if ($allTestsPassed) { "Green" } else { "Red" })
    Write-Host ""
    Write-Host "Summary:" -ForegroundColor Cyan
    Write-Host "  Quick Validation:    $step1Duration s" -ForegroundColor Gray
    Write-Host "  Integration Tests:   $step2Duration s" -ForegroundColor Gray
    Write-Host "  Comprehensive TDD:  $step3Duration s" -ForegroundColor Gray
    Write-Host "  Unit Tests:          $step4Duration s" -ForegroundColor Gray
    Write-Host "  Total Duration:      $totalDuration s" -ForegroundColor $(if ($allTestsPassed) { "Green" } else { "Yellow" })
    Write-Host ""
    
    if ($allTestsPassed) {
        Write-Host "Status: [PASS] ALL TESTS PASSED" -ForegroundColor Green
        Write-Host ""
        Write-Host "Report: $reportPath" -ForegroundColor Cyan
    } else {
        Write-Host "Status: [FAIL] SOME TESTS FAILED" -ForegroundColor Red
        Write-Host ""
        Write-Host "Check the output above for details" -ForegroundColor Yellow
    }
    Write-Host ""
    
} catch {
    Write-Host ""
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host $_.ScriptStackTrace -ForegroundColor Red
    $allTestsPassed = $false
} finally {
    Pop-Location
    Write-Host "  Test log preserved at: $testLogPath" -ForegroundColor Gray
}

if (-not $allTestsPassed) {
    exit 1
}

