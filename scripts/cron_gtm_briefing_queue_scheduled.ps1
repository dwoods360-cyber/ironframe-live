# Wrapper for Windows Task Scheduler — autonomous GTM briefing/newsletter queue at 04:00 weekdays.
# Drafts land in docs/briefing-queue/ for Ops Hub review (promote = approve, deny = discard).
$ProjectRoot = "C:\Users\Dereck\ironframe-live"
Set-Location $ProjectRoot

& powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$ProjectRoot\bin\cron_gtm_briefing_queue.ps1"
exit $LASTEXITCODE
