const { app, BrowserWindow } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

let backendProcess;

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      contextIsolation: true,
    },
  });

  win.loadURL('http://localhost:8000');
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

  const backendPath = isDev
    ? path.join(__dirname, '../dist/therapy-backend')
    : path.join(process.resourcesPath, 'app', 'therapy-backend');

  backendProcess = spawn(backendPath);

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
