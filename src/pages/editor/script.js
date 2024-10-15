import { appConfig } from './globals.js';
import { setupDocument } from './helpers.js';
import './modules/action-center.js';
import './modules/action-history.js';
import './modules/context-menu.js';
import './modules/keyboard-shortcut.js';
import * as topbar from './modules/topbar.js';
import * as sidebar from './modules/sidebar.js';
import * as statusbar from './modules/status-bar.js';

const mainFrame = document.getElementById('main-iframe');

const onWindowMessage = (event) => {
    if (event.data.type === 'window:ready') {
        //
        console.log('[Editor] Received ready message from the document');

        //
        console.log('[Editor] Setting up the document...');

        // Setup the document to be compatible with the editor
        setupDocument(mainFrame.contentDocument.documentElement, false);

        //
        console.log('[Editor] Setting up the document... [DONE]');

        // Emit events to trigger the sidebar panels refresh
        window.dispatchEvent(new CustomEvent('outline:refresh'));
        window.dispatchEvent(new CustomEvent('template:refresh'));
    }
}

(() => {
    // Register the window message event listener
    window.addEventListener('message', onWindowMessage);

    // Change window title
    const projectName = appConfig.project.current.signature.name;
    document.getElementById('document-name').innerText = projectName;

    // Load the project entry point
    mainFrame.title = projectName;
    const filePath = `${appConfig.project.current.path}/${appConfig.project.current.cursor}`;
    fetch(filePath).then(_ => mainFrame.src = filePath)

    // Select the default edit tool
    topbar.setMode(topbar.Mode.MOVE);

    // Open the default sidebar panels
    sidebar.toggleExpansion(sidebar.Panel.ATTRIBUTES);
    sidebar.toggleExpansion(sidebar.Panel.PROPERTIES);
    sidebar.toggleExpansion(sidebar.Panel.OUTLINE);
    sidebar.setActive(sidebar.Panel.OUTLINE);
})()