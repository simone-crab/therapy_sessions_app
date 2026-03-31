const { app, BrowserWindow, Menu, MenuItem, dialog, shell, ipcMain, screen } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');
const net = require('net');
const fs = require('fs');
const crypto = require('crypto');
const { fileURLToPath } = require('url');

let backendProcess;
let mainWindow;
let isBackendStarting = false;
let isWindowCreating = false;
let isWaitingForBackend = false;
let isContentLoaded = false; // Track if the main content has been loaded
let isBackendShutdownExpected = false;
let backendPort = 8000;
const DB_DIRECTORY_NAME = 'therapy-sessions-app';
const DB_FILENAME = 'therapy.db';
const BACKUP_FILE_EXTENSION = 'solubak';
const BACKUP_FILE_MAGIC = 'SOLU_NOTES_BACKUP_V1';
const APP_SETTINGS_FILENAME = 'settings.json';
const THEME_STORAGE_KEY = 'solu-notes-theme';
let currentTheme = 'dark';

function getBackendUrl() {
  return `http://127.0.0.1:${backendPort}`;
}

function isBackendAppUrl(url) {
  if (!url) return false;
  return (
    url.startsWith(getBackendUrl()) ||
    url.startsWith(`http://localhost:${backendPort}`)
  );
}

function isPortAvailable(port) {
  return new Promise(resolve => {
    const server = net.createServer();
    server.unref();
    server.once('error', () => resolve(false));
    server.listen(port, '127.0.0.1', () => {
      server.close(() => resolve(true));
    });
  });
}

function findEphemeralPort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const selectedPort = address && typeof address === 'object' ? address.port : null;
      server.close(() => {
        if (!selectedPort) {
          reject(new Error('Could not resolve ephemeral port.'));
          return;
        }
        resolve(selectedPort);
      });
    });
  });
}

async function findAvailableBackendPort(preferredPort = 8000, maxOffset = 50) {
  if (await isPortAvailable(preferredPort)) {
    return preferredPort;
  }
  for (let offset = 1; offset <= maxOffset; offset += 1) {
    const candidate = preferredPort + offset;
    if (await isPortAvailable(candidate)) {
      return candidate;
    }
  }
  return findEphemeralPort();
}

function getSettingsPath() {
  return path.join(app.getPath('userData'), APP_SETTINGS_FILENAME);
}

function readSettings() {
  try {
    const settingsPath = getSettingsPath();
    if (!fs.existsSync(settingsPath)) {
      return {};
    }
    return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  } catch (error) {
    console.warn(`[settings] Could not read settings file: ${error.message}`);
    return {};
  }
}

function writeSettings(settings) {
  try {
    const settingsPath = getSettingsPath();
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
  } catch (error) {
    console.warn(`[settings] Could not write settings file: ${error.message}`);
  }
}

function normalizeTheme(theme) {
  return theme === 'light' ? 'light' : 'dark';
}

function loadPersistedTheme() {
  const settings = readSettings();
  return normalizeTheme(settings.theme);
}

function persistTheme(theme) {
  const settings = readSettings();
  settings.theme = normalizeTheme(theme);
  writeSettings(settings);
}

function applyThemeToRenderer(windowRef, theme) {
  if (!windowRef || windowRef.isDestroyed()) return;
  const normalized = normalizeTheme(theme);
  const escapedTheme = JSON.stringify(normalized);
  const escapedStorageKey = JSON.stringify(THEME_STORAGE_KEY);
  const script = `
    (function () {
      const theme = ${escapedTheme};
      const key = ${escapedStorageKey};
      if (window.ThemeManager && typeof window.ThemeManager.setTheme === 'function') {
        window.ThemeManager.setTheme(theme);
      } else {
        document.documentElement.dataset.theme = theme;
        try { localStorage.setItem(key, theme); } catch (_error) {}
      }
    })();
  `;
  windowRef.webContents.executeJavaScript(script).catch(error => {
    console.warn(`[theme] Failed to apply theme in renderer: ${error.message}`);
  });
}

function setCurrentTheme(theme, { applyToWindow = true, persist = true } = {}) {
  currentTheme = normalizeTheme(theme);
  if (persist) {
    persistTheme(currentTheme);
  }
  if (applyToWindow) {
    applyThemeToRenderer(mainWindow, currentTheme);
  }
}

