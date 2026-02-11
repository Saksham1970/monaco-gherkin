const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    isElectron: true,
    detectJava: () => ipcRenderer.invoke('detect-java'),
    runCucumber: (gherkin, line) => ipcRenderer.invoke('run-cucumber', gherkin, line),
});
