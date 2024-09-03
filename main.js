// require('update-electron-app')()

const { app, BrowserWindow } = require('electron')
const path = require('node:path')

require('electron-reload')(__dirname, {
    electron: path.join(__dirname, 'node_modules', '.bin', 'electron'),
    hardResetMethod: 'exit'
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
            color: '#252525',
            symbolColor: '#FFFFFF',
            height: 36,
        },

        webPreferences: {
            preload: path.join(__dirname, 'src/preload.js')
        },

        show: false,
    })

    // Load the index.html of the app
    mainWindow.loadFile('src/index.html')

    // Remove the default menu bar
    mainWindow.removeMenu()

    // Show the main window only after all resources have been loaded
    mainWindow.webContents.on('did-finish-load', function() {
        mainWindow.show();
        mainWindow.focus();
    });

    // Open the DevTools
    mainWindow.webContents.openDevTools()
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
    createWindow()

    app.on('activate', () => {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})