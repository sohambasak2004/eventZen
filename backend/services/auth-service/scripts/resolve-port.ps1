param(
  [int]$StartPort = 8081,
  [int]$EndPort = 8099,
  [switch]$WriteEnv
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Test-PortFree {
  param([int]$Port)
  $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
  try {
    $listener.Start()
    return $true
  } catch {
    return $false
  } finally {
    try { $listener.Stop() } catch { }
  }
}

function Set-OrReplaceLine {
  param(
    [string]$Path,
    [string]$Key,
    [string]$Value,
    [switch]$InsertTop
  )
  if (!(Test-Path $Path)) { throw "File not found: $Path" }

  $lines = Get-Content -LiteralPath $Path
  $pattern = "^\s*{0}\s*=" -f [regex]::Escape($Key)
  $newLine = "$Key=$Value"

  $found = $false
  for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match $pattern) {
      $lines[$i] = $newLine
      $found = $true
      break
    }
  }

  if (-not $found) {
    if ($InsertTop) {
      $lines = @($newLine, "") + $lines
    } else {
      $lines = $lines + @("", $newLine)
    }
  }

  Set-Content -LiteralPath $Path -Value $lines -Encoding utf8
}

if ($EndPort -lt $StartPort) { throw "EndPort must be >= StartPort" }

$chosen = $null
for ($p = $StartPort; $p -le $EndPort; $p++) {
  if (Test-PortFree -Port $p) {
    $chosen = $p
    break
  }
}

if ($null -eq $chosen) {
  throw "No free port found in range $StartPort-$EndPort"
}

Write-Output $chosen

if ($WriteEnv) {
  $authEnvPath = Resolve-Path (Join-Path $PSScriptRoot "..\\.env")
  Set-OrReplaceLine -Path $authEnvPath -Key "SERVER_PORT" -Value $chosen -InsertTop

  $frontendEnvPath = Join-Path $PSScriptRoot "..\\..\\..\\..\\frontend\\.env"
  $frontendEnvPath = Resolve-Path $frontendEnvPath
  Set-OrReplaceLine -Path $frontendEnvPath -Key "VITE_AUTH_API_URL" -Value ("http://localhost:{0}" -f $chosen)

  Write-Output ("Updated {0} and {1}" -f $authEnvPath, $frontendEnvPath)
}

