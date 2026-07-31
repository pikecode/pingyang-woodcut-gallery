#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DESKTOP_DIR="$ROOT_DIR/desktop"
LOG_FILE="${PINGYANG_TAURI_LOG:-/tmp/pingyang-tauri-dev.log}"

cleanup_existing() {
  pkill -f "$DESKTOP_DIR/node_modules/.bin/tauri dev" 2>/dev/null || true
  pkill -f "$DESKTOP_DIR/src-tauri/target/debug/pingyang-desktop" 2>/dev/null || true
  pkill -f "$DESKTOP_DIR/target/debug/pingyang-desktop" 2>/dev/null || true
  pkill -f "target/debug/pingyang-desktop" 2>/dev/null || true
  pkill -f "/Applications/PingyangGallery.app/Contents/MacOS/pingyang-desktop" 2>/dev/null || true
  pkill -f "$DESKTOP_DIR/node_modules/.bin/vite" 2>/dev/null || true
}

cleanup_existing

cd "$DESKTOP_DIR"

if [ ! -d node_modules ]; then
  npm install
fi

echo "Starting PingyangGallery Desktop..."
echo "Log: $LOG_FILE"
nohup npm run tauri dev > "$LOG_FILE" 2>&1 &
echo "$!" > /tmp/pingyang-tauri-dev.pid
echo "PID: $(cat /tmp/pingyang-tauri-dev.pid)"
echo "Dev URL: http://localhost:1420/"
