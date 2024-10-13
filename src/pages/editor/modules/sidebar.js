'use strict';

import './outline-panel.js';
import './attributes-panel.js';
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

    // Return if the target panel is already active
    if (currentActive === targetPanel) {
        return;
    }

    // Get the target panel element
    const panel = document.getElementById(`${targetPanel}-panel`);
    const header = panel.querySelector('.header');

    // Set the current active panel
    currentActive = targetPanel;
    const state = header.classList.contains('expanded') ? 'expanded' : 'collapsed';
    console.log(`[Editor] Set active sidebar panel: ${currentActive} (${state})`);

    //
    document.querySelectorAll('.main-sidebar__panel').forEach(element => {
        element.classList.remove('selected');
    });
    panel.classList.add('selected');
}

export const toggleExpansion = (targetPanel) => {
    // Return if the target panel is invalid
    if (! Object.values(Panel).includes(targetPanel)) {
        console.log(`[Editor] Invalid sidebar panel: ${targetPanel}`);
        return;
    }

    // Get the target panel element
    const panel = document.getElementById(`${targetPanel}-panel`);
    const header = panel.querySelector('.header');

    // Toggle the panel expansion state
    const state = header.classList.contains('expanded') ? 'expanded' : 'collapsed';
    header.classList.toggle('expanded', state !== 'expanded');
    panel.classList.toggle('expanded', state !== 'expanded');
    panel.querySelectorAll(':scope > :not(.header)').forEach(element => {
        element.classList.toggle('expanded', state !== 'expanded');
    });
}

const onPanelClick = (event) => {
    // Set the current active panel
    const targetPanel = event.currentTarget.closest('.main-sidebar__panel').id.replace('-panel', '');
    setActive(targetPanel);
}

const onPanelHeaderClick = (event) => {
    // Set the current active panel
    const targetPanel = event.target.parentNode.id.replace('-panel', '');
    toggleExpansion(targetPanel);
    setActive(targetPanel);
}

(() => {
    // For each sidebar panel
    document.querySelectorAll('.main-sidebar__panel').forEach(element => {
        // Register click event listeners
        element.addEventListener('click', onPanelClick);
        element.querySelector('.header').addEventListener('click', onPanelHeaderClick);
    });
})()