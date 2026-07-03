# Foreground IronBoard dev - Ctrl+C stops node AND releases port 8082.
$ErrorActionPreference = "Continue"
$ScriptDir = $PSScriptRoot
$Root = Resolve-Path (Join-Path $ScriptDir "..")
Set-Location $Root

function Stop-IronboardListener {
  & (Join-Path $ScriptDir "stop-board.ps1")
}

Stop-IronboardListener
$port = if ($env:PORT) { $env:PORT } else { 8082 }
Write-Host "[IRONBOARD] Starting on http://127.0.0.1:$port/ - press Ctrl+C to stop."
Write-Host "[IRONBOARD] If port sticks after Ctrl+C, run: npm run stop"
Write-Host ""

try {
  & node --import tsx src/index.ts
  $code = if ($null -ne $LASTEXITCODE) { $LASTEXITCODE } else { 0 }
} catch {
  $code = 1
} finally {
  Stop-IronboardListener
}

exit $code