function getDatabasePath() {
  return path.join(app.getPath('appData'), DB_DIRECTORY_NAME, DB_FILENAME);
}

function requestBuffer(url, { method = 'GET', timeout = 10000 } = {}) {
  return new Promise((resolve, reject) => {
    const request = http.request(url, { method, timeout }, res => {
      const chunks = [];
      if (res.statusCode !== 200) {
        let errorText = '';
        res.setEncoding('utf8');
        res.on('data', chunk => {
          errorText += chunk;
        });
        res.on('end', () => {
          reject(new Error(`Request failed (${res.statusCode}): ${errorText || res.statusMessage || 'Unknown error'}`));
        });
        return;
      }
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });

    request.on('error', reject);
    request.on('timeout', () => {
      request.destroy(new Error('Request timed out'));
    });
    request.end();
  });
}

function encryptBackupBuffer(plainBuffer, password) {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = crypto.scryptSync(password, salt, 32);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plainBuffer), cipher.final()]);
  const tag = cipher.getAuthTag();
  const payload = {
    magic: BACKUP_FILE_MAGIC,
    version: 1,
    kdf: 'scrypt',
    cipher: 'aes-256-gcm',
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    ciphertext: ciphertext.toString('base64')
  };
  return Buffer.from(JSON.stringify(payload), 'utf8');
}

