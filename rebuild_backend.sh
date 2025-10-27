#!/bin/bash
# Script to rebuild the backend with proper entitlements for macOS 15 (Sequoia)

echo "🔨 Rebuilding backend with entitlements for macOS 15 (Sequoia)..."

# Activate virtual environment
source venv/bin/activate

# Rebuild the backend with the updated spec
pyinstaller therapy-backend.spec --clean --noconfirm

echo "✅ Backend rebuilt successfully!"
echo "📦 Now build the Electron app: cd electron && npm run dist"

