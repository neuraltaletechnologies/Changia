# Changia public-preview launcher
# Starts backend tunnel -> backend -> frontend -> frontend tunnel, then prints
# the shareable link. Run with `-Stop` to shut everything down.
#
#   powershell -ExecutionPolicy Bypass -File .\start-preview.ps1        # start
#   powershell -ExecutionPolicy Bypass -File .\start-preview.ps1 -Stop  # stop

param(
  [switch]$Stop
)

$ErrorActionPreference = "Stop"

$root = $PSScriptRoot
$base = Join-Path $env:TEMP "changia-preview"
New-Item -ItemType Directory -Path $base -Force | Out-Null

$cloudflared = "C:\Program Files (x86)\cloudflared\cloudflared.exe"
if (-not (Test-Path $cloudflared)) { $cloudflared = "cloudflared" }

function Stop-OnPort([int]$port) {
  Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
    ForEach-Object {
      Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
      Write-Host "  stopped port $port (PID $($_.OwningProcess))"
    }
}

if ($Stop) {
  Write-Host "Stopping preview..."
  Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
  Stop-OnPort 3000
  Stop-OnPort 5000
  Write-Host "Preview stopped."
  exit 0
}

# ─── Tear down whatever was running before ───────────────────────────────────
Write-Host "Cleaning up previous processes..."
Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Stop-OnPort 3000
Stop-OnPort 5000
Start-Sleep -Seconds 2

function Get-TunnelUrl([string]$errLog) {
  for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 2
    $m = Select-String -Path $errLog -Pattern "https://[a-z0-9-]+\.trycloudflare\.com" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($m -and $m.Matches.Count -gt 0) { return $m.Matches[0].Value }
  }
  throw "Tunnel URL not found in $errLog"
}

function Wait-For([string]$url, [int]$tries) {
  for ($i = 0; $i -lt $tries; $i++) {
    Start-Sleep -Seconds 2
    try {
      $r = Invoke-WebRequest $url -UseBasicParsing -TimeoutSec 3
      if ($r.StatusCode -eq 200) { return $true }
    } catch {}
  }
  return $false
}

# ─── 1. Backend tunnel ───────────────────────────────────────────────────────
Write-Host "== Starting backend tunnel..."
$beTunnelErr = Join-Path $base "be-tunnel.err"
Remove-Item (Join-Path $base "be-tunnel.log"), $beTunnelErr -ErrorAction SilentlyContinue
Start-Process -FilePath $cloudflared -ArgumentList "tunnel", "--url", "http://localhost:5000" `
  -RedirectStandardOutput (Join-Path $base "be-tunnel.log") `
  -RedirectStandardError $beTunnelErr -WindowStyle Hidden
$beUrl = Get-TunnelUrl $beTunnelErr
Write-Host "  Backend URL: $beUrl"

# ─── 2. Point backend config at its own public URL ───────────────────────────
$envFile = Join-Path $root "Backend\.env"
$content = [System.IO.File]::ReadAllText($envFile)
if ($content -match "(?m)^API_PUBLIC_URL=.*$") {
  $content = [regex]::Replace($content, "(?m)^API_PUBLIC_URL=.*$", "API_PUBLIC_URL=$beUrl")
} else {
  $content = $content.TrimEnd("`r", "`n") + "`r`nAPI_PUBLIC_URL=$beUrl`r`n"
}
[System.IO.File]::WriteAllText($envFile, $content)
Write-Host "  Updated Backend\.env API_PUBLIC_URL"

# ─── 3. Backend ──────────────────────────────────────────────────────────────
Write-Host "== Starting backend..."
Remove-Item (Join-Path $base "be.log"), (Join-Path $base "be.err") -ErrorAction SilentlyContinue
Start-Process -FilePath "node" -ArgumentList "server.js" `
  -WorkingDirectory (Join-Path $root "Backend") `
  -RedirectStandardOutput (Join-Path $base "be.log") `
  -RedirectStandardError (Join-Path $base "be.err") -WindowStyle Hidden
if (-not (Wait-For "http://localhost:5000/api/v1/health" 30)) {
  Write-Host "  ! Backend failed to start - see $base\be.err"; Get-Content (Join-Path $base "be.err") | Select-Object -Last 20
}

# ─── 4. Frontend (pointed at the tunneled API) ───────────────────────────────
Write-Host "== Starting frontend..."
Remove-Item (Join-Path $base "fe.log"), (Join-Path $base "fe.err") -ErrorAction SilentlyContinue
$env:NEXT_PUBLIC_API_URL = "$beUrl/api/v1"
Start-Process -FilePath "npm.cmd" -ArgumentList "run", "dev" `
  -WorkingDirectory (Join-Path $root "Frontend") `
  -RedirectStandardOutput (Join-Path $base "fe.log") `
  -RedirectStandardError (Join-Path $base "fe.err") -WindowStyle Hidden
if (-not (Wait-For "http://localhost:3000" 60)) {
  Write-Host "  ! Frontend failed to start - see $base\fe.log"
}

# ─── 5. Frontend tunnel ──────────────────────────────────────────────────────
Write-Host "== Starting frontend tunnel..."
$feTunnelErr = Join-Path $base "fe-tunnel.err"
Remove-Item (Join-Path $base "fe-tunnel.log"), $feTunnelErr -ErrorAction SilentlyContinue
Start-Process -FilePath $cloudflared -ArgumentList "tunnel", "--url", "http://localhost:3000" `
  -RedirectStandardOutput (Join-Path $base "fe-tunnel.log") `
  -RedirectStandardError $feTunnelErr -WindowStyle Hidden
$feUrl = Get-TunnelUrl $feTunnelErr

Write-Host ""
Write-Host "======================================================"
Write-Host " SHARE THIS LINK: $feUrl"
Write-Host "======================================================"
Write-Host "Backend API : $beUrl"
Write-Host "Logs        : $base"
Write-Host ""
Read-Host "Press Enter to close this window (servers keep running)"