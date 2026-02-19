#!/bin/bash
# Script to rebuild the backend with proper entitlements for macOS 15 (Sequoia)

set -euo pipefail

echo "🔨 Rebuilding backend with entitlements for macOS 15 (Sequoia)..."

# Activate virtual environment
source venv/bin/activate

# Rebuild the backend with the updated spec
pyinstaller therapy-backend.spec --clean --noconfirm

# Sync freshly built backend into electron/ so electron-builder packages the latest binary
cp -f dist/therapy-backend electron/therapy-backend
chmod 755 electron/therapy-backend

echo "✅ Backend rebuilt successfully!"
echo "📦 Backend synced to electron/therapy-backend"
echo "📦 Now build the Electron app: cd electron && npm run dist"
