<#
  Changia — public-preview launcher

  Starts the backend API, the frontend, and two Cloudflare quick tunnels (one
  for each) so you can share a working copy over the public internet. It also
  patches the git-ignored env files so that:
    * the tunneled frontend is an allowed CORS origin for the API,
    * files the API serves itself (uploads/...) use the public API URL,
    * generated donation/e-mail links use the public frontend URL.

  Run (from the repo root):
    powershell -ExecutionPolicy Bypass -File .\start-preview.ps1          # start
    powershell -ExecutionPolicy Bypass -File .\start-preview.ps1 -Stop    # stop
    powershell -ExecutionPolicy Bypass -File .\start-preview.ps1 -Check   # verify prerequisites
#>

param(
  [switch]$Stop,   # tear down preview processes and tunnels
  [switch]$Check   # verify prerequisites without starting anything
)

$ErrorActionPreference = "Stop"

$root = $PSScriptRoot
$base = Join-Path $env:TEMP "changia-preview"
New-Item -ItemType Directory -Path $base -Force | Out-Null

# Cloudflare quick-tunnel binary.
$cloudflared = "C:\Program Files (x86)\cloudflared\cloudflared.exe"
if (-not (Test-Path $cloudflared)) { $cloudflared = "cloudflared" }

# ─── Small helpers ─────────────────────────────────────────────────────────────
function Get-EnvValue([string]$file, [string]$key, [string]$default) {
  if (-not (Test-Path $file)) { return $default }
  $m = [regex]::Match(
    [System.IO.File]::ReadAllText($file),
    "(?im)^\s*$([regex]::Escape($key))\s*=\s*(.*)$")
  if ($m.Success -and $m.Groups[1].Value) { return $m.Groups[1].Value.Trim() }
  return $default
}

function Set-EnvValue([string]$file, [string]$key, [string]$value) {
  $lines = New-Object System.Collections.Generic.List[string]
  $found = $false
  foreach ($line in [System.IO.File]::ReadAllLines($file)) {
    if ($line -match "(?i)^\s*$([regex]::Escape($key))\s*=") {
      $lines.Add("$key=$value"); $found = $true
    } else { $lines.Add($line) }
  }
  if (-not $found) { $lines.Add("$key=$value") }
  [System.IO.File]::WriteAllLines($file, $lines)
}

function Stop-OnPort([int]$port) {
  Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
    ForEach-Object {
      Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
      Write-Host "  stopped port $port (PID $($_.OwningProcess))"
    }
}

