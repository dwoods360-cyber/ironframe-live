# Wrapper for Windows Task Scheduler — Ops Schedule reminders at 08:15 local daily.
$ProjectRoot = "C:\Users\Dereck\ironframe-live"
Set-Location $ProjectRoot

& powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$ProjectRoot\bin\cron_ops_schedule_reminders.ps1"
exit $LASTEXITCODE
