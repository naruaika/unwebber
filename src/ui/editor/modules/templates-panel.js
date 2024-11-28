'use strict';

import { apiSchema } from "../globals.js";
import { searchInText } from '../helpers.js';

let panelContentContainer;

let isPanelReady = false;

const refreshPanel = () => {
    if (! panelContentContainer) {
        panelContentContainer = document.querySelector('#templates-panel .content__container');
    }

    if (isPanelReady) {
        return;
    }

    //
    console.log('[Editor] Refreshing templates panel...');

    // Add search input to the templates panel
    const searchInputContainer = document.createElement('div');
    searchInputContainer.classList.add('panel__search-container');
    if (panelContentContainer.classList.contains('expanded')) {
        searchInputContainer.classList.add('expanded');
    }
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search templates...';
    searchInput.classList.add('panel__search');

    // Add event listeners to the search input
    searchInput.addEventListener('input', (event) => {
        // Filter the template options based on the search input value
        panelContentContainer.querySelectorAll('.template-item').forEach(element => {
            const query = event.target.value.toLowerCase();
            const searchIn = element.dataset.label.toLowerCase();
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

    // Populate template options
    apiSchema.htmlElements
        .filter(template =>
            ! template.categories.includes('metadata') &&
            ! [
                'body',
                'embed',
                'head',
                'html',
                'object',
                'script',
                'slot',
                'style',
                'template',
                'title',
            ].includes(template.tag)
        )
        .forEach(template => {
            const templateItem = document.createElement('div');
            templateItem.classList.add('template-item');
            templateItem.dataset.label = template.name;
            templateItem.dataset.tagName = template.tag;
            templateItem.innerHTML = `${template.name} &lt;${template.tag}&gt;`;
            templateItem.title = template.description;
            fragment.appendChild(templateItem);
        });

    // Replace the panel content with the fragment
    panelContentContainer.replaceChildren(fragment);

    // Set the panel ready flag
    isPanelReady = true;

    //
    console.log('[Editor] Refreshing templates panel... [DONE]');
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
    window.addEventListener('templates:refresh', refreshPanel);

    return fragment;
}