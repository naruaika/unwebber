import { appConfig } from './globals.js';
import { setupDocument } from './helpers.js';
import './modules/action-center.js';
import './modules/action-history.js';
import './modules/context-menu.js';
import * as shortcut from './modules/keyboard-shortcut.js';
import * as topbar from './modules/topbar.js';
import * as controlbar from './modules/controlbar.js';
import * as contextbar from './modules/contextbar.js';
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
            window.dispatchEvent(new CustomEvent('assets:refresh'));

            //
            console.log('[Editor] Setting up the document... [DONE]');
        }, 0);

        return;
    }

    if (event.data.type === 'editor:shift') {
        shortcut.setShiftKeyState(event.data.payload.pressed);
        return;
    }

    if (event.data.type === 'editor:keydown') {
        setTimeout(() => window.dispatchEvent(new CustomEvent('canvas:select')), 0);
        return;
    }

    if (event.data.type === 'editor:escape') {
        window.dispatchEvent(new CustomEvent('action:interrupt'));
        return;
    }
}

const onWindowMouseDown = () => {
    // Emit an event to interrupt the current action
    window.dispatchEvent(new CustomEvent('action:interrupt', { detail: { click: true } }))
}

(() => {
    // Register the window message event listener
    window.addEventListener('message', onWindowMessage);
    window.addEventListener('pointerdown', onWindowMouseDown);

    // Change window title
    const projectName = appConfig.project.current.signature.name;
    document.getElementById('document-name').innerText = projectName;
    mainFrame.title = projectName;

    setTimeout(() => {
        // Initialize all the UI components
        topbar.initialize(appConfig);
        controlbar.initialize(appConfig);
        contextbar.initialize(appConfig);
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