function Get-TunnelUrl([string]$errLog) {
  for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 2
    $m = Select-String -Path $errLog -Pattern "https://[a-z0-9-]+\.trycloudflare\.com" -ErrorAction SilentlyContinue |
      Select-Object -First 1
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

# Backend port comes from Backend/.env (default 5000); frontend is Next on 3000.
$beFile = Join-Path $root "Backend\.env"
$feFile = Join-Path $root "Frontend\.env"
$bePort = [int](Get-EnvValue $beFile "PORT" "5000")
$fePort = 3000
$beLocal = "http://localhost:$bePort"
$feLocal = "http://localhost:$fePort"

# ─── -Stop: tear everything down ─────────────────────────────────────────────
if ($Stop) {
  Write-Host "Stopping preview..."
  Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
  Stop-OnPort $bePort
  Stop-OnPort $fePort
  Write-Host "Preview stopped."
  exit 0
}

# ─── -Check: verify prerequisites (no side-effects) ──────────────────────────
if ($Check) {
  Write-Host ""
  Write-Host "Changia — public-preview preflight check"
  Write-Host "  backend port  : $bePort ($beLocal)"
  Write-Host "  frontend port : $fePort ($feLocal)"
  $ok = $true

  if (Get-Command node -ErrorAction SilentlyContinue) {
    Write-Host "  [ok] node         -> $(node -v)"
  } else { Write-Host "  [fail] node not found on PATH"; $ok = $false }

  if (Get-Command npm -ErrorAction SilentlyContinue) {
    Write-Host "  [ok] npm          -> $(npm -v)"
  } else { Write-Host "  [fail] npm not found on PATH"; $ok = $false }

  if (Test-Path $cloudflared) { Write-Host "  [ok] cloudflared  -> $cloudflared" }
  elseif (Get-Command $cloudflared -ErrorAction SilentlyContinue) { Write-Host "  [ok] cloudflared  -> on PATH" }
  else { Write-Host "  [FAIL] cloudflared not found (looked for: $cloudflared)"; $ok = $false }

  if (Test-Path (Join-Path $root "Backend\node_modules\express")) { Write-Host "  [ok] backend deps" } else { Write-Host "  [FAIL] backend deps missing - run npm install"; $ok = $false }
  if (Test-Path (Join-Path $root "Frontend\node_modules\next")) { Write-Host "  [ok] frontend deps" } else { Write-Host "  [FAIL] frontend deps missing - run npm install"; $ok = $false }
  if (Test-Path $beFile) { Write-Host "  [ok] Backend\.env" } else { Write-Host "  [FAIL] Backend\.env missing"; $ok = $false }
  if (Test-Path $feFile) { Write-Host "  [ok] Frontend\.env" } else { Write-Host "  [FAIL] Frontend\.env missing"; $ok = $false }

  if (Get-NetTCPConnection -LocalPort 3306 -State Listen -ErrorAction SilentlyContinue) { Write-Host "  [ok] MySQL on 3306" }
  else { Write-Host "  [FAIL] MySQL not listening on 3306 (backend requires it)"; $ok = $false }

  Write-Host ""
  if ($ok) { Write-Host "  SUCCESS - environment ready."; exit 0 }
  Write-Host "  Some checks failed - fix them and re-run -Check."; exit 1
}

# ─── Tear down whatever was running before ───────────────────────────────────
Write-Host "Cleaning up previous processes..."
Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Stop-OnPort $bePort
Stop-OnPort $fePort
Start-Sleep -Seconds 2

# ── 1. Start both Cloudflare tunnels first so we know the public URLs before
#     the servers boot with their env vars wired up. ──────────────────────────
Write-Host "== Starting backend tunnel..."
$beTunnelErr = Join-Path $base "be-tunnel.err"
Remove-Item (Join-Path $base "be-tunnel.log"), $beTunnelErr -ErrorAction SilentlyContinue
Start-Process -FilePath $cloudflared -ArgumentList "tunnel", "--url", $beLocal `
  -RedirectStandardOutput (Join-Path $base "be-tunnel.log") `
  -RedirectStandardError $beTunnelErr -WindowStyle Hidden
$beUrl = Get-TunnelUrl $beTunnelErr
Write-Host "  Backend URL: $beUrl"

Write-Host "== Starting frontend tunnel..."
$feTunnelErr = Join-Path $base "fe-tunnel.err"
Remove-Item (Join-Path $base "fe-tunnel.log"), $feTunnelErr -ErrorAction SilentlyContinue
Start-Process -FilePath $cloudflared -ArgumentList "tunnel", "--url", $feLocal `
  -RedirectStandardOutput (Join-Path $base "fe-tunnel.log") `
  -RedirectStandardError $feTunnelErr -WindowStyle Hidden
$feUrl = Get-TunnelUrl $feTunnelErr
Write-Host "  Frontend URL: $feUrl"

# ── 2. Point the backend at its public URLs and allow the public frontend
#        origin through CORS (this is what makes the shareable link actually
#        usable from a browser). Emails/donation links use APP_BASE_URL. ───────
Write-Host "== Patching Backend\.env (API_PUBLIC_URL, APP_BASE_URL, CORS_ORIGINS)..."
Set-EnvValue $beFile "API_PUBLIC_URL" $beUrl
Set-EnvValue $beFile "APP_BASE_URL" $feUrl
$cors = @((Get-EnvValue $beFile "CORS_ORIGINS" "") -split "," | ForEach-Object { $_.Trim() } | Where-Object { $_ })
if ($cors -notcontains $feUrl) { $cors += $feUrl }
Set-EnvValue $beFile "CORS_ORIGINS" ($cors -join ",")
Write-Host "  API_PUBLIC_URL = $beUrl"
Write-Host "  APP_BASE_URL   = $feUrl"
Write-Host "  CORS_ORIGINS   = $(Get-EnvValue $beFile 'CORS_ORIGINS')"

# ── 3. Backend ───────────────────────────────────────────────────────────────
Write-Host "== Starting backend ($beLocal)..."
Remove-Item (Join-Path $base "be.log"), (Join-Path $base "be.err") -ErrorAction SilentlyContinue
Start-Process -FilePath "node" -ArgumentList "server.js" `
  -WorkingDirectory (Join-Path $root "Backend") `
  -RedirectStandardOutput (Join-Path $base "be.log") `
  -RedirectStandardError (Join-Path $base "be.err") -WindowStyle Hidden
if (-not (Wait-For "$beLocal/api/v1/health" 30)) {
  Write-Host "  ! Backend failed to start - see $base\be.err"
  if (Test-Path (Join-Path $base "be.err")) { Get-Content (Join-Path $base "be.err") | Select-Object -Last 20 }
}

# ── 4. Frontend, pointed at the tunneled API ─────────────────────────────────
Write-Host "== Starting frontend..."
Remove-Item (Join-Path $base "fe.log"), (Join-Path $base "fe.err") -ErrorAction SilentlyContinue
$env:NEXT_PUBLIC_API_URL = "$beUrl/api/v1"
Start-Process -FilePath "npm.cmd" -ArgumentList "run", "dev" `
  -WorkingDirectory (Join-Path $root "Frontend") `
  -RedirectStandardOutput (Join-Path $base "fe.log") `
  -RedirectStandardError (Join-Path $base "fe.err") -WindowStyle Hidden
if (-not (Wait-For $feLocal 60)) {
  Write-Host "  ! Frontend failed to start - see $base\fe.log"
}

Write-Host ""
Write-Host "======================================================"
Write-Host " SHARE THIS LINK: $feUrl"
Write-Host "======================================================"
Write-Host "Backend API : $beUrl"
Write-Host "Logs        : $base"
Write-Host ""
Read-Host "Press Enter to close this window (servers keep running)"
