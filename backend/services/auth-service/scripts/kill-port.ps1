param(
  [Parameter(Mandatory = $true)]
  [int]$Port,
  [switch]$Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$connections = @()
try {
  $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop
} catch {
  Write-Output "No LISTEN process found on port $Port."
  exit 0
}

$pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
foreach ($pid in $pids) {
  $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
  if ($null -eq $proc) {
    Write-Output "PID $pid is listening on $Port but process details are unavailable."
    continue
  }

  $path = $null
  try { $path = $proc.Path } catch { }

  Write-Output ("Port {0} is in use by PID {1} ({2}) {3}" -f $Port, $pid, $proc.ProcessName, ($path ?? ""))

  if (-not $Force) {
    $answer = Read-Host "Stop PID $pid? (y/N)"
    if ($answer -notin @("y", "Y")) {
      Write-Output "Skipped PID $pid."
      continue
    }
  }

  Stop-Process -Id $pid -Force
  Write-Output "Stopped PID $pid."
}

