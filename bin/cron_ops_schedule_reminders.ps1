# bin/cron_ops_schedule_reminders.ps1 — POST /api/cron/ops-schedule-reminders (08:15 local).
$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

$LogDir = Join-Path $ProjectRoot "logs"
if (-not (Test-Path -LiteralPath $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}
$LogFile = Join-Path $LogDir "cron_ops_schedule_reminders_log.txt"

function Log-Message {
    param([string]$Message)
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "[$Timestamp] $Message" | Out-File -FilePath $LogFile -Append -Encoding utf8
    Write-Host $Message
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

Log-Message "Starting Ops Schedule reminders (T-3/T-2/T-1/T-0)."

try {
    $CronSecret = $env:IRONFRAME_CRON_SECRET
    if (-not $CronSecret) {
        throw "IRONFRAME_CRON_SECRET missing - set it in .env.local."
    }

    $base = if ($env:IRONFRAME_CORE_ORIGIN) {
        $env:IRONFRAME_CORE_ORIGIN.TrimEnd('/')
    } elseif ($env:IRONFRAME_LOCAL_CORE_ORIGIN) {
        $env:IRONFRAME_LOCAL_CORE_ORIGIN.TrimEnd('/')
    } else {
        "http://127.0.0.1:3000"
    }

    $uri = "$base/api/cron/ops-schedule-reminders"
    Log-Message "POST $uri"

    $response = Invoke-WebRequest -Uri $uri -Method POST -Headers @{
        Authorization = "Bearer $CronSecret"
    } -UseBasicParsing -TimeoutSec 120

    $body = $response.Content
    Log-Message "HTTP $($response.StatusCode) $body"

    if ($response.StatusCode -lt 200 -or $response.StatusCode -ge 300) {
        throw "Unexpected HTTP status $($response.StatusCode)"
    }

    Log-Message "Ops Schedule reminders complete."
    exit 0
}
catch {
    Log-Message "ERROR: $($_.Exception.Message)"
    exit 1
}
