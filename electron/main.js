const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { startServer } = require('./server');
const CucumberService = require('./cucumber-service');

const WINDOW_CONFIG = {
    width: 1400,
    height: 900,
    webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
    },
    icon: path.join(__dirname, '../assets/icon.png'),
    autoHideMenuBar: true,
};

const isDevelopment = () => process.env.NODE_ENV === 'development';

let mainWindow;
let serverPort;

const createWindow = () => {
    mainWindow = new BrowserWindow(WINDOW_CONFIG);
    mainWindow.loadURL(`http://localhost:${serverPort}`);

    if (isDevelopment()) {
        mainWindow.webContents.openDevTools({ mode: 'detach' });
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
};

const setupIpc = () => {
    ipcMain.handle('run-cucumber', async (_event, gherkin, line) =>
        CucumberService.runCucumber(gherkin, line)
    );

    ipcMain.handle('detect-java', async () => {
        const result = await CucumberService.detectJava();
        if (!result.detected) {
            throw new Error(result.error || 'Java not found');
        }
        return result.version;
    });
};

app.whenReady().then(async () => {
    setupIpc();

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