function decryptBackupBuffer(encryptedBuffer, password) {
  let payload;
  try {
    payload = JSON.parse(encryptedBuffer.toString('utf8'));
  } catch (_error) {
    throw new Error('Backup file format is invalid.');
  }

  if (payload.magic !== BACKUP_FILE_MAGIC || payload.version !== 1) {
    throw new Error('Backup file format is not supported.');
  }

  const salt = Buffer.from(payload.salt, 'base64');
  const iv = Buffer.from(payload.iv, 'base64');
  const tag = Buffer.from(payload.tag, 'base64');
  const ciphertext = Buffer.from(payload.ciphertext, 'base64');
  const key = crypto.scryptSync(password, salt, 32);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

function validateSQLiteBuffer(buffer) {
  const sqliteHeader = 'SQLite format 3\u0000';
  return buffer.length >= sqliteHeader.length && buffer.subarray(0, sqliteHeader.length).toString('utf8') === sqliteHeader;
}

function buildBackupDefaultName() {
  const isoDate = new Date().toISOString().slice(0, 10);
  return `Solu Notes Backup ${isoDate}.${BACKUP_FILE_EXTENSION}`;
}

function createErrorWindow(errorMessage) {
  const errorWin = new BrowserWindow({
    width: 600,
    height: 400,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  const errorHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Error - Solu Notes</title>
      <style>
        body {
          font-family: Helvetica, 'Helvetica Neue', Arial, sans-serif;
          padding: 40px;
          background: #f5f5f5;
        }
        .error-container {
          background: white;
          border-radius: 8px;
          padding: 30px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 { color: #d32f2f; margin-top: 0; }
        pre {
          background: #f5f5f5;
          padding: 15px;
          border-radius: 4px;
          overflow-x: auto;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="error-container">
        <h1>⚠️ Application Error</h1>
        <p>The backend server failed to start. Please check the details below:</p>
        <pre>${errorMessage}</pre>
        <p><strong>Please contact support with this error message.</strong></p>
      </div>
    </body>
    </html>
  `;

  errorWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(errorHTML)}`);
  errorWin.show();
}

function createLoadingScreen() {
  const brandingPath = app.isPackaged
    ? path.join(process.resourcesPath, 'assets', 'SOLUNOTES_BRANDING_2.jpg')
    : path.join(__dirname, 'assets', 'SOLUNOTES_BRANDING_2.jpg');
  let backgroundCss = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
  try {
    const imageBuffer = fs.readFileSync(brandingPath);
    const imageDataUrl = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
    backgroundCss = `url('${imageDataUrl}') center / cover no-repeat`;
  } catch (err) {
    console.warn(`[loading] Could not load branding image at ${brandingPath}. Using gradient fallback.`);
  }

  const loadingHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Solu Notes</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: Helvetica, 'Helvetica Neue', Arial, sans-serif;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          height: 100vh;
          background: ${backgroundCss};
          color: white;
        }
        .spinner-container {
          text-align: center;
          background: rgba(0, 0, 0, 0.35);
          padding: 20px 24px;
          border-radius: 12px;
          backdrop-filter: blur(2px);
        }
        .spinner {
          border: 4px solid rgba(255, 255, 255, 0.3);
          border-top: 4px solid #f5a623;
          border-radius: 50%;
          width: 60px;
          height: 60px;
          animation: spin 1s linear infinite;
          margin: 0 auto 20px;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        h1 {
          font-size: 24px;
          font-weight: 600;
          margin-bottom: 10px;
        }
        p {
          font-size: 14px;
          opacity: 0.9;
        }
      </style>
    </head>
    <body>
      <div class="spinner-container">
        <div class="spinner"></div>
        <h1>Solu Notes</h1>
        <p>Starting application...</p>
      </div>
    </body>
    </html>
  `;
  return `data:text/html;charset=utf-8,${encodeURIComponent(loadingHTML)}`;
}

async function showPasswordPrompt({ title, message, actionLabel, confirmPassword = false }) {
  if (!mainWindow || mainWindow.isDestroyed()) return null;

  return new Promise(resolve => {
    const channel = `backup-password-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    let settled = false;
    const promptWindow = new BrowserWindow({
      width: 420,
      height: confirmPassword ? 330 : 280,
      show: false,
      parent: mainWindow,
      modal: true,
      resizable: false,
      minimizable: false,
      maximizable: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });

    const cleanup = (result = null) => {
      if (settled) return;
      settled = true;
      ipcMain.removeAllListeners(channel);
      if (!promptWindow.isDestroyed()) {
        promptWindow.destroy();
      }
      resolve(result);
    };

    ipcMain.once(channel, (_event, payload) => {
      cleanup(payload?.password || null);
    });

    promptWindow.on('closed', () => {
      cleanup(null);
    });

    const promptHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8" />
        <title>${title}</title>
        <style>
          body {
            font-family: Helvetica, 'Helvetica Neue', Arial, sans-serif;
            margin: 0;
            padding: 24px;
            background: #2f2f33;
            color: #f5f5f5;
          }
          h1 {
            font-size: 20px;
            margin: 0 0 10px;
          }
          p {
            font-size: 14px;
            margin: 0 0 18px;
            color: rgba(255, 255, 255, 0.82);
          }
          label {
            display: block;
            font-size: 13px;
            margin-bottom: 12px;
          }
          input {
            width: 100%;
            box-sizing: border-box;
            margin-top: 6px;
            padding: 10px 12px;
            border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.16);
            background: rgba(255, 255, 255, 0.08);
            color: #fff;
          }
          .error {
            min-height: 18px;
            color: #ff9c7b;
            font-size: 12px;
            margin: 2px 0 10px;
          }
          .actions {
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            margin-top: 18px;
          }
          button {
            border: 0;
            border-radius: 8px;
            padding: 10px 14px;
            font-size: 13px;
            cursor: pointer;
          }
          .secondary {
            background: rgba(255,255,255,0.14);
            color: #fff;
          }
          .primary {
            background: #6b6bd6;
            color: #fff;
          }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p>${message}</p>
        <form id="prompt-form">
          <label>
            Password
            <input type="password" id="password" autofocus />
          </label>
          ${confirmPassword ? `
          <label>
            Confirm Password
            <input type="password" id="confirm-password" />
          </label>` : ''}
          <div class="error" id="error"></div>
          <div class="actions">
            <button type="button" class="secondary" id="cancel">Cancel</button>
            <button type="submit" class="primary">${actionLabel}</button>
          </div>
        </form>
        <script>
          const { ipcRenderer } = require('electron');
          const form = document.getElementById('prompt-form');
          const passwordInput = document.getElementById('password');
          const confirmInput = document.getElementById('confirm-password');
          const errorEl = document.getElementById('error');
          document.getElementById('cancel').addEventListener('click', () => window.close());
          form.addEventListener('submit', (event) => {
            event.preventDefault();
            const password = passwordInput.value || '';
            const confirmed = confirmInput ? confirmInput.value || '' : '';
            if (!password) {
              errorEl.textContent = 'Password is required.';
              return;
            }
            if (confirmInput && password !== confirmed) {
              errorEl.textContent = 'Passwords do not match.';
              return;
            }
            ipcRenderer.send('${channel}', { password });
            setTimeout(() => window.close(), 0);
          });
        </script>
      </body>
      </html>
    `;

    promptWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(promptHtml)}`);
    promptWindow.once('ready-to-show', () => promptWindow.show());
  });
}

async function stopBackendProcessGracefully() {
  if (!backendProcess) return;

  await new Promise(resolve => {
    const proc = backendProcess;
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      backendProcess = null;
      resolve();
    };

    isBackendShutdownExpected = true;
    proc.once('close', finish);

    try {
      proc.kill('SIGTERM');
    } catch (_error) {
      finish();
      return;
    }

    setTimeout(() => {
      if (settled) return;
      try {
        proc.kill('SIGKILL');
      } catch (_error) {
        // Ignore if the process already exited.
      }
      finish();
    }, 4000);
  });
}

