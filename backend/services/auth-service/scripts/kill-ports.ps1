param(
  [int[]]$Ports = @(8081, 8082, 8083),
  [switch]$Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ($Ports.Count -eq 0) {
  Write-Output "No ports provided."
  exit 1
}

foreach ($port in $Ports | Select-Object -Unique) {
  Write-Output ("=== Port {0} ===" -f $port)

  $connections = @()
  try {
    $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction Stop
  } catch {
    Write-Output ("No LISTEN process found on port {0}." -f $port)
    continue
  }

  $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
  foreach ($pid in $pids) {
    if ($pid -eq 4) {
      Write-Output ("Port {0} is owned by PID 4 (System/HTTP.sys). Stop the binding via the owning service (IIS/Docker/HTTP.sys), not by killing a normal process." -f $port)
      continue
    }

    $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
    if ($null -eq $proc) {
      Write-Output ("PID {0} is listening on {1} but process details are unavailable." -f $pid, $port)
      continue
    }

    $path = $null
    try { $path = $proc.Path } catch { }
    Write-Output ("Port {0} -> PID {1} ({2}) {3}" -f $port, $pid, $proc.ProcessName, ($path ?? ""))

    if (-not $Force) {
      $answer = Read-Host ("Stop PID {0}? (y/N)" -f $pid)
      if ($answer -notin @("y", "Y")) {
        Write-Output ("Skipped PID {0}." -f $pid)
        continue
      }
    }

    Stop-Process -Id $pid -Force
    Write-Output ("Stopped PID {0}." -f $pid)
  }

  Start-Sleep -Milliseconds 200
  $stillListening = $false
  try {
    $stillListening = (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction Stop | Measure-Object).Count -gt 0
  } catch { }

  if ($stillListening) {
    Write-Output ("Port {0} is still listening (might be auto-restarting). Re-check with: netstat -aon | findstr \":{0}\"" -f $port)
  } else {
    Write-Output ("Port {0} is free." -f $port)
  }
}

