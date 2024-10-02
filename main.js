const { app, BrowserWindow, powerSaveBlocker } = require('electron');
const path = require('path');

let mainWindow;
let powerSaveBlockerId;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true, // Enable Node.js integration
      nodeIntegrationInWorker: true,
      contextIsolation: false, // Disable context isolation
      preload: path.join(__dirname, 'preload.js'),
      backgroundThrottling: false, // Disable background throttling
      devTools: false // Disable developer tools
    },
    autoHideMenuBar: true
  });

  mainWindow.loadFile('index.html');

  // Handle focus and blur events
  mainWindow.on('focus', () => {
    console.log("Window focused");
  });

  mainWindow.on('blur', () => {
    console.log("Window lost focus");
  });

  // Start power save blocker to prevent suspension or throttling
  powerSaveBlockerId = powerSaveBlocker.start('prevent-app-suspension');
  console.log(`Power save blocker started with id: ${powerSaveBlockerId}`);

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (powerSaveBlocker.isStarted(powerSaveBlockerId)) {
      powerSaveBlocker.stop(powerSaveBlockerId);
      console.log(`Power save blocker stopped with id: ${powerSaveBlockerId}`);
    }
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // On macOS, applications generally stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
