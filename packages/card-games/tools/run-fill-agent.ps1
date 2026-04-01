# Boss mode (-Full) flow:
# -DryRun: With -Full, prints prompt in boss terminal, adds "explain-don't-fix" instruction, spawns one agent. Use -Full -DryRun.
# 1. Run validation -> build map of failing .json files
# 2. Ask user: how many agents, how many files (1/N/full), run in background?
# 3. Take that many from map, show queue in terminal
# 4. Spawn N slots, each gets one file. Write assignment to tools/logs/status.ndjson
# 5. Agent receives prompt, writes "started" to status.ndjson
# 6. Agent fixes file, writes "done" to status.ndjson
# 7. Boss sees "done", kills agent, spawns next file in that slot
# 8. Repeat until queue empty
#
# -FixOne (with -Full): only fix 1 file. -NumFiles N: fix at most N. -Hidden: minimize agent terminals.
# -GapFill: use gap-fill-list (games with minimal content) instead of validation failures. Use when all validate.
param(
  [string]$AgentCommand = "cursor-agent",
  [string]$Prompt = "",
  [int]$NumAgents = 0,
  [int]$NumFiles = 0,
  [switch]$Full = $true,
  [switch]$FixOne,
  [switch]$Hidden,
  [switch]$DryRun,
  [switch]$GapFill
)

$ErrorActionPreference = "Stop"
$ToolsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$PkgRoot  = Split-Path -Parent $ToolsDir
$LogDir = Join-Path $ToolsDir "logs"
$StatusFile = Join-Path $LogDir "status.ndjson"

# ── Helper: ask for agent count ──
function Get-AgentCount {
  if ($script:NumAgents -gt 0) { return $script:NumAgents }
  $n = Read-Host "How many agents? [1-100] (default: 1)"
  $num = 1
  if ([string]::IsNullOrWhiteSpace($n)) { return 1 }
  if (-not [int]::TryParse($n.Trim(), [ref]$num) -or $num -lt 1) { $num = 1 }
  if ($num -gt 100) { $num = 100 }
  return $num
}

# ── Helper: ask how many files to fix ──
function Get-NumFilesToFix([int]$totalAvailable) {
  if ($script:FixOne) { return 1 }
  if ($script:NumFiles -gt 0) { return [Math]::Min($script:NumFiles, $totalAvailable) }
  $n = Read-Host "How many files to fix? [Enter for all = $totalAvailable]"
  if ([string]::IsNullOrWhiteSpace($n)) { return $totalAvailable }
  $num = 0
  if ([int]::TryParse($n.Trim(), [ref]$num) -and $num -gt 0) { return [Math]::Min($num, $totalAvailable) }
  return $totalAvailable
}

# ── Helper: ask run in background (minimized) ──
function Get-RunInBackground {
  if ($script:Hidden) { return $true }
  $r = Read-Host "Run agent terminals in background (minimized)? [y/N] (default: No)"
  if ([string]::IsNullOrWhiteSpace($r)) { return $false }
  $r = $r.Trim().ToLowerInvariant()
  return ($r -eq 'y' -or $r -eq 'yes' -or $r -eq '1')
}

# ── Helper: spawn one cursor-agent terminal with a prompt ──
function Start-AgentTerminal([string]$promptFilePath, [string]$label, [switch]$Minimize) {
  $runCmd = "`$host.UI.RawUI.WindowTitle = '${label}'; Set-Location -LiteralPath '${PkgRoot}'; & '${AgentCommand}' --model auto --yolo (Get-Content -Raw -LiteralPath '${promptFilePath}')"
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = "powershell.exe"
  $psi.Arguments = @("-NoExit", "-NoProfile", "-Command", $runCmd)
  $psi.WorkingDirectory = $PkgRoot
  $psi.UseShellExecute = $true
  if ($Minimize) { $psi.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Minimized }
  $proc = [System.Diagnostics.Process]::Start($psi)
  return $proc
}

# ── Helper: kill a terminal and its child processes ──
function Stop-Terminal([System.Diagnostics.Process]$proc) {
  if ($proc -and -not $proc.HasExited) {
    try {
      # Kill child processes (cursor-agent) first, then the shell
      $children = Get-CimInstance Win32_Process -Filter "ParentProcessId = $($proc.Id)" -ErrorAction SilentlyContinue
      foreach ($child in $children) {
        Stop-Process -Id $child.ProcessId -Force -ErrorAction SilentlyContinue
      }
      Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    } catch { }
  }
}

