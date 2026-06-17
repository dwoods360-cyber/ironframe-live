# Register staggered nightly cron tasks (requires elevated shell or user task rights).
#   03:00 local — Documentation Engine (git delta, glossary, OSINT, governance memo)
#   03:30 local — GRC Narrative Hydration (POST /api/cron/narrate → Postgres + briefing-queue draft)
#
# Usage (elevated PowerShell):
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\register-nightly-cron-tasks.ps1
#
# Optional: -ProjectRoot "D:\path\to\ironframe-live"

param(
    [string]$ProjectRoot = "C:\Users\Dereck\ironframe-live"
)

$ErrorActionPreference = "Stop"

$DocTaskName = "\Ironframe Daily Documentation Engine"
$ApiTaskName = "\Ironframe GRC Narrative Hydration"

$DocScript = Join-Path $ProjectRoot "scripts\cron_narrate_scheduled.ps1"
$ApiScript = Join-Path $ProjectRoot "scripts\cron_narrate_api_scheduled.ps1"

foreach ($path in @($DocScript, $ApiScript)) {
    if (-not (Test-Path -LiteralPath $path)) {
        throw "Missing script: $path"
    }
}

function Register-DailyTask {
    param(
        [string]$TaskName,
        [string]$ScriptPath,
        [string]$StartTime
    )

    $action = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$ScriptPath`""
    schtasks /Create /F /TN $TaskName /TR $action /SC DAILY /ST $StartTime /RL LIMITED | Out-Null
    Write-Host "Registered $TaskName at $StartTime local -> $ScriptPath"
}

Register-DailyTask -TaskName $DocTaskName -ScriptPath $DocScript -StartTime "03:00"
Register-DailyTask -TaskName $ApiTaskName -ScriptPath $ApiScript -StartTime "03:30"

Write-Host ""
Write-Host "Staggered pipeline:"
Write-Host "  03:00  Doc engine (filesystem + glossary sync)"
Write-Host "  03:30  API narrate (telemetry snapshot, exposure thresholds, briefing-queue draft)"
Write-Host ""
Write-Host "Vercel production uses UTC: ironwatch 03:00, narrate 03:30 (vercel.json)."
Write-Host "Verify: schtasks /Query /TN `"$DocTaskName`" /FO LIST"
Write-Host "Verify: schtasks /Query /TN `"$ApiTaskName`" /FO LIST"