async function createEncryptedBackup() {
  try {
    let { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Create Encrypted Backup',
      defaultPath: path.join(app.getPath('documents'), buildBackupDefaultName()),
      filters: [{ name: 'Solu Notes Backup', extensions: [BACKUP_FILE_EXTENSION] }]
    });
    if (canceled || !filePath) return;
    if (path.extname(filePath).toLowerCase() !== `.${BACKUP_FILE_EXTENSION}`) {
      filePath = `${filePath}.${BACKUP_FILE_EXTENSION}`;
    }

    const password = await showPasswordPrompt({
      title: 'Create Encrypted Backup',
      message: 'Enter a password to encrypt this backup. You will need it to restore on another computer.',
      actionLabel: 'Create Backup',
      confirmPassword: true
    });
    if (!password) return;

    const snapshotBuffer = await requestBuffer(`${getBackendUrl()}/api/system/backup-snapshot`, { method: 'POST' });
    const encryptedPayload = encryptBackupBuffer(snapshotBuffer, password);
    fs.writeFileSync(filePath, encryptedPayload);

    await dialog.showMessageBox(mainWindow, {
      type: 'info',
      message: 'Encrypted backup created successfully.',
      detail: filePath
    });
  } catch (error) {
    console.error('[backup] Failed to create encrypted backup:', error);
    await dialog.showMessageBox(mainWindow, {
      type: 'error',
      message: 'Failed to create backup.',
      detail: error.message || String(error)
    });
  }
}

async function restoreEncryptedBackup() {
  let tempDbPath = null;
  try {
    const warning = await dialog.showMessageBox(mainWindow, {
      type: 'warning',
      buttons: ['Cancel', 'Restore'],
      defaultId: 1,
      cancelId: 0,
      message: 'Restore from encrypted backup?',
      detail: 'This will replace the current local database and restart Solu Notes.'
    });
    if (warning.response !== 1) return;

    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'Restore From Encrypted Backup',
      properties: ['openFile'],
      filters: [{ name: 'Solu Notes Backup', extensions: [BACKUP_FILE_EXTENSION] }]
    });
    if (canceled || !filePaths?.length) return;

    const password = await showPasswordPrompt({
      title: 'Restore From Encrypted Backup',
      message: 'Enter the password used when this backup was created.',
      actionLabel: 'Restore'
    });
    if (!password) return;

    const encryptedPayload = fs.readFileSync(filePaths[0]);
    const restoredDbBuffer = decryptBackupBuffer(encryptedPayload, password);
    if (!validateSQLiteBuffer(restoredDbBuffer)) {
      throw new Error('Decrypted backup is not a valid SQLite database.');
    }

    const dbPath = getDatabasePath();
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    tempDbPath = path.join(path.dirname(dbPath), `restore-${Date.now()}.db`);
    fs.writeFileSync(tempDbPath, restoredDbBuffer);

    await stopBackendProcessGracefully();

    [dbPath, `${dbPath}-wal`, `${dbPath}-shm`].forEach(file => {
      try {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      } catch (error) {
        console.warn(`[restore] Could not remove ${file}: ${error.message}`);
      }
    });

    fs.renameSync(tempDbPath, dbPath);

    await dialog.showMessageBox(mainWindow, {
      type: 'info',
      message: 'Backup restored successfully.',
      detail: 'Solu Notes will now restart.'
    });

    app.relaunch();
    app.exit(0);
  } catch (error) {
    if (tempDbPath && fs.existsSync(tempDbPath)) {
      try {
        fs.unlinkSync(tempDbPath);
      } catch (_cleanupError) {
        // Ignore cleanup failure.
      }
    }
    console.error('[backup] Failed to restore encrypted backup:', error);
    await dialog.showMessageBox(mainWindow, {
      type: 'error',
      message: 'Failed to restore backup.',
      detail: error.message || String(error)
    });
  }
}

