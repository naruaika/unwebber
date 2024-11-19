const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('unwebber', {
    version: {
        node: process.versions.node,
        chrome: process.versions.chrome,
        electron: process.versions.electron,
    },

    api: {
        schema: () => ipcRenderer.invoke('api:schema'),
        template: (tid, cname) => ipcRenderer.invoke('api:template', tid, cname),
        palette: () => ipcRenderer.invoke('api:palette'),
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