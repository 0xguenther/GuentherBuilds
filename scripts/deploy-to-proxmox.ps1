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
Write-Host "[1/6] Kompiliere TypeScript..."
npm run build
if ($LASTEXITCODE -ne 0) { throw "Build fehlgeschlagen!" }

# 2. Prepare Remote Directory
Write-Host "[2/6] Bereite Remote-Verzeichnis vor ($RemoteDir)..."
ssh $HostName "mkdir -p $RemoteDir/data"

# 3. Transfer Files via Tar / SSH
Write-Host "[3/6] Synchronisiere Projekt-Dateien..."
tar -czf - dist public products prisma characters package.json package-lock.json | ssh $HostName "tar -xzf - -C $RemoteDir"

# Copy .env securely
scp .env "${HostName}:${RemoteDir}/.env"

# 4. Install production dependencies and sync Prisma on Container
Write-Host "[4/6] Installiere Production-Dependencies und synchronisiere SQLite..."
ssh $HostName "bash -c 'cd $RemoteDir && npm ci --omit=dev && npx prisma generate && npx prisma db push'"

# 5. Setup Systemd Service
Write-Host "[5/6] Konfiguriere Systemd Service (gunther-core.service)..."
$remoteCmd = @"
cat > /etc/systemd/system/gunther-core.service << 'SERVICE_EOF'
[Unit]
Description=Guenther Core - Autonomous AI Entrepreneur
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$RemoteDir
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=HOST=0.0.0.0

[Install]
WantedBy=multi-user.target
SERVICE_EOF
systemctl daemon-reload
systemctl enable --now gunther-core
systemctl restart gunther-core
"@

ssh $HostName "bash -c `"$remoteCmd`""

# 6. Verify Service Status & Health
Write-Host "`n[6/6] Verifiziere Service-Status und Health Endpoint..."
Start-Sleep -Seconds 3
ssh $HostName "bash -c 'systemctl status gunther-core --no-pager && echo --- && curl -s http://127.0.0.1:3000/health'"

Write-Host "`n===================================================="
Write-Host "DEPLOYMENT AUF PROXMOX ERFOLGREICH!"
Write-Host "Landingpage und Healthcheck: http://10.0.1.115:3000"
Write-Host "===================================================="
