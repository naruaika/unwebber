const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('app', {
    version: {
        node: process.versions.node,
        chrome: process.versions.chrome,
        electron: process.versions.electron,
    },

    config: {
        load: () => ipcRenderer.invoke('config:load'),
    },

    project: {
        create: () => ipcRenderer.send('project:create'),
        open: (path) => ipcRenderer.send('project:open', path),
        close: () => ipcRenderer.send('project:close'),
    },
})