function setupApplicationMenu() {
  const isMac = process.platform === 'darwin';
  const template = [];

  if (isMac) {
    template.push({
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    });
  }

  template.push(
    {
      label: 'File',
      submenu: [
        { label: 'Create Encrypted Backup...', click: () => createEncryptedBackup() },
        { label: 'Restore From Encrypted Backup...', click: () => restoreEncryptedBackup() },
        { type: 'separator' },
        {
          label: 'View Reports...',
          click: () => {
            if (!mainWindow || mainWindow.isDestroyed()) {
              return;
            }
            mainWindow.loadURL(`${getBackendUrl()}/reports`).catch(error => {
              console.error('[menu] Failed to open reports page:', error);
            });
          }
        },
        { type: 'separator' },
        {
          label: 'Therapist Details...',
          click: () => {
            if (!mainWindow || mainWindow.isDestroyed()) {
              return;
            }
            mainWindow.webContents.executeJavaScript(`
              (function () {
                if (typeof window.openTherapistDetailsModal === 'function') {
                  window.openTherapistDetailsModal();
                  return true;
                }
                return false;
              })();
            `).then((opened) => {
              if (opened) return;
              dialog.showMessageBox(mainWindow, {
                type: 'info',
                message: 'Therapist Details is available from the main notes view.'
              });
            }).catch((error) => {
              console.error('[menu] Failed to open Therapist Details modal:', error);
            });
          }
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    { role: 'editMenu' },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        { type: 'separator' },
        {
          label: 'Dark Mode',
          type: 'checkbox',
          accelerator: 'CmdOrCtrl+Shift+D',
          checked: currentTheme === 'dark',
          click: (menuItem) => {
            const nextTheme = menuItem.checked ? 'dark' : 'light';
            setCurrentTheme(nextTheme);
          }
        }
      ]
    },
    { role: 'windowMenu' },
    { label: 'Help', submenu: [] }
  );

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createWindow() {
  // Prevent creating multiple windows
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.focus();
    return;
  }
  
  if (isWindowCreating) {
    return;
  }
  
  isWindowCreating = true;

  const { workArea } = screen.getPrimaryDisplay();
  const preferredWidth = Math.round(workArea.width * 0.78);
  const cappedWidth = Math.min(1440, workArea.width - 120);
  const windowWidth = Math.max(1000, Math.min(preferredWidth, cappedWidth));
  
  mainWindow = new BrowserWindow({
    width: windowWidth,
    height: workArea.height,
    x: workArea.x + Math.round((workArea.width - windowWidth) / 2),
    y: workArea.y,
    show: true, // Show immediately
    title: 'Solu Notes',
    webPreferences: {
      contextIsolation: true,
      spellcheck: true, // Enable spell checking
    },
  });
  
  // Reset flag when window is destroyed
  mainWindow.on('closed', () => {
    mainWindow = null;
    isWindowCreating = false;
    isContentLoaded = false; // Reset content loaded flag
  });
  
  // Track when content is successfully loaded to prevent unnecessary reloads
  mainWindow.webContents.on('did-finish-load', () => {
    const url = mainWindow.webContents.getURL();
    if (isBackendAppUrl(url) && !url.includes('data:text/html')) {
      console.log("✅ Main content finished loading");
      isContentLoaded = true;
      applyThemeToRenderer(mainWindow, currentTheme);
    }
  });
  
  // Log navigation events to help debug reload issues
  mainWindow.webContents.on('did-navigate', (event, url) => {
    console.log(`[navigation] Navigated to: ${url}`);
  });
  
  mainWindow.webContents.on('did-navigate-in-page', (event, url) => {
    console.log(`[navigation] In-page navigation to: ${url}`);
  });

  // Show loading screen immediately
  mainWindow.loadURL(createLoadingScreen());
  
  // Focus the window
  mainWindow.focus();
  
  // Handle navigation errors
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error(`[window] Failed to load: ${errorCode} - ${errorDescription}`);
    if (errorCode === -106) {
      // ERR_INTERNET_DISCONNECTED or connection refused
      createErrorWindow(`Failed to connect to backend server.\n\nError: ${errorDescription}\n\nPlease ensure the backend is running on ${getBackendUrl()}`);
    }
  });

  // Open external URLs in the system browser, not inside the Electron window.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^file:\/\//i.test(url)) {
      try {
        const localPath = fileURLToPath(url);
        shell.openPath(localPath).then(result => {
          if (result) {
            console.error(`[open file] Failed to open PDF path: ${result}`);
          }
        }).catch(error => {
          console.error(`[open file] Failed to open PDF path: ${error.message}`);
        });
      } catch (error) {
        console.error(`[open file] Invalid file URL: ${url}`, error);
      }
      return { action: 'deny' };
    }
    if (/^https?:\/\//i.test(url)) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (/^file:\/\//i.test(url)) {
      event.preventDefault();
      try {
        const localPath = fileURLToPath(url);
        shell.openPath(localPath).then(result => {
          if (result) {
            console.error(`[open file] Failed to open PDF path: ${result}`);
          }
        }).catch(error => {
          console.error(`[open file] Failed to open PDF path: ${error.message}`);
        });
      } catch (error) {
        console.error(`[open file] Invalid file URL: ${url}`, error);
      }
      return;
    }
    if (/\/api\/invoices\/\d+\/pdf(?:\?|$)/i.test(url)) {
      event.preventDefault();
      shell.openExternal(url);
      return;
    }
    const isAppUrl =
      url.startsWith('data:text/html') ||
      isBackendAppUrl(url);
    if (!isAppUrl && /^https?:\/\//i.test(url)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });
  
  // Set up context menu with spell-check suggestions
  mainWindow.webContents.on('context-menu', (event, params) => {
    const menu = new Menu();
    
    // Add spelling suggestions if word is misspelled
    if (params.misspelledWord && params.dictionarySuggestions && params.dictionarySuggestions.length > 0) {
      params.dictionarySuggestions.forEach((suggestion) => {
        menu.append(new MenuItem({
          label: suggestion,
          click: () => {
            mainWindow.webContents.replaceMisspelling(suggestion);
          }
        }));
      });
      
      menu.append(new MenuItem({ type: 'separator' }));
    }
    
    // Add standard editing options
    if (params.editFlags.canCut) {
      menu.append(new MenuItem({
        label: 'Cut',
        role: 'cut'
      }));
    }
    
    if (params.editFlags.canCopy) {
      menu.append(new MenuItem({
        label: 'Copy',
        role: 'copy'
      }));
    }
    
    if (params.editFlags.canPaste) {
      menu.append(new MenuItem({
        label: 'Paste',
        role: 'paste'
      }));
    }
    
    if (params.editFlags.canSelectAll) {
      menu.append(new MenuItem({
        label: 'Select All',
        role: 'selectAll'
      }));
    }
    
    // Show the context menu
    menu.popup();
  });
  
  // Show and focus the window when it's ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });
}