# ── Simple mode: no -Full ──
if (-not $Full) {
  if ($Prompt) {
    $promptFile = Join-Path $env:TEMP "fill-single-prompt.txt"
    [System.IO.File]::WriteAllText($promptFile, $Prompt, [System.Text.Encoding]::UTF8)
    Start-AgentTerminal $promptFile "Agent-1" | Out-Null
  } else {
    Start-Process cmd -ArgumentList "/k", "cd /d `"$PkgRoot`" && $AgentCommand"
  }
  exit
}

# ══════════════════════════════════════════════════════════════════
# ── Boss mode: -Full
#    Current terminal = Boss.
#    Each task = one terminal. Boss kills it on done, spawns next.
# ══════════════════════════════════════════════════════════════════

function Invoke-ValidateListStrict {
  $outFile = Join-Path $env:TEMP "fill-validate-$PID.out"
  $errFile = Join-Path $env:TEMP "fill-validate-$PID.err"
  $p = Start-Process -FilePath "cmd.exe" -ArgumentList @("/c", "npm", "run", "validate:list:strict") `
    -WorkingDirectory $PkgRoot -NoNewWindow -PassThru `
    -RedirectStandardOutput $outFile -RedirectStandardError $errFile
  $p.WaitForExit()
  $out = Get-Content $outFile -Raw -ErrorAction SilentlyContinue
  $err = Get-Content $errFile -Raw -ErrorAction SilentlyContinue
  Remove-Item $outFile, $errFile -Force -ErrorAction SilentlyContinue
  return @{ code = $p.ExitCode; text = ($out + "`n" + $err) }
}

function Get-AllFailingFiles([string]$text) {
  $pattern = '(?m)^\s*\d+\.\s+([A-Za-z0-9._\-]+\.json)\s*:'
  $results = [System.Collections.Generic.List[string]]::new()
  foreach ($m in [regex]::Matches($text, $pattern)) {
    $name = $m.Groups[1].Value.Trim()
    if ([string]::IsNullOrEmpty($name)) { continue }
    if (-not $name.EndsWith('.json', [StringComparison]::OrdinalIgnoreCase)) { $name = "${name}.json" }
    [void]$results.Add($name)
  }
  return $results
}

function Get-ValidationErrorsByFile([string]$text) {
  $map = @{}
  $norm = $text -replace "`r`n", "`n" -replace "`r", "`n"
  $blocks = $norm -split '(?m)^\s*----------------------\s*'
  foreach ($block in $blocks) {
    $block = $block.Trim()
    if ([string]::IsNullOrWhiteSpace($block)) { continue }
    $firstLine = ($block -split "`n")[0]
    if ($firstLine -notmatch '^\s*\d+\.\s+([A-Za-z0-9._\-]+\.json)\s*:') { continue }
    $fileName = $matches[1].Trim()
    if (-not $fileName.EndsWith('.json', [StringComparison]::OrdinalIgnoreCase)) { $fileName = "${fileName}.json" }
    $lines = ($block -split "`n")[1..999]
    $errorParts = $lines | ForEach-Object { if ($_ -match '^\s*-\s+(.+)') { $matches[1].Trim() } } | Where-Object { $_ }
    $errorText = ($errorParts | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }) -join "`n"
    $map[$fileName] = $errorText
  }
  return $map
}

