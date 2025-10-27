# Therapy Session Manager - macOS 15 Compatibility

## Issue: "App is Damaged" Error

On macOS 15 (Sequoia), the app may show as "damaged" when first opened. This is macOS Gatekeeper protecting your system from unsigned apps.

### Quick Fix (Recommended)

**After installing the app from the DMG:**

1. **Right-click** on the "Therapy Session Manager" app
2. Select **"Open"**
3. Click **"Open"** when macOS asks for confirmation
4. The app is now trusted and will open normally from then on

### Alternative: Terminal Fix

Open Terminal and run:

```bash
xattr -cr "/Applications/Therapy Session Manager.app"
```

Then try opening the app.

### Why This Happens

- macOS 15 has stricter security requirements
- The app needs to be notarized by Apple for automatic trust
- App notarization requires an Apple Developer account ($99/year)
- For personal/internal use, the bypass method is perfectly safe

### The App is Safe

This is your own app distributed privately. The "damaged" message is just Gatekeeper being extra cautious with apps that haven't been notarized by Apple.

---

**Built For**: macOS 15 (Sequoia)  
**Architecture**: ARM64 (Apple Silicon)

