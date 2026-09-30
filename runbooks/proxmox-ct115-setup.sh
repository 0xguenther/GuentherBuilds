#!/usr/bin/env bash
# =============================================================================
# 0xGünther Core — Proxmox LXC Container Deployment Runbook (Debian 12)
# =============================================================================
set -euo pipefail

CT_ID=115
HOSTNAME="gunther-core"
MEMORY_MB=8192
CORES=4
DISK_GB=32

echo ">>> [1/4] Provisioning unprivileged Debian 12 LXC Container ($CT_ID)..."
pct create $CT_ID local:vztmpl/debian-12-standard_12.7-1_amd64.tar.zst \
  --hostname $HOSTNAME \
  --cores $CORES \
  --memory $MEMORY_MB \
  --swap 2048 \
  --net0 name=eth0,bridge=vmbr0,ip=10.0.1.115/24,gw=10.0.1.1 \
  --storage local-lvm \
  --rootfs local-lvm:$DISK_GB \
  --unprivileged 1 \
  --onboot 1

echo ">>> [2/4] Starting container and installing Node.js 22 LTS..."
pct start $CT_ID
pct exec $CT_ID -- bash -c '
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs sqlite3 build-essential git
'

echo ">>> [3/4] Setting up systemd watchdog..."
pct exec $CT_ID -- bash -c '
cat > /etc/systemd/system/gunther-core.service << EOF
[Unit]
Description=0xGuenther Core - Autonomous Agent
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/gunther-core
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable --now gunther-core
'

echo ">>> [4/4] 0xGünther Core LXC container provisioned successfully on http://10.0.1.115:3000"
