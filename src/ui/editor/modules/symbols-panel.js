'use strict';

import { apiSchema } from "../globals.js";
import { searchInText } from '../helpers.js';

let panelContentContainer;

let isPanelReady = false;

const refreshPanel = () => {
    if (! panelContentContainer) {
        panelContentContainer = document.querySelector('#symbols-panel .content__container');
    }

    if (isPanelReady) {
        return;
    }

    //
    console.log('[Editor] Refreshing symbols panel...');

    // Add search input to the symbols panel
    const searchInputContainer = document.createElement('div');
    searchInputContainer.classList.add('panel__search-container');
    if (panelContentContainer.classList.contains('expanded')) {
        searchInputContainer.classList.add('expanded');
    }
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search symbols...';
    searchInput.classList.add('panel__search');

    // Add event listeners to the search input
    searchInput.addEventListener('input', (event) => {
        // Filter the symbol options based on the search input value
        panelContentContainer.querySelectorAll('.symbol-item').forEach(element => {
            const query = event.target.value.toLowerCase();
            const searchIn = element.dataset.entity.toLowerCase();
            element.classList.toggle('hidden', ! searchInText(query, searchIn));
        });
    });
    searchInput.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            // Clear the search input
            event.target.value = '';
            event.target.dispatchEvent(new Event('input'));
            return;
        }
    });

    // Append the search input to the search container
    searchInputContainer.append(searchInput);

    // Insert the search container before the panel content container
    panelContentContainer.parentElement.insertBefore(searchInputContainer, panelContentContainer);

    // Create a DocumentFragment to hold the new elements
    const fragment = document.createDocumentFragment();

    // Populate symbol options
    Object.entries(apiSchema.htmlEntities).forEach(([key, symbol]) => {
        const symbolItem = document.createElement('div');
        symbolItem.classList.add('symbol-item');
        symbolItem.dataset.entity = key;
        symbolItem.dataset.decimal = symbol.codepoints[0];
        symbolItem.innerHTML = symbol.characters;
        symbolItem.title = `${key} or &#${symbol.codepoints[0]};`;
        fragment.appendChild(symbolItem);
    });

    // Append the fragment to the panel content container
    panelContentContainer.replaceChildren(fragment);

    // Set the panel ready flag
    isPanelReady = true;

    //
    console.log('[Editor] Refreshing symbols panel... [DONE]');
}

export const initialize = () => {
    // Create a fragment to hold the panel content
    const fragment = document.createDocumentFragment();
    const container = document.createElement('div');
    container.classList.add('content__container', 'scrollable');
    const placeholder = document.createElement('span');
    placeholder.classList.add('placeholder');
    // placeholder.textContent = 'Loading...';
    container.appendChild(placeholder);
    fragment.appendChild(container);

    // Register the window message event listener
    window.addEventListener('symbols:refresh', refreshPanel);

    return fragment;
}