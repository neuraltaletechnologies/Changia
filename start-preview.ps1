<#
  Changia — public-preview launcher

  Opens ONE visible window running the turbo TUI with four switchable panes:

      changia-api#tunnel        cloudflare quick tunnel  ->  backend  (:5000)
      changia#tunnel            cloudflare quick tunnel  ->  frontend (:3000)
      changia-api#dev:preview   backend API, pointed at the public URLs
      changia#dev:preview       frontend, pointed at the public API URL

  The tunnel panes come up first and publish their URLs to .preview\*.url; the
  dev:preview panes wait for those files and then boot the servers with the
  public URLs injected into their environment (API_PUBLIC_URL, APP_BASE_URL,
  CORS_ORIGINS for the API; NEXT_PUBLIC_API_URL for the frontend). No .env file
  is modified.

  Switch panes in the turbo window with the arrow keys / mouse; press Ctrl-C
  there (or run this script with -Stop) to tear everything down.

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
$previewDir = Join-Path $root ".preview"

# Cloudflare quick-tunnel binary (matches scripts\tunnel.js).
$cloudflared = "C:\Program Files (x86)\cloudflared\cloudflared.exe"
if (-not (Test-Path $cloudflared)) { $cloudflared = "cloudflared" }

$bePort = 5000
$fePort = 3000
$beLocal = "http://localhost:$bePort"
$feLocal = "http://localhost:$fePort"

# ─── Small helpers ─────────────────────────────────────────────────────────────
function Stop-OnPort([int]$port) {
  Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
    ForEach-Object {
      Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
      Write-Host "  stopped port $port (PID $($_.OwningProcess))"
    }
}

function Wait-ForFile([string]$path, [int]$tries) {
  for ($i = 0; $i -lt $tries; $i++) {
    if (Test-Path $path) {
      $v = (Get-Content $path -Raw -ErrorAction SilentlyContinue).Trim()
      if ($v) { return $v }
    }
    Start-Sleep -Seconds 2
  }
  return $null
}

function Wait-For([string]$url, [int]$tries) {
  for ($i = 0; $i -lt $tries; $i++) {
    try {
      $r = Invoke-WebRequest $url -UseBasicParsing -TimeoutSec 3
      if ($r.StatusCode -eq 200) { return $true }
    } catch {}
    Start-Sleep -Seconds 2
  }
  return $false
}

# ─── -Stop: tear everything down ────────────────────────────────────────────────
if ($Stop) {
  Write-Host "Stopping preview..."
  Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
  # turbo / next / node --watch children keep the ports; killing the ports frees them.
  Stop-OnPort $bePort
  Stop-OnPort $fePort
  Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -match "preview-run\.js|scripts[\\/]tunnel\.js|turbo" } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  Remove-Item (Join-Path $previewDir "*.url") -ErrorAction SilentlyContinue
  Write-Host "Preview stopped."
  exit 0
}

# ─── -Check: verify prerequisites (no side-effects) ─────────────────────────────
if ($Check) {
  Write-Host ""
  Write-Host "Changia — public-preview preflight check"
  Write-Host "  backend port  : $bePort ($beLocal)"
  Write-Host "  frontend port : $fePort ($feLocal)"
  $ok = $true

  if (Get-Command node -ErrorAction SilentlyContinue) {
    Write-Host "  [ok] node         -> $(node -v)"
  } else { Write-Host "  [FAIL] node not found on PATH"; $ok = $false }

  if (Get-Command pnpm -ErrorAction SilentlyContinue) {
    Write-Host "  [ok] pnpm         -> $(pnpm -v)"
  } else { Write-Host "  [FAIL] pnpm not found on PATH (npm i -g pnpm)"; $ok = $false }

  if (Test-Path (Join-Path $root "node_modules\turbo")) {
    Write-Host "  [ok] turbo        -> root node_modules"
  } else { Write-Host "  [FAIL] turbo missing - run pnpm install in the repo root"; $ok = $false }

  if (Test-Path $cloudflared) { Write-Host "  [ok] cloudflared  -> $cloudflared" }
  elseif (Get-Command $cloudflared -ErrorAction SilentlyContinue) { Write-Host "  [ok] cloudflared  -> on PATH" }
  else { Write-Host "  [FAIL] cloudflared not found (winget install --id Cloudflare.cloudflared)"; $ok = $false }

  if (Test-Path (Join-Path $root "Backend\node_modules\express")) { Write-Host "  [ok] backend deps" } else { Write-Host "  [FAIL] backend deps missing - run pnpm install"; $ok = $false }
  if (Test-Path (Join-Path $root "Frontend\node_modules\next")) { Write-Host "  [ok] frontend deps" } else { Write-Host "  [FAIL] frontend deps missing - run pnpm install"; $ok = $false }
  if (Test-Path (Join-Path $root "Backend\.env")) { Write-Host "  [ok] Backend\.env" } else { Write-Host "  [warn] Backend\.env missing - config.js dev defaults will be used" }

  if (Get-NetTCPConnection -LocalPort 3306 -State Listen -ErrorAction SilentlyContinue) { Write-Host "  [ok] MySQL on 3306" }
  else { Write-Host "  [FAIL] MySQL not listening on 3306 (backend requires it)"; $ok = $false }

  Write-Host ""
  if ($ok) { Write-Host "  SUCCESS - environment ready. Run .\start-preview.ps1"; exit 0 }
  Write-Host "  Some checks failed - fix them and re-run -Check."; exit 1
}

# ─── Tear down whatever was running before ──────────────────────────────────────
Write-Host "Cleaning up previous processes..."
Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Stop-OnPort $bePort
Stop-OnPort $fePort
New-Item -ItemType Directory -Path $previewDir -Force | Out-Null
Remove-Item (Join-Path $previewDir "*.url") -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# ─── Launch the turbo TUI in its own visible window ─────────────────────────────
Write-Host "== Launching turbo preview (tunnels + servers) in a new window..."
$shell = if (Get-Command pwsh -ErrorAction SilentlyContinue) { "pwsh" } else { "powershell" }
Start-Process -FilePath $shell `
  -ArgumentList "-NoExit", "-Command", "Set-Location '$root'; pnpm run preview" `
  -WorkingDirectory $root

# ─── Wait for the tunnels + servers, then print the shareable link ──────────────
Write-Host "== Waiting for cloudflare tunnels..."
$beUrl = Wait-ForFile (Join-Path $previewDir "api.url") 45
$feUrl = Wait-ForFile (Join-Path $previewDir "web.url") 45
if (-not $beUrl -or -not $feUrl) {
  Write-Host "  ! Tunnels did not come up in time - check the turbo window (tunnel panes)."
  exit 1
}
Write-Host "  Backend URL : $beUrl"
Write-Host "  Frontend URL: $feUrl"

Write-Host "== Waiting for backend health check..."
if (-not (Wait-For "$beLocal/api/v1/health" 45)) {
  Write-Host "  ! Backend not healthy yet - check the changia-api#dev:preview pane."
}
Write-Host "== Waiting for frontend..."
if (-not (Wait-For $feLocal 60)) {
  Write-Host "  ! Frontend not up yet - check the changia#dev:preview pane."
}

Write-Host ""
Write-Host "======================================================"
Write-Host " SHARE THIS LINK: $feUrl"
Write-Host "======================================================"
Write-Host "Backend API : $beUrl"
Write-Host "Turbo TUI   : the new window (arrow keys / mouse to switch panes)"
Write-Host "Stop        : Ctrl-C in that window, or .\start-preview.ps1 -Stop"
Write-Host ""
Read-Host "Press Enter to close THIS window (the preview keeps running)"
