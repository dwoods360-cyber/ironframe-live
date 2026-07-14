# Register staggered nightly cron tasks (requires elevated shell or user task rights).
#   03:00 local — Documentation Engine (git delta, glossary, OSINT, governance memo)
#   03:30 local — GRC Narrative Hydration (POST /api/cron/narrate → Postgres + telemetry queue draft)
#   04:00 local (Mon–Fri) — Autonomous GTM briefing + newsletter → docs/briefing-queue/ (no publish)
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
$GtmTaskName = "\Ironframe GTM Briefing Queue"

$DocScript = Join-Path $ProjectRoot "scripts\cron_narrate_scheduled.ps1"
$ApiScript = Join-Path $ProjectRoot "scripts\cron_narrate_api_scheduled.ps1"
$GtmScript = Join-Path $ProjectRoot "scripts\cron_gtm_briefing_queue_scheduled.ps1"

foreach ($path in @($DocScript, $ApiScript, $GtmScript)) {
    if (-not (Test-Path -LiteralPath $path)) {
        throw "Missing script: $path"
    }
}

function Register-DailyTask {
    param(
        [string]$TaskName,
        [string]$ScriptPath,
        [string]$StartTime,
        [string]$DaysOfWeek = ""
    )

    $action = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$ScriptPath`""
    if ($DaysOfWeek) {
        schtasks /Create /F /TN $TaskName /TR $action /SC WEEKLY /D $DaysOfWeek /ST $StartTime /RL LIMITED | Out-Null
    } else {
        schtasks /Create /F /TN $TaskName /TR $action /SC DAILY /ST $StartTime /RL LIMITED | Out-Null
    }
    Write-Host "Registered $TaskName at $StartTime local -> $ScriptPath"
}

Register-DailyTask -TaskName $DocTaskName -ScriptPath $DocScript -StartTime "03:00"
Register-DailyTask -TaskName $ApiTaskName -ScriptPath $ApiScript -StartTime "03:30"
Register-DailyTask -TaskName $GtmTaskName -ScriptPath $GtmScript -StartTime "04:00" -DaysOfWeek "MON,TUE,WED,THU,FRI"

Write-Host ""
Write-Host "Staggered pipeline:"
Write-Host "  03:00  Doc engine (filesystem + glossary sync)"
Write-Host "  03:30  API narrate (telemetry snapshot + optional queue draft)"
Write-Host "  04:00  GTM briefing queue (autonomous public drafts - quarantine only; Ops Hub approve/deny)"
Write-Host ""
Write-Host "Vercel: narrate 03:30 UTC, gtm-briefing-queue weekdays 04:00 UTC (vercel.json)."
Write-Host "Prefer local Core for GTM queue so docs/briefing-queue/ persists in this repo."
Write-Host "Verify: schtasks /Query /TN `"$GtmTaskName`" /FO LIST"
