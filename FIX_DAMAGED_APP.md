# Fix "App is Damaged" Error on macOS

If you see the error **"The app is damaged and can't be opened. You should move it to the Trash"** when trying to open the Therapy Session Manager app, follow these steps:

## Method 1: Quick Terminal Fix (Recommended)

**Copy and paste this entire command into Terminal:**

```bash
xattr -cr "/Applications/Therapy Session Manager.app" && echo "✅ Fixed! You can now open the app."
```

**Steps:**
1. Open **Terminal** (Press `Cmd + Space`, type "Terminal", press Enter)
2. Copy the command above
3. Paste it into Terminal and press Enter
4. You should see: `✅ Fixed! You can now open the app.`
5. Try opening the app normally

## Method 2: Right-Click Method (No Terminal Required)

1. Open **Finder** and go to **Applications**
2. Find **"Therapy Session Manager"** app
3. **Right-click** (or Control+Click) on the app icon
4. Select **"Open"** from the menu (NOT double-click)
5. A security dialog will appear - click **"Open"**
6. The app will now be trusted and will open normally

## Method 3: Use the Fix Script

If you received the `FIX_QUARANTINE.sh` script:

1. Open **Terminal**
2. Navigate to where you saved the script (or drag the script file into Terminal)
3. Run: `chmod +x FIX_QUARANTINE.sh`
4. Run: `./FIX_QUARANTINE.sh`

## Why This Happens

macOS adds a "quarantine" attribute to files transferred via:
- Email attachments
- Downloads from the internet
- **AirDrop** (even between Macs)
- Cloud storage (Dropbox, iCloud, etc.)

This is a security feature. The app isn't actually damaged - macOS is just being cautious about unsigned apps.

## Important Notes

- You only need to do this **once per app installation**
- After removing the quarantine, the app will work normally forever
- This is safe - you're just telling macOS to trust this specific app
- The app will work perfectly after this fix

