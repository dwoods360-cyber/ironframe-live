# Start perimeter poll workers (:8082–:8086) in separate windows.
# Run the control plane separately: npm run dev (:3000)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

function Start-WorkerWindow($title, $command) {
  Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$root'; Write-Host '[$title]'; $command"
  ) | Out-Null
}

Write-Host "Starting perimeter workforce workers..."
Write-Host "Control plane: run 'npm run dev' in this repo root (:3000)"

Start-WorkerWindow "Ironboard :8082" "npm run ironboard:dev"
Start-Sleep -Seconds 1
Start-WorkerWindow "Ironleads :8083" "npm run ironleads:dev"
Start-Sleep -Seconds 1
Start-WorkerWindow "SalesTeam :8084" "npm run salesteam:dev"
Start-Sleep -Seconds 1
Start-WorkerWindow "IronSuccessTeam :8085" "npm run successteam:dev"
Start-Sleep -Seconds 1
Start-WorkerWindow "IronSupportTeam :8086" "npm run supportteam:dev"

Write-Host ""
Write-Host "Optional poll loops (run in additional terminals):"
Write-Host "  npm run salesteam:poll"
Write-Host "  npm run successteam:poll"
Write-Host "  npm run supportteam:poll"
Write-Host ""
Write-Host "Ops Hub: http://127.0.0.1:3000/dashboard/operations (GLOBAL_ADMIN or BUSINESS_ADMIN)"
