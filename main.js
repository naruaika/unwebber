// require('update-electron-app')()

const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('node:path')

const api = require('./src/libs/api')
const config = require('./src/libs/config')
const project = require('./src/libs/project')
const ui = require('./src/ui')

require('electron-reload')(__dirname, {
    electron: path.join(__dirname, 'node_modules', '.bin', 'electron'),
    hardResetMethod: 'exit',
});

let mainWindow;

/**
 * Create a new window as the main window of the app
 */
const createWindow = () => {
    // Load the app configuration
    const configData = config.load();

    // Create the browser window
    mainWindow = new BrowserWindow({
        width: ! configData.app.window.fullscreen ? configData.app.window.size.width : 1200,
        height: ! configData.app.window.fullscreen ? configData.app.window.size.height : 800,
        minWidth: 400,
        minHeight: 300,

        title: 'Unwebber',
        titleBarStyle: 'hidden',
        titleBarOverlay: {
            color: '#333333',
            symbolColor: '#FFFFFF',
            height: 36,
        },
        icon: path.join(__dirname, 'res/icons/unwebber.ico'),
        backgroundColor: '#333333',
        // vibrancy: 'fullscreen-ui', // on MacOS
        // backgroundMaterial: 'acrylic', // on Windows 11

        webPreferences: {
            preload: path.join(__dirname, 'src/preload.js')
        },

        show: false,
    })

    // Load the welcome page of the app
    mainWindow.loadFile(ui.welcome)

    // Remove the default menu bar
    mainWindow.removeMenu()

    // Maximize the window if it was last closed in fullscreen mode
    if (configData.app.window.maximized) {
        mainWindow.maximize();
    }

    // Show the main window only after all resources have been loaded
    mainWindow.webContents.on('did-finish-load', () => {
        if (process.platform === 'win32') {
            mainWindow.setIcon(path.join(__dirname, 'res/icons/unwebber.ico'));
        }
        mainWindow.show();
        mainWindow.focus();
    });

    // Remember the window size and fullscreen state
    // when the window is going to be closed
    mainWindow.on('close', () => {
        const configData = config.load();
        configData.app.window.size.width = ! mainWindow.isMaximized() ? mainWindow.getSize()[0] : 1200;
        configData.app.window.size.height = ! mainWindow.isMaximized() ? mainWindow.getSize()[1] : 800;
        configData.app.window.maximized = mainWindow.isMaximized();
        config.write(configData);
    });

    // Enable pinch zoom (for development purposes only)
    // mainWindow.webContents.setVisualZoomLevelLimits(1, 3);

    // Open the DevTools (for development purposes only)
    mainWindow.webContents.openDevTools();
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
    // Register IPC event handlers
    ipcMain.handle('api:schema', api.schema);
    ipcMain.handle('api:template', api.template);
    ipcMain.handle('config:load', config.load);
    ipcMain.on('project:create', project.create);
    ipcMain.on('project:open', project.open);
    ipcMain.on('project:close', project.close);
    ipcMain.handle('project:tree', project.tree);

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