#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UPLOAD_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
INSTALL_DIR="/opt/study-planner"

if [ "$(id -u)" -ne 0 ]; then
  if command -v sudo >/dev/null 2>&1; then
    SUDO="sudo"
  else
    echo "Run this script as root, or install sudo." >&2
    exit 1
  fi
else
  SUDO=""
fi

if [ ! -f "$UPLOAD_DIR/release/server-bundle.cjs" ]; then
  echo "server-bundle.cjs is missing. The upload may be incomplete." >&2
  exit 1
fi

if [ ! -d "$UPLOAD_DIR/dist" ]; then
  echo "dist directory is missing. The upload may be incomplete." >&2
  exit 1
fi

$SUDO apt-get update -y
$SUDO apt-get install -y curl ca-certificates gnupg

if ! command -v node >/dev/null 2>&1 || [ "$(node -p "Number(process.versions.node.split('.')[0])")" -lt 22 ]; then
  if [ "$(id -u)" -eq 0 ]; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  else
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  fi
  $SUDO apt-get install -y nodejs
fi

echo "Node.js version: $(node --version)"

$SUDO mkdir -p "$INSTALL_DIR/data"
$SUDO cp "$UPLOAD_DIR/release/server-bundle.cjs" "$INSTALL_DIR/server-bundle.cjs"
$SUDO rm -rf "$INSTALL_DIR/dist"
$SUDO cp -r "$UPLOAD_DIR/dist" "$INSTALL_DIR/dist"

$SUDO tee "$INSTALL_DIR/study-planner.env" >/dev/null <<'EOF'
PORT=8787
DATA_DIR=/opt/study-planner/data
NODE_ENV=production
EOF

$SUDO tee /etc/systemd/system/study-planner.service >/dev/null <<'EOF'
[Unit]
Description=Study Planner API
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/study-planner
EnvironmentFile=/opt/study-planner/study-planner.env
ExecStart=/usr/bin/node /opt/study-planner/server-bundle.cjs
Restart=always
RestartSec=3
TimeoutStopSec=10

[Install]
WantedBy=multi-user.target
EOF

$SUDO systemctl daemon-reload
$SUDO systemctl enable study-planner
$SUDO systemctl restart study-planner

sleep 1
if ! curl -fsS http://127.0.0.1:8787/api/health >/dev/null; then
  echo "Health check failed. Run: journalctl -u study-planner -n 50" >&2
  exit 1
fi

echo
echo "Deployment completed."
echo "Service status:"
$SUDO systemctl is-active study-planner
echo
echo "Set the API address in the desktop app to:"
echo "http://$(curl -fsS --max-time 5 ifconfig.me 2>/dev/null || echo 'YOUR_PUBLIC_IP'):8787"
