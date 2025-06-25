"use strict";

const { app, BrowserWindow, ipcMain } = require('electron');
const started = require('electron-squirrel-startup');

const path = require('node:path');

const language = require('./node/language');
const newDocument = require('./node/document');

let mainWindow = null;

// Handle creating/removing shortcuts on Windows when un/installing the app
if (started) {
    app.quit();
}

/**
 * Create a new window as the main window of the app.
 */
function createMainWindow() {
    // Create a new browser window
    mainWindow = new BrowserWindow({
        // Set the window dimensions
        width: 1200,
        height: 800,
        minWidth: 400,
        minHeight: 300,

        // Set the window title and icon
        title: 'Unwebber',
        icon: path.join(__dirname, '../unwebber.ico'),
        backgroundColor: '#333333',

        // Remove the default title bar
        titleBarStyle: 'hidden',

        // Expose the title bar overlay only on Windows and Linux
        ...(process.platform !== 'darwin' ? {
            titleBarOverlay: {
                color: '#333333',
                symbolColor: '#FFFFFF',
                height: 35,
            },
        } : {}),

        // Hide the window until all resources have been loaded
        // to prevent flickering during the loading process
        show: false,

        // Setup the web preferences
        webPreferences: {
            preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
        },
    });

    // Dim the title bar overlay when the window loses focus
    mainWindow.on('blur', () => {
        mainWindow.setTitleBarOverlay({
            symbolColor: '#777777',
        });
    });

    // Reset the title bar overlay when the window gains focus
    mainWindow.on('focus', () => {
        mainWindow.setTitleBarOverlay({
            symbolColor: '#FFFFFF',
        });
    });

    // Load the HTML
    mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

    // Remove the default menu bar
    mainWindow.removeMenu();

    // Show the main window only after all resources have been loaded
    mainWindow.webContents.on('did-finish-load', () => {
        if (process.platform === 'win32') {
            mainWindow.setIcon(path.join(__dirname, '../unwebber.ico'));
        }
        mainWindow.show();
        mainWindow.focus();
    });

    // Enable pinch zoom (for development purposes only)
    // mainWindow.webContents.setVisualZoomLevelLimits(1, 3);

    // Open the DevTools (for development purposes only)
    // mainWindow.webContents.openDevTools();
}

/**
 * Create a new dialog window to create a new document.
 */
function createNewDocumentDialog() {
    // Create a new dialog window
    const dialog = new BrowserWindow({
        parent: mainWindow,

        width: 200,
        height: 100,

        backgroundColor: '#333333',
        titleBarStyle: 'hidden',

        minimizable: false,
        maximizable: false,
        resizable: false,
        show: false,

        webPreferences: {
            preload: NEW_DOCUMENT_PRELOAD_WEBPACK_ENTRY,
        },
    });

    // Load the HTML
    dialog.loadURL(NEW_DOCUMENT_WEBPACK_ENTRY);

    // Remove the default menu bar
    dialog.removeMenu();

    // Ensure main window stays focused when the dialog is closed
    dialog.on('closed', () => mainWindow?.focus());

    // Show the main window only after all resources have been loaded
    dialog.webContents.on('did-finish-load', () => {
        dialog.show();
        dialog.focus();
    });

    // // Open the DevTools (for development purposes only)
    // dialog.webContents.openDevTools();
}

/**
 * Close all windows of the app.
 */
function closeAllWindows() {
    BrowserWindow.getAllWindows().forEach(window => window.close());
}

/**
 * Register IPC event handlers for the main process.
 */
function registerIPCEventHandlers() {
    //
    ipcMain.handle('language:translate', language.translate);

    //
    ipcMain.on('file:open-new-document-dialog', createNewDocumentDialog);
    ipcMain.on('file:exit-application', closeAllWindows);

    //
    ipcMain.on('new-document:create', (event, settings) => {
        newDocument.create(event, mainWindow, settings);
    });
    ipcMain.on('new-document:close', newDocument.close);
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
    // Register IPC event handlers
    registerIPCEventHandlers();

    // Create a new window
    createMainWindow();

    app.on('activate', () => {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open
        if (BrowserWindow.getAllWindows().length === 0) {
            createMainWindow();
        }
    });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Set the about panel options
app.setAboutPanelOptions({
    applicationName: 'Unwebber',
    applicationVersion: app.getVersion(),
    copyright: '©2024 Unwebber',
    version: process.versions.electron,
    authors: ['Naufan Rusyda Faikar'],
    website: 'https://unwebber.com',
});