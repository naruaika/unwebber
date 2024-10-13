// require('update-electron-app')()

const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('node:path')

const pages = require('./src/pages')
const apis = require('./src/libs/apis')
const config = require('./src/libs/config')
const project = require('./src/libs/project')

require('electron-reload')(__dirname, {
    electron: path.join(__dirname, 'node_modules', '.bin', 'electron'),
    hardResetMethod: 'exit',
});

const createWindow = () => {
    // Create the browser window
    const mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,

        title: 'Unwebber',
        titleBarStyle: 'hidden',
        titleBarOverlay: {
            color: '#333333',
            symbolColor: '#FFFFFF',
            height: 36,
        },
        // icon: path.join(__dirname, 'res/icons/unwebber.svg'),
        backgroundColor: '#333333',

        webPreferences: {
            preload: path.join(__dirname, 'src/preload.js')
        },

        show: false,
    })

    // Load the welcome page of the app
    mainWindow.loadFile(pages.welcome)

    // Remove the default menu bar
    mainWindow.removeMenu()

    // Show the main window only after all resources have been loaded
    mainWindow.webContents.on('did-finish-load', () => {
        mainWindow.show();
        mainWindow.focus();
    });

    // Enable pinch zoom (for development purposes only)
    // mainWindow.webContents.setVisualZoomLevelLimits(1, 3);

    // Open the DevTools (for development purposes only)
    mainWindow.webContents.openDevTools()
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
    // Register IPC event handlers
    ipcMain.handle('apis:schema', apis.schema);
    ipcMain.handle('apis:template', apis.template);
    ipcMain.handle('config:load', config.load);
    ipcMain.on('project:create', project.create);
    ipcMain.on('project:open', project.open);
    ipcMain.on('project:close', project.close);
    ipcMain.handle('project:temp', project.saveTemp);

    // Create a new window
    createWindow();

    app.on('activate', () => {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
});