function Build-AgentPrompt([string]$jsonFileName, [string]$runId, [string]$validationErrors = "", [switch]$GapFill) {
  $rel = "src/processed-games/$jsonFileName"
  $statusFileEscaped = $script:StatusFile -replace '\\', '/'
  $reportStart = "node -e `"require('fs').appendFileSync('$statusFileEscaped',JSON.stringify({agent:'$runId',file:'$jsonFileName',status:'started',ts:new Date().toISOString()})+'\n')`""
  $reportDone = "node -e `"require('fs').appendFileSync('$statusFileEscaped',JSON.stringify({agent:'$runId',file:'$jsonFileName',status:'done',ts:new Date().toISOString()})+'\n')`""
  $templatePath = Join-Path $ToolsDir "agent-prompt.md"
  if (-not (Test-Path $templatePath)) {
    throw "Missing agent-prompt.md at $templatePath. Placeholders: {{runId}}, {{rel}}, {{jsonFile}}, {{reportStart}}, {{reportDone}}, {{taskContext}}"
  }
  $template = Get-Content $templatePath -Raw
  $taskContext = if ($GapFill) {
    "This file PASSES validation but has MINIMAL/PLACEHOLDER content in history, setup, rules, or strategy. Your task is to ENRICH those sections with REAL, SUBSTANTIVE content from sources."
  } else {
    if ([string]::IsNullOrWhiteSpace($validationErrors)) {
      "(Run 'npm run validate:one -- src/processed-games/$jsonFileName --strict' to see errors)"
    } else {
      "Current validation errors for this file:`n$validationErrors"
    }
  }
  return $template -replace '\{\{runId\}\}', $runId `
    -replace '\{\{rel\}\}', $rel `
    -replace '\{\{jsonFile\}\}', $jsonFileName `
    -replace '\{\{reportStart\}\}', $reportStart `
    -replace '\{\{reportDone\}\}', $reportDone `
    -replace '\{\{taskContext\}\}', $taskContext
}

$failingListFull = @()
$validationErrorsMap = @{}

if ($GapFill) {
  Write-Host ""
  Write-Host "[Boss] GapFill mode: querying games with minimal content..."
  Push-Location $PkgRoot
  $gapOut = & npx tsx db/query-gap-fill-list.ts 2>&1 | Out-String
  Pop-Location
  $gapLine = ($gapOut -split "`n" | Where-Object { $_ -match '^\s*\{' } | Select-Object -First 1)
  $gapJson = if ($gapLine) { $gapLine | ConvertFrom-Json -ErrorAction SilentlyContinue } else { $null }
  if ($gapJson -and $gapJson.files) {
    $failingListFull = @($gapJson.files)
    $validationErrorsMap = @{}
  }
  if ($failingListFull.Count -eq 0) {
    Write-Host "[Boss] No games need gap-fill (or gap-fill-list failed). Run 'npm run ingest' first. Done."
    exit
  }
  Write-Host "[Boss] Found $($failingListFull.Count) games with minimal content to enrich."
} else {
  Write-Host ""
  Write-Host "[Boss] Running validation to build failing list..."
  $r = Invoke-ValidateListStrict
  $failingListFull = Get-AllFailingFiles $r.text
  $validationErrorsMap = Get-ValidationErrorsByFile $r.text
  if ($failingListFull.Count -eq 0) {
    Write-Host "[Boss] Nothing to fix. All pass! Use -GapFill to enrich games with minimal content: npm run fill:gap-fill"
    exit
  }
}

$totalAvailable = $failingListFull.Count

if ($DryRun) {
  $fn = $failingListFull[0]
  $runId = "000-dry0"
  $errs = if ($validationErrorsMap[$fn]) { $validationErrorsMap[$fn] } else { "" }
  $basePrompt = if ($GapFill) { Build-AgentPrompt $fn $runId $errs -GapFill } else { Build-AgentPrompt $fn $runId $errs }
  $dryRunInstruction = @"

== DRY RUN MODE - DO NOT FIX YET ==
Explain what instructions you received. Describe the steps and the file/errors you were given.
Do NOT run any commands. Do NOT edit any files. Do NOT start fixing.
This is a dry run so you can show what you understood. Reply with your understanding, then stop.
"@
  $prompt = $dryRunInstruction + "`n`n" + $basePrompt
  New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
  $promptFile = Join-Path $env:TEMP "fill-dry-run-prompt.txt"
  [System.IO.File]::WriteAllText($promptFile, $prompt, [System.Text.Encoding]::UTF8)
  Write-Host ""
  Write-Host "[Boss] DRY RUN: Sending prompt for $fn (agent will explain, not fix)"
  Write-Host "==================================================="
  Write-Host "PROMPT SENT TO AGENT:"
  Write-Host "==================================================="
  Write-Host $prompt
  Write-Host "==================================================="
  Write-Host "[Boss] Starting agent with above prompt..."
  Start-AgentTerminal $promptFile "Agent-DryRun" | Out-Null
  Write-Host "[Boss] Dry run complete. Agent terminal opened."
  exit
}

# ── Boss: interactive prompts ──
$num = Get-AgentCount
$runHidden = Get-RunInBackground

$filesToFix = Get-NumFilesToFix $totalAvailable
$failingList = if ($filesToFix -lt $totalAvailable) { $failingListFull[0..($filesToFix - 1)] } else { $failingListFull }
$totalFiles = $failingList.Count

