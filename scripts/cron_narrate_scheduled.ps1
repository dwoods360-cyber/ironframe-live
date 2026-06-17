# Wrapper for Windows Task Scheduler — Documentation Engine only (03:00 local).
# GRC API narrate runs separately at 03:30 via scripts/cron_narrate_api_scheduled.ps1.
$ProjectRoot = "C:\Users\Dereck\ironframe-live"
Set-Location $ProjectRoot

$agentRoot = Join-Path $env:LOCALAPPDATA "cursor-agent"
if (Test-Path -LiteralPath $agentRoot) {
    $env:Path = "$agentRoot;$env:Path"
}

& powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$ProjectRoot\scripts\cron_narrate.ps1"
exit $LASTEXITCODE
