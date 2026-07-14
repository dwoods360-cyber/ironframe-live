# bin/cron_gtm_briefing_queue.ps1 — POST /api/cron/gtm-briefing-queue (weekdays 04:00 local).
# Stages autonomous briefing + newsletter drafts into docs/briefing-queue/ — never publishes.
$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

$LogDir = Join-Path $ProjectRoot "logs"
if (-not (Test-Path -LiteralPath $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}
$LogFile = Join-Path $LogDir "cron_gtm_briefing_queue_log.txt"

function Log-Message {
    param([string]$Message)
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "[$Timestamp] $Message" | Out-File -FilePath $LogFile -Append -Encoding utf8
}

function Import-ProjectDotEnv {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) { return }
    Get-Content -LiteralPath $Path -Encoding UTF8 | ForEach-Object {
        $line = $_.Trim()
        if (-not $line -or $line.StartsWith("#") -or -not $line.Contains("=")) { return }
        $eq = $line.IndexOf("=")
        $key = $line.Substring(0, $eq).Trim()
        $value = $line.Substring($eq + 1).Trim()
        if (
            ($value.StartsWith('"') -and $value.EndsWith('"')) -or
            ($value.StartsWith("'") -and $value.EndsWith("'"))
        ) {
            $value = $value.Substring(1, $value.Length - 2)
        }
        if ($key -and -not [string]::IsNullOrWhiteSpace($value)) {
            Set-Item -Path "env:$key" -Value $value
        }
    }
}

Import-ProjectDotEnv (Join-Path $ProjectRoot ".env.local")
Import-ProjectDotEnv (Join-Path $ProjectRoot ".env")

Log-Message "Starting weekday GTM briefing-queue autonomous authorship (quarantine only)."

try {
    $CronSecret = $env:IRONFRAME_CRON_SECRET
    if (-not $CronSecret) {
        throw "Execution Aborted: IRONFRAME_CRON_SECRET environment variable is missing."
    }

    # Prefer local Core so drafts persist under docs/briefing-queue/ in this repo.
    $CoreOrigin = $env:IRONFRAME_LOCAL_CORE_ORIGIN
    if (-not $CoreOrigin) {
        $CoreOrigin = "http://127.0.0.1:3000"
    }
    $CoreOrigin = $CoreOrigin.TrimEnd("/")

    $Headers = @{
        "Authorization" = "Bearer $CronSecret"
        "Content-Type"  = "application/json"
    }

    $Response = Invoke-RestMethod `
        -Uri "$CoreOrigin/api/cron/gtm-briefing-queue" `
        -Method Post `
        -Headers $Headers `
        -TimeoutSec 300

    Log-Message (
        "Success: topic=" + $Response.topicId +
        " staged=" + (($Response.staged) -join ",") +
        " skipped=" + $Response.skipped +
        " artifactId=" + $Response.artifactId
    )
    exit 0
}
catch {
    Log-Message "CRITICAL FAULT: $_"
    exit 1
}