Write-Host ""
Write-Host "==================================================="
Write-Host "[Boss] BATCH RUN" $(if ($GapFill) { "(GAP-FILL: enrich minimal content)" } else { "" })
Write-Host "==================================================="
Write-Host "[Boss] Mode: $(if ($GapFill) { 'GapFill (enrich history/setup/rules)' } else { 'Validation fix' })"
Write-Host "[Boss] Agents: $num"
Write-Host "[Boss] Files: $totalFiles (of $totalAvailable available)"
Write-Host "[Boss] Command: $AgentCommand --model auto --yolo"
if ($runHidden) { Write-Host "[Boss] Hidden: agent terminals minimized" }
Write-Host "[Boss] Working dir: $PkgRoot"
Write-Host "[Boss] Status file: $StatusFile"
Write-Host "==================================================="
Write-Host ""
Write-Host "==================================================="
Write-Host "[Boss] QUEUE: $totalFiles $(if ($GapFill) { 'games to enrich' } else { 'failing files' })"
Write-Host "==================================================="
for ($i = 0; $i -lt $totalFiles; $i++) {
  $fn = $failingList[$i]
  $marker = if ($i -lt $num) { " <-- Slot-$($i+1) starts here" } else { "" }
  Write-Host ("  {0,4}. {1} (src/processed-games/{1}){2}" -f ($i+1), $fn, $marker)
}
Write-Host "==================================================="
Write-Host ""

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
Get-ChildItem $LogDir -Recurse -ErrorAction SilentlyContinue | Where-Object { $_.Name -ne "status.ndjson" } | Remove-Item -Force -Recurse -ErrorAction SilentlyContinue
$runHeader = "{`"agent`":`"boss`",`"file`":`"`",`"status`":`"run_started`",`"ts`":`"$(Get-Date -Format o)`",`"totalFiles`":$totalFiles,`"agents`":$num}"
[System.IO.File]::WriteAllText($StatusFile, "$runHeader`n", [System.Text.Encoding]::UTF8)

function Add-StatusLine($obj) {
  $line = ($obj | ConvertTo-Json -Compress) + "`n"
  [System.IO.File]::AppendAllText($script:StatusFile, $line, [System.Text.Encoding]::UTF8)
}

# ── Boss: dispatch and poll ──
$slots = @{}          # slot index -> @{ proc; file; runId; promptFile }
$doneCount = 0
$queueIndex = 0
$knownDone = New-Object System.Collections.Generic.HashSet[string]
$startTime = Get-Date
$successCount = 0
$exitCount = 0
$pollCount = 0

function Invoke-DispatchNext([int]$slotIdx) {
  if ($script:queueIndex -ge $script:failingList.Count) { return $false }
  $file = $script:failingList[$script:queueIndex]
  $script:queueIndex++
  $runId = "{0:D3}-{1}" -f (Get-Random -Maximum 1000), (-join ((48..57) + (97..102) | Get-Random -Count 5 | ForEach-Object { [char]$_ }))
  $errs = if ($script:validationErrorsMap -and $script:validationErrorsMap[$file]) { $script:validationErrorsMap[$file] } else { "" }
  $prompt = if ($script:GapFill) { Build-AgentPrompt $file $runId $errs -GapFill } else { Build-AgentPrompt $file $runId $errs }
  $safeFile = $file -replace '\.', '_'
  $promptFile = Join-Path $env:TEMP "fill-slot${slotIdx}-${safeFile}.txt"
  [System.IO.File]::WriteAllText($promptFile, $prompt, [System.Text.Encoding]::UTF8)
  $label = "Slot-$($slotIdx + 1): $file"
  $proc = Start-AgentTerminal $promptFile $label -Minimize:$script:runHidden
  $script:slots[$slotIdx] = @{ proc = $proc; file = $file; runId = $runId; promptFile = $promptFile }
  Add-StatusLine @{ agent = $runId; slot = ($slotIdx + 1); file = $file; status = "assigned"; ts = (Get-Date -Format o) }
  Write-Host "[Boss] Slot-$($slotIdx + 1) assigned: $file (src/processed-games/$file) - Agent $runId, PID $($proc.Id)"
  return $true
}

function Poll-StatusFile {
  if (-not (Test-Path $script:StatusFile)) { return @() }
  $newDone = @()
  $lines = Get-Content $script:StatusFile -ErrorAction SilentlyContinue
  foreach ($line in $lines) {
    if (-not $line) { continue }
    try {
      $entry = $line | ConvertFrom-Json
      if ($entry.status -eq "done" -and -not $script:knownDone.Contains($entry.agent)) {
        $script:knownDone.Add($entry.agent) | Out-Null
        $newDone += $entry
      }
    } catch { }
  }
  return $newDone
}

