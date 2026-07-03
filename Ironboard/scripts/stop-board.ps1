# Stop IronBoard — release port 8082 when Ctrl+C leaves a listener behind (Windows + SSE).
param(
  [int]$Port = $(if ($env:PORT) { [int]$env:PORT } else { 8082 })
)

function Get-ListenerPids([int]$ListenPort) {
  $pids = [System.Collections.Generic.HashSet[int]]::new()
  # Get-NetTCPConnection can hang on some Windows builds — netstat is reliable here.
  $escaped = [regex]::Escape(":$ListenPort")
  netstat -ano | ForEach-Object {
    $line = $_.Trim()
    if ($line -notmatch 'LISTENING') { return }
    if ($line -notmatch $escaped) { return }
    if ($line -match '\s+(\d+)\s*$') {
      [void]$pids.Add([int]$Matches[1])
    }
  }
  return @($pids)
}

$targetPids = Get-ListenerPids -ListenPort $Port
if (-not $targetPids -or $targetPids.Count -eq 0) {
  Write-Host "[IRONBOARD] No process listening on port $Port."
  exit 0
}

foreach ($procId in $targetPids) {
  if ($procId -le 0) { continue }
  try {
    $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
    if (-not $proc) { continue }
    Stop-Process -Id $procId -Force -ErrorAction Stop
    Write-Host "[IRONBOARD] Stopped PID $procId ($($proc.ProcessName)) on port $Port."
  } catch {
    Write-Host "[IRONBOARD] Could not stop PID $procId : $_"
  }
}

exit 0
