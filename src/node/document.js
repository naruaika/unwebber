"use strict";

const { BrowserWindow } = require('electron');

/** */
function create(event, mainWindow, settings) {
    mainWindow?.webContents.send('file:watch-new-document-dialog', settings);
}

/** */
function close(event) {
    BrowserWindow.fromWebContents(event.sender).close();
}

module.exports = { create, close };