function waitForBackendAndLoadContent(retries = 40) {
  // Prevent multiple simultaneous calls
  if (isWaitingForBackend) {
    return;
  }
  
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }
  
  isWaitingForBackend = true;
  let handled = false;
  
  const request = http.get(getBackendUrl(), { timeout: 1000 }, res => {
    if (handled) return;
    handled = true;
    if (res.statusCode === 200) {
      console.log("✅ Backend is ready. Loading content...");
      isWaitingForBackend = false;
      // Load the actual application content ONLY if not already loaded
      if (mainWindow && !mainWindow.isDestroyed() && !isContentLoaded) {
        isContentLoaded = true;
        mainWindow.loadURL(getBackendUrl());
      } else if (isContentLoaded) {
        console.log("ℹ️ Content already loaded, skipping reload");
      }
    } else {
      retry();
    }
  });

  request.on('error', (err) => {
    if (handled) return;
    handled = true;
    console.error(`[http request error] ${err.message}`);
    if (err.code === 'ECONNREFUSED') {
      retry();
    } else {
      isWaitingForBackend = false;
      retry();
    }
  });

  request.on('timeout', () => {
    if (handled) return;
    handled = true;
    console.error('[http request] Timeout');
    request.destroy();
    retry();
  });

  function retry() {
    // If content already loaded, any pending retry chain is stale.
    if (isContentLoaded) {
      isWaitingForBackend = false;
      return;
    }
    if (retries > 0) {
      console.log(`⏳ Waiting for backend... (${retries} retries left)`);
      setTimeout(() => {
        isWaitingForBackend = false; // Reset flag before retry
        waitForBackendAndLoadContent(retries - 1);
      }, 500);
    } else {
      isWaitingForBackend = false;
      console.error("❌ Backend did not respond in time.");
      const errorMsg = `Backend server failed to start after 20 seconds.\n\n` +
        `Backend path: ${backendPath}\n` +
        `Backend exists: ${fs.existsSync(backendPath)}\n` +
        `Backend executable: ${fs.existsSync(backendPath) ? (fs.statSync(backendPath).mode & parseInt('111', 8) ? 'Yes' : 'No') : 'N/A'}\n` +
        `Backend process error: ${backendError || 'None'}\n` +
        `Backend stdout: ${backendStdout || 'None'}\n` +
        `Backend stderr: ${backendStderr || 'None'}`;
      createErrorWindow(errorMsg);
    }
  }
}

