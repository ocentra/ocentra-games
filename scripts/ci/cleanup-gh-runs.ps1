param(
  [Parameter(Mandatory = $true)]
  [string]$CommitSha,
  [ValidateSet("failure", "cancelled", "all")]
  [string]$Conclusion = "all",
  [int]$Limit = 100
)

$raw = gh run list --commit $CommitSha --limit $Limit --json databaseId,conclusion
$runs = $raw | ConvertFrom-Json

if ($Conclusion -eq "all") {
  $targets = @($runs | Where-Object { $_.conclusion -in @("failure", "cancelled") } | ForEach-Object { $_.databaseId })
} else {
  $targets = @($runs | Where-Object { $_.conclusion -eq $Conclusion } | ForEach-Object { $_.databaseId })
}

foreach ($id in $targets) {
  'y' | gh run delete $id | Out-Null
  Write-Output "deleted $id"
}

Write-Output "done count=$($targets.Count)"
