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
ssh -o BatchMode=yes -o ConnectTimeout=15 $HostName "mkdir -p $RemoteDir/data"

# 3. Transfer Files via Tar / SCP
Write-Host "[3/5] Synchronisiere Projekt-Dateien..."
$tarFile = "gunther-deploy.tar.gz"
tar -czf $tarFile --exclude='prisma/*.db' --exclude='prisma/*.db-*' --exclude='prisma/*.sqlite*' dist public products prisma characters package.json package-lock.json
scp -o BatchMode=yes -o ConnectTimeout=15 $tarFile "${HostName}:${RemoteDir}/$tarFile"
ssh -o BatchMode=yes -o ConnectTimeout=15 $HostName "tar -xzf $RemoteDir/$tarFile -C $RemoteDir && rm -f $RemoteDir/$tarFile"
if (Test-Path $tarFile) { Remove-Item -Force $tarFile }

# .env is managed on the server (secrets from KeePass, e.g. ADMIN_API_TOKEN) — never overwrite it.
# Only bootstrap it from the local copy when the server has none yet.
ssh -o BatchMode=yes -o ConnectTimeout=15 $HostName "test -f $RemoteDir/.env"
if ($LASTEXITCODE -ne 0) { scp -o BatchMode=yes -o ConnectTimeout=15 .env "${HostName}:${RemoteDir}/.env" }

# 4. Install production dependencies and sync Prisma on Container
Write-Host "[4/5] Installiere Production-Dependencies und synchronisiere SQLite..."
ssh -o BatchMode=yes -o ConnectTimeout=60 $HostName "bash -c 'cd $RemoteDir; npm ci --omit=dev; npx prisma generate; npx prisma db push'"

# 5. Restart Systemd Service & Verify
Write-Host "[5/5] Starte gunther-core.service neu und verifiziere Healthcheck..."
ssh -o BatchMode=yes -o ConnectTimeout=15 $HostName "systemctl restart gunther-core"

Start-Sleep -Seconds 3
ssh -o BatchMode=yes -o ConnectTimeout=15 $HostName "systemctl status gunther-core --no-pager"
Write-Host "`n--- Health Endpoint Check ---"
ssh -o BatchMode=yes -o ConnectTimeout=15 $HostName "curl -s http://127.0.0.1:3000/health"

Write-Host "`n===================================================="
Write-Host "DEPLOYMENT AUF PROXMOX ERFOLGREICH!"
Write-Host "Landingpage und Healthcheck: http://10.0.1.115:3000"
Write-Host "===================================================="
