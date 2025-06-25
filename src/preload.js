const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('unwebber', {
    about: {
        platform: process.platform,
        node: process.versions.node,
        chrome: process.versions.chrome,
        electron: process.versions.electron,
    },

    language: {
        translate: (key, language = 'en') => ipcRenderer.invoke('language:translate', key, language),
    },

    file: {
        openNewDocumentDialog: () => ipcRenderer.send('file:open-new-document-dialog'),
        watchNewDocumentDialog: (callback) => ipcRenderer.on('file:watch-new-document-dialog', (event, settings) => callback(settings)),
        exitApplication: () => ipcRenderer.send('file:exit-application'),
    },

    newDocument: {
        create: (settings) => ipcRenderer.send('new-document:create', settings),
        close: () => ipcRenderer.send('new-document:close'),
    },
})