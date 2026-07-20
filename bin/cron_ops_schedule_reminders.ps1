# POST /api/cron/ops-schedule-reminders — T-3/T-2/T-1/T-0 Ops Schedule nudges.
$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

$envFile = Join-Path $ProjectRoot ".env.local"
if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*#' -or $_ -notmatch '=') { return }
    $parts = $_.Split('=', 2)
    $name = $parts[0].Trim()
    $value = $parts[1].Trim().Trim('"').Trim("'")
    if ($name) { Set-Item -Path "Env:$name" -Value $value }
  }
}

$base = if ($env:IRONFRAME_CORE_ORIGIN) { $env:IRONFRAME_CORE_ORIGIN.TrimEnd('/') } else { "http://127.0.0.1:3000" }
$secret = $env:IRONFRAME_CRON_SECRET
if (-not $secret) {
  Write-Error "IRONFRAME_CRON_SECRET missing"
  exit 1
}

$uri = "$base/api/cron/ops-schedule-reminders"
Write-Host "POST $uri"
$response = Invoke-WebRequest -Uri $uri -Method POST -Headers @{ Authorization = "Bearer $secret" } -UseBasicParsing
Write-Host $response.Content
exit 0
