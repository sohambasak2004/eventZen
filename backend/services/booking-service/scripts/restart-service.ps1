param(
  [int]$Port = 8082
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$connections = @()
try {
  $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop
} catch {
  $connections = @()
}

$processIds = $connections | Select-Object -ExpandProperty OwningProcess -Unique
foreach ($processId in $processIds) {
  if ($processId -eq 4) {
    throw "Port $Port is owned by PID 4 (System/HTTP.sys). Stop the owning service before restarting booking-service."
  }

  $proc = Get-Process -Id $processId -ErrorAction SilentlyContinue
  if ($null -eq $proc) {
    continue
  }

  Write-Output ("Stopping PID {0} ({1}) on port {2}..." -f $processId, $proc.ProcessName, $Port)
  Stop-Process -Id $processId -Force
}

Write-Output ("Starting booking-service on http://localhost:{0}" -f $Port)
dotnet run
