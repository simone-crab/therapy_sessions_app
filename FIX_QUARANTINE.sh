#!/bin/bash
# Script to remove quarantine attribute from Therapy Session Manager app
# This fixes the "app is damaged" error on macOS

APP_PATH="/Applications/Therapy Session Manager.app"

echo "🔧 Fixing Therapy Session Manager app..."
echo ""

# Check if app exists
if [ ! -d "$APP_PATH" ]; then
    echo "❌ Error: App not found at $APP_PATH"
    echo "   Please make sure the app is installed in Applications folder"
    exit 1
fi

# Remove quarantine attribute
echo "Removing quarantine attribute..."
xattr -cr "$APP_PATH"

if [ $? -eq 0 ]; then
    echo "✅ Success! Quarantine attribute removed."
    echo ""
    echo "You can now open the app normally."
    echo "If you still see an error, try:"
    echo "  1. Right-click the app → Open"
    echo "  2. Click 'Open' in the security dialog"
else
    echo "❌ Error: Failed to remove quarantine attribute"
    echo "   You may need to run this script with administrator privileges:"
    echo "   sudo ./FIX_QUARANTINE.sh"
    exit 1
fi



