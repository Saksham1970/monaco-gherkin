const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { startServer } = require('./server');
const CucumberService = require('./cucumber-service');

let mainWindow;
let serverPort;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
        icon: path.join(__dirname, '../assets/icon.png'),
        autoHideMenuBar: true,
    });

    // Load the app from local server
    mainWindow.loadURL(`http://localhost:${serverPort}`);

    // Open DevTools in development (detached)
    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools({ mode: 'detach' });
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// Setup IPC Handlers
function setupIpc() {
    ipcMain.handle('run-cucumber', async (event, gherkin, line) => {
        return await CucumberService.runCucumber(gherkin, line);
    });

    ipcMain.handle('detect-java', async () => {
        const result = await CucumberService.detectJava();
        if (!result.detected) {
            throw new Error(result.error || 'Java not found');
        }
        return result.version;
    });
}

app.whenReady().then(async () => {
    setupIpc();

    // Start Express server
    serverPort = await startServer();
    console.log(`Server running on port ${serverPort}`);

    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
