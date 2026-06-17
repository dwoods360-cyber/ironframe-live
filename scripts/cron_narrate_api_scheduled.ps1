# Wrapper for Windows Task Scheduler — GRC API narrate at 03:30 (after doc engine settles).
# Sequential pipeline: Documentation Engine 03:00 → settle window → this script 03:30.
$ProjectRoot = "C:\Users\Dereck\ironframe-live"
Set-Location $ProjectRoot

& powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$ProjectRoot\bin\cron_narrate.ps1"
exit $LASTEXITCODE
