const { app, BrowserWindow, Menu, MenuItem, dialog } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');
const fs = require('fs');

let backendProcess;
let mainWindow;
let isBackendStarting = false;
let isWindowCreating = false;
let isWaitingForBackend = false;
let isContentLoaded = false; // Track if the main content has been loaded

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
      <title>Error - Therapy Session Manager</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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
  const loadingHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Therapy Session Manager</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        .spinner-container {
          text-align: center;
        }
        .spinner {
          border: 4px solid rgba(255, 255, 255, 0.3);
          border-top: 4px solid white;
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
        <h1>Therapy Session Manager</h1>
        <p>Starting application...</p>
      </div>
    </body>
    </html>
  `;
  return `data:text/html;charset=utf-8,${encodeURIComponent(loadingHTML)}`;
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
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: true, // Show immediately
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
    if (url && url.includes('localhost:8000') && !url.includes('data:text/html')) {
      console.log("✅ Main content finished loading");
      isContentLoaded = true;
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
      createErrorWindow(`Failed to connect to backend server.\n\nError: ${errorDescription}\n\nPlease ensure the backend is running on http://localhost:8000`);
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
  
  const request = http.get('http://localhost:8000', { timeout: 1000 }, res => {
    if (res.statusCode === 200) {
      console.log("✅ Backend is ready. Loading content...");
      isWaitingForBackend = false;
      // Load the actual application content ONLY if not already loaded
      if (mainWindow && !mainWindow.isDestroyed() && !isContentLoaded) {
        isContentLoaded = true;
        mainWindow.loadURL('http://localhost:8000');
      } else if (isContentLoaded) {
        console.log("ℹ️ Content already loaded, skipping reload");
      }
    } else {
      retry();
    }
  });

  request.on('error', (err) => {
    console.error(`[http request error] ${err.message}`);
    if (err.code === 'ECONNREFUSED') {
      retry();
    } else {
      isWaitingForBackend = false;
      retry();
    }
  });

  request.on('timeout', () => {
    console.error('[http request] Timeout');
    request.destroy();
    retry();
  });

  function retry() {
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

app.whenReady().then(() => {
  // Prevent multiple backend startups
  if (isBackendStarting) {
    return;
  }
  isBackendStarting = true;
  const isDev = !app.isPackaged;

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
      PRODUCTION: 'true'
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
    
    // If backend exits before we detect it started, show error
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
    backendProcess.kill();
  }
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
});
