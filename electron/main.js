const { app, BrowserWindow, Menu, MenuItem } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

let backendProcess;

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false, // Don't show until ready
    webPreferences: {
      contextIsolation: true,
      spellcheck: true, // Enable spell checking
    },
  });

  win.loadURL('http://localhost:8000');
  
  // Set up context menu with spell-check suggestions
  win.webContents.on('context-menu', (event, params) => {
    const menu = new Menu();
    
    // Add spelling suggestions if word is misspelled
    if (params.misspelledWord && params.dictionarySuggestions && params.dictionarySuggestions.length > 0) {
      params.dictionarySuggestions.forEach((suggestion) => {
        menu.append(new MenuItem({
          label: suggestion,
          click: () => {
            win.webContents.replaceMisspelling(suggestion);
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
  win.once('ready-to-show', () => {
    win.show();
    win.focus();
  });
}

function waitForBackendAndCreateWindow(retries = 20) {
  const request = http.get('http://localhost:8000', res => {
    if (res.statusCode === 200) {
      console.log("✅ Backend is ready. Launching window...");
      createWindow();
    } else {
      retry();
    }
  });

  request.on('error', retry);

  function retry() {
    if (retries > 0) {
      console.log("⏳ Waiting for backend...");
      setTimeout(() => waitForBackendAndCreateWindow(retries - 1), 500);
    } else {
      console.error("❌ Backend did not respond in time.");
    }
  }
}

app.whenReady().then(() => {
  const isDev = !app.isPackaged;

  // In dev, we use the binary from project dist. In production, the binary is in extraResources.
  const backendPath = isDev
    ? path.join(__dirname, '..', 'dist', 'therapy-backend')
    : path.join(process.resourcesPath, 'therapy-backend');

  console.log(`[electron] isDev=${isDev}`);
  console.log(`[electron] resolved backendPath=${backendPath}`);

  backendProcess = spawn(backendPath, [], { stdio: 'pipe' });

  backendProcess.on('error', (err) => {
    console.error(`[backend spawn error] ${err?.message || err}`);
  });

  backendProcess.stdout.on('data', data => {
    console.log(`[backend] ${data}`);
  });

  backendProcess.stderr.on('data', data => {
    console.error(`[backend error] ${data}`);
  });

  backendProcess.on('close', code => {
    console.log(`[backend] exited with code ${code}`);
  });

  waitForBackendAndCreateWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (backendProcess) backendProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});
