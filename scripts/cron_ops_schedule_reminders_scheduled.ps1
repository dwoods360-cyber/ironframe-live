# Wrapper for Windows Task Scheduler — Ops Schedule reminders at 08:15 local daily.
$ErrorActionPreference = "Stop"
$ProjectRoot = "C:\Users\Dereck\ironframe-live"
Set-Location -LiteralPath $ProjectRoot

$bin = Join-Path $ProjectRoot "bin\cron_ops_schedule_reminders.ps1"
if (-not (Test-Path -LiteralPath $bin)) {
    throw "Missing $bin"
}

& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $bin
exit $LASTEXITCODE