function Update-DoneEntries {
  $doneEntries = Poll-StatusFile
  $changed = $false
  foreach ($entry in $doneEntries) {
    foreach ($idx in @($script:slots.Keys)) {
      $s = $script:slots[$idx]
      if ($s.runId -eq $entry.agent) {
        $script:doneCount++
        $script:successCount++
        $changed = $true
        Write-Host "[Boss] DONE: $($s.file) (Agent $($s.runId), Slot-$($idx + 1)) [$($script:doneCount)/$($script:totalFiles)]"
        Stop-Terminal $s.proc
        Remove-Item $s.promptFile -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 1
        if (-not (Invoke-DispatchNext $idx)) {
          $script:slots.Remove($idx)
        }
        break
      }
    }
  }
  return $changed
}

function Update-DeadSlots {
  $deadSlots = @()
  foreach ($idx in @($script:slots.Keys)) {
    $s = $script:slots[$idx]
    if ($s.proc.HasExited -and -not $script:knownDone.Contains($s.runId)) {
      $deadSlots += $idx
    }
  }
  $changed = $false
  foreach ($idx in $deadSlots) {
    $s = $script:slots[$idx]
    $script:doneCount++
    $script:exitCount++
    $changed = $true
    Write-Host "[Boss] EXITED (no done): $($s.file) (Agent $($s.runId), Slot-$($idx + 1)) [$($script:doneCount)/$($script:totalFiles)]"
    Remove-Item $s.promptFile -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
    if (-not (Invoke-DispatchNext $idx)) {
      $script:slots.Remove($idx)
    }
  }
  return $changed
}

function Show-Status {
  Write-Host ""
  Write-Host "--- Active Slots ---"
  foreach ($idx in @($script:slots.Keys) | Sort-Object) {
    $s = $script:slots[$idx]
    Write-Host "  Slot-$($idx + 1): $($s.file) (src/processed-games/$($s.file)) - Agent $($s.runId)"
  }
  $elapsed = ((Get-Date) - $script:startTime).ToString("hh\:mm\:ss")
  $queueLeft = $script:failingList.Count - $script:queueIndex
  Write-Host "--- Done: $($script:doneCount)/$($script:totalFiles) | OK: $($script:successCount) | Exited: $($script:exitCount) | Queue: $queueLeft | Elapsed: $elapsed ---"
  Write-Host ""
}

# ── Initial dispatch ──
Write-Host "[Boss] Starting $num slot(s)..."
$assignments = @()
for ($i = 0; $i -lt $num; $i++) {
  if (-not (Invoke-DispatchNext $i)) { break }
  $assignments += "Slot-$($i+1) -> $($script:slots[$i].file) (src/processed-games/$($script:slots[$i].file))"
  if ($i -lt ($num - 1)) { Start-Sleep -Seconds 2 }
}
Write-Host ""
Write-Host '[Boss] ASSIGNMENTS:'
foreach ($a in $assignments) { Write-Host "  $a" }
Write-Host ""

Show-Status

# ── Poll loop ──
while ($slots.Count -gt 0) {
  Start-Sleep -Seconds 10
  $pollCount++
  $changed = (Update-DoneEntries) -or (Update-DeadSlots)
  if ($changed -or ($pollCount % 6 -eq 0)) {
    Show-Status
  }
}

# ── Final summary ──
$elapsed = ((Get-Date) - $startTime).ToString("hh\:mm\:ss")
Write-Host ""
Write-Host "==================================================="
Write-Host "[Boss] BATCH COMPLETE"
Write-Host "==================================================="
Write-Host "[Boss] Processed: $doneCount | Done: $successCount | Exited: $exitCount"
Write-Host "[Boss] Elapsed: $elapsed"
Write-Host "[Boss] Running final validation..."
$r2 = Invoke-ValidateListStrict
$stillFailing = Get-AllFailingFiles $r2.text
$passCount = $totalFiles - $stillFailing.Count
Write-Host "[Boss] Result: $passCount/$totalFiles now passing"
if ($stillFailing.Count -eq 0) {
  Write-Host "[Boss] ALL PASS!"
} else {
  Write-Host "[Boss] $($stillFailing.Count) still failing:"
  foreach ($f in $stillFailing) { Write-Host "  - $f" }
}
Write-Host "==================================================="
