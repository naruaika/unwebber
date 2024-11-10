const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('unwebber', {
    version: {
        node: process.versions.node,
        chrome: process.versions.chrome,
        electron: process.versions.electron,
    },

    apis: {
        schema: () => ipcRenderer.invoke('apis:schema'),
        template: (tid, cname) => ipcRenderer.invoke('apis:template', tid, cname),
    },

    config: {
        load: () => ipcRenderer.invoke('config:load'),
    },

    project: {
        create: () => ipcRenderer.send('project:create'),
        open: (path) => ipcRenderer.send('project:open', path),
        close: () => ipcRenderer.send('project:close'),
        tree: (path) => ipcRenderer.invoke('project:tree', path),
    },
})