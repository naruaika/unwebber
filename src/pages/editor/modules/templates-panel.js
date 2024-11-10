'use strict';

import { apiSchema } from "../globals.js";
import { searchInText } from '../helpers.js';

let panelContentContainer;

const refreshPanel = () => {
    if (! panelContentContainer) {
        panelContentContainer = document.querySelector('#templates-panel .content__container');
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
        panelContentContainer.querySelectorAll('.template-element').forEach(element => {
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
            const contentOption = document.createElement('div');
            contentOption.classList.add('content-option');
            contentOption.classList.add('template-element');
            contentOption.dataset.label = template.name;
            contentOption.dataset.tagName = template.tag;
            contentOption.innerHTML = `${template.name} &lt;${template.tag}&gt;`;
            contentOption.title = template.description;
            fragment.appendChild(contentOption);
        });

    // Remove all the existing elements from the panel
    panelContentContainer.innerHTML = '';

    // Append the fragment to the panel content container
    panelContentContainer.appendChild(fragment);

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
    placeholder.textContent = 'Loading...';
    container.appendChild(placeholder);
    fragment.appendChild(container);

    // Register the window message event listener
    window.addEventListener('templates:refresh', refreshPanel);

    return fragment;
}