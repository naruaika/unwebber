import { appConfig } from './globals.js';
import { setupDocument } from './helpers.js';
import './modules/action-center.js';
import './modules/action-history.js';
import './modules/context-menu.js';
import './modules/keyboard-shortcut.js';
import * as topbar from './modules/topbar.js';
import * as controlbar from './modules/controlbar.js';
import * as toolbar from './modules/toolbar.js';
import * as canvas from './modules/canvas.js';
import * as sidebar from './modules/sidebar.js';
import * as statusbar from './modules/status-bar.js';

const mainFrame = document.getElementById('main-iframe');

const onWindowMessage = (event) => {
    if (event.data.type === 'window:ready') {
        //
        console.log('[Editor] Received ready message from the document');

        setTimeout(() => {
            //
            console.log('[Editor] Setting up the document...');

            // Setup the document to be compatible with the editor
            setupDocument(mainFrame.contentDocument.documentElement, false);

            // Emit events to trigger the sidebar panels refresh
            window.dispatchEvent(new CustomEvent('canvas:refresh'));
            window.dispatchEvent(new CustomEvent('pages:refresh'));
            window.dispatchEvent(new CustomEvent('outline:refresh'));
            window.dispatchEvent(new CustomEvent('assets:refresh'));
            window.dispatchEvent(new CustomEvent('templates:refresh'));

            //
            console.log('[Editor] Setting up the document... [DONE]');
        }, 0);
    }
}

(() => {
    // Register the window message event listener
    window.addEventListener('message', onWindowMessage);

    // Change window title
    const projectName = appConfig.project.current.signature.name;
    document.getElementById('document-name').innerText = projectName;
    mainFrame.title = projectName;

    setTimeout(() => {
        // Initialize all the UI components
        topbar.initialize(appConfig);
        controlbar.initialize(appConfig);
        toolbar.initialize(appConfig);
        sidebar.initialize(appConfig);
        canvas.initialize(appConfig);
        statusbar.initialize(appConfig);

        // Select the default edit tool
        toolbar.setMode(toolbar.Mode.MOVE);

        // Load the project entry point
        const filePath = `${appConfig.project.current.path}/${appConfig.project.current.cursor}`;
        fetch(filePath).then(_ => mainFrame.src = filePath);
    }, 0);
})()