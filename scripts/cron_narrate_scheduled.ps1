# Wrapper for Windows Task Scheduler — ensures PATH, cwd, and env before nightly cron.
$ProjectRoot = "C:\Users\Dereck\ironframe-live"
Set-Location $ProjectRoot

$agentRoot = Join-Path $env:LOCALAPPDATA "cursor-agent"
if (Test-Path -LiteralPath $agentRoot) {
    $env:Path = "$agentRoot;$env:Path"
}

& powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$ProjectRoot\scripts\cron_narrate.ps1"
exit $LASTEXITCODE