let backendPath;
let backendError = null;
let backendStdout = '';
let backendStderr = '';

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  // Another instance is already running, quit this one
  app.quit();
} else {
  // Handle when another instance tries to open
  app.on('second-instance', () => {
    // Focus our window instead of opening a new one
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    } else {
      // Window doesn't exist yet, wait for it
      setTimeout(() => {
        if (mainWindow) {
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.focus();
        }
      }, 1000);
    }
  });
}

app.whenReady().then(async () => {
  app.setName('Solu Notes');
  currentTheme = loadPersistedTheme();
  setupApplicationMenu();
  // Prevent multiple backend startups
  if (isBackendStarting) {
    return;
  }
  isBackendStarting = true;
  const isDev = !app.isPackaged;
  try {
    backendPort = await findAvailableBackendPort(8000);
  } catch (error) {
    console.warn(`[electron] Failed to resolve available backend port: ${error.message}. Falling back to 8000.`);
    backendPort = 8000;
  }
  console.log(`[electron] Selected backend port: ${backendPort}`);

  // In dev, we use the binary from project dist. In production, the binary is in extraResources.
  backendPath = isDev
    ? path.join(__dirname, '..', 'dist', 'therapy-backend')
    : path.join(process.resourcesPath, 'therapy-backend');

  console.log(`[electron] isDev=${isDev}`);
  console.log(`[electron] resolved backendPath=${backendPath}`);
  console.log(`[electron] backendPath exists: ${fs.existsSync(backendPath)}`);

  // Check if backend file exists
  if (!fs.existsSync(backendPath)) {
    const errorMsg = `Backend executable not found at: ${backendPath}\n\n` +
      `Resources path: ${process.resourcesPath}\n` +
      `App path: ${app.getAppPath()}\n` +
      `Please ensure the backend is properly packaged.`;
    console.error(`[electron] ${errorMsg}`);
    createErrorWindow(errorMsg);
    return;
  }

  // Check if backend is executable
  try {
    const stats = fs.statSync(backendPath);
    const isExecutable = (stats.mode & parseInt('111', 8)) !== 0;
    console.log(`[electron] backendPath is executable: ${isExecutable}`);
    
    if (!isExecutable) {
      console.log(`[electron] Attempting to make backend executable...`);
      fs.chmodSync(backendPath, '755');
    }
  } catch (err) {
    console.error(`[electron] Error checking backend permissions: ${err.message}`);
  }

  console.log(`[electron] Spawning backend process...`);
  
  // Get the directory where the backend executable is located
  const backendDir = path.dirname(backendPath);
  
  backendProcess = spawn(backendPath, [], { 
    stdio: ['ignore', 'pipe', 'pipe'], // stdin: ignore, stdout/stderr: pipe
    cwd: backendDir, // Set working directory to backend location
    env: {
      ...process.env,
      PATH: process.env.PATH,
      // Ensure Python can find its libraries if needed
      PYTHONPATH: process.env.PYTHONPATH || '',
      // Set production mode
      PRODUCTION: 'true',
      BACKEND_PORT: String(backendPort)
    },
    detached: false
  });

  // Track if backend has started successfully
  let backendStarted = false;
  let backendExited = false;

  backendProcess.on('error', (err) => {
    backendError = err.message;
    console.error(`[backend spawn error] ${err?.message || err}`);
    const errorMsg = `Failed to start backend process.\n\n` +
      `Error: ${err.message}\n` +
      `Backend path: ${backendPath}\n` +
      `Backend directory: ${backendDir}\n` +
      `Please check that the backend executable has proper permissions.`;
    createErrorWindow(errorMsg);
  });

  backendProcess.stdout.on('data', data => {
    const output = data.toString();
    backendStdout += output;
    console.log(`[backend stdout] ${output}`);
    
    // Check for successful startup indicators
    if (output.includes('Uvicorn running') || 
        output.includes('Application startup complete') ||
        output.includes('Started server process')) {
      backendStarted = true;
      console.log('[electron] Backend startup detected!');
    }
  });

  backendProcess.stderr.on('data', data => {
    const output = data.toString();
    backendStderr += output;
    console.error(`[backend stderr] ${output}`);
  });

  backendProcess.on('close', (code, signal) => {
    backendExited = true;
    console.log(`[backend] exited with code ${code}, signal ${signal}`);
    backendProcess = null;
    
    // If backend exits before we detect it started, show error
    if (isBackendShutdownExpected) {
      console.log('[electron] Backend shutdown was expected.');
      return;
    }
    if (!backendStarted || code !== 0) {
      const errorMsg = `Backend process exited unexpectedly.\n\n` +
        `Exit code: ${code}\n` +
        `Signal: ${signal || 'None'}\n` +
        `Backend path: ${backendPath}\n` +
        `Backend directory: ${backendDir}\n` +
        `Backend started: ${backendStarted}\n\n` +
        `Stdout:\n${backendStdout || 'None'}\n\n` +
        `Stderr:\n${backendStderr || 'None'}`;
      createErrorWindow(errorMsg);
    }
  });

  // Monitor if backend exits too quickly (within 2 seconds)
  setTimeout(() => {
    if (backendExited && !backendStarted) {
      const errorMsg = `Backend exited too quickly (within 2 seconds).\n\n` +
        `This usually indicates a startup error.\n\n` +
        `Backend path: ${backendPath}\n` +
        `Stdout:\n${backendStdout || 'None'}\n\n` +
        `Stderr:\n${backendStderr || 'None'}`;
      createErrorWindow(errorMsg);
    }
  }, 2000);

  // Create window immediately with loading screen
  createWindow();
  
  // Start waiting for backend after a short delay
  setTimeout(() => {
    waitForBackendAndLoadContent();
  }, 1000);

  app.on('activate', () => {
    // On macOS, re-create window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show();
        mainWindow.focus();
      } else if (!isWindowCreating) {
        createWindow();
        setTimeout(() => {
          waitForBackendAndLoadContent();
        }, 1000);
      }
    } else {
      // Focus existing window - DO NOT reload content if already loaded
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show();
        mainWindow.focus();
        // Only wait for backend if content hasn't loaded yet
        if (!isContentLoaded) {
          setTimeout(() => {
            waitForBackendAndLoadContent();
          }, 100);
        }
      }
    }
  });
});

app.on('window-all-closed', () => {
  if (backendProcess) {
    isBackendShutdownExpected = true;
    backendProcess.kill();
  }
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (backendProcess) {
    isBackendShutdownExpected = true;
    backendProcess.kill();
  }
});
