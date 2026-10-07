# =============================================================================
# deploy-to-proxmox.ps1 — Automatisches Deployment von Günther Core auf CT 115
# =============================================================================
param(
  [string]$HostName = "gunther",
  [string]$RemoteDir = "/opt/gunther-core"
)

$ErrorActionPreference = 'Stop'

Write-Host "===================================================="
Write-Host "GÜNTHER CORE — PROXMOX DEPLOYMENT (CT 115)"
Write-Host "====================================================`n"

# 1. Build TypeScript locally
Write-Host "[1/5] Kompiliere TypeScript lokal..."
npm run build
if ($LASTEXITCODE -ne 0) { throw "Build fehlgeschlagen!" }

# 2. Prepare Remote Directory
Write-Host "[2/5] Bereite Remote-Verzeichnis vor ($RemoteDir)..."
ssh $HostName "mkdir -p $RemoteDir/data"

# 3. Transfer Files via Tar / SSH
Write-Host "[3/5] Synchronisiere Projekt-Dateien..."
tar -czf - --exclude='prisma/*.db' --exclude='prisma/*.db-*' --exclude='prisma/*.sqlite*' dist public products prisma characters package.json package-lock.json | ssh $HostName "tar -xzf - -C $RemoteDir"

# .env is managed on the server (secrets from KeePass, e.g. ADMIN_API_TOKEN) — never overwrite it.
# Only bootstrap it from the local copy when the server has none yet.
ssh $HostName "test -f $RemoteDir/.env"
if ($LASTEXITCODE -ne 0) { scp .env "${HostName}:${RemoteDir}/.env" }

# 4. Install production dependencies and sync Prisma on Container
Write-Host "[4/5] Installiere Production-Dependencies und synchronisiere SQLite..."
ssh $HostName "bash -c 'cd $RemoteDir; npm ci --omit=dev; npx prisma generate; npx prisma db push'"

# 5. Restart Systemd Service & Verify
Write-Host "[5/5] Starte gunther-core.service neu und verifiziere Healthcheck..."
ssh $HostName "systemctl restart gunther-core"

Start-Sleep -Seconds 3
ssh $HostName "systemctl status gunther-core --no-pager"
Write-Host "`n--- Health Endpoint Check ---"
ssh $HostName "curl -s http://127.0.0.1:3000/health"

Write-Host "`n===================================================="
Write-Host "DEPLOYMENT AUF PROXMOX ERFOLGREICH!"
Write-Host "Landingpage und Healthcheck: http://10.0.1.115:3000"
Write-Host "===================================================="
