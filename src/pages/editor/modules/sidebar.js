'use strict';

import './outline-panel.js';
// import './sidebar-panel--attributes.js';
// import './sidebar-panel--properties.js';
import './templates-panel.js';

export const Panel = Object.freeze({
    PAGES: 'pages',
    OUTLINE: 'outline',
    ASSETS: 'assets',
    ATTRIBUTES: 'attributes',
    PROPERTIES: 'properties',
    TEMPLATES: 'templates',
});

export var currentActive;

export const setActive = (targetPanel) => {
    // Return if the target panel is invalid
    if (! Object.values(Panel).includes(targetPanel)) {
        console.log(`[Editor] Invalid sidebar panel: ${targetPanel}`);
        return;
    }

    // Get the target panel element
    const panel = document.getElementById(`${targetPanel}-panel`);
    const header = panel.querySelector('.header');

    // Set the current active panel
    currentActive = targetPanel;
    const state = header.classList.contains('expanded') ? 'expanded' : 'collapsed';
    console.log(`[Editor] Set active sidebar panel: ${currentActive} (${state})`);

    // Toggle the panel expansion state
    header.classList.toggle('expanded', state !== 'expanded');
    panel.classList.toggle('expanded', state !== 'expanded');
    panel.querySelectorAll(':scope > :not(.header)').forEach(element => {
        element.classList.toggle('expanded', state !== 'expanded');
    });
    header.focus();
}

const onPanelHeaderClick = (event) => {
    // Set the current active panel
    const targetPanel = event.target.parentNode.id.replace('-panel', '');
    setActive(targetPanel);
}

(() => {
    // For each sidebar panel
    document.querySelectorAll('.main-sidebar__panel').forEach(element => {
        // Register click event listener for the panel header
        element.querySelector('.header').addEventListener('click', onPanelHeaderClick);
    });
})()