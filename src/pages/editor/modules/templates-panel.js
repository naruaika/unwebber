'use strict';

import { apiSchema } from "../globals.js";
import { searchInText } from '../helpers.js';

const refreshPanel = () => {
    //
    console.log('[Editor] Refreshing templates panel...');

    // Get the content container of the templates panel
    const panelContentContainer = document.querySelector('#templates-panel .content__container');

    // Remove all the existing elements from the panel
    panelContentContainer.innerHTML = '';

    // Add search input to the templates panel
    const searchInputContainer = document.createElement('div');
    searchInputContainer.classList.add('panel__search-container');
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

    // Append the search container to the list container
    panelContentContainer.append(searchInputContainer);

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
            panelContentContainer.appendChild(contentOption);
        });

    //
    console.log('[Editor] Refreshing templates panel... [DONE]');
}

(() => {
    // Register the window message event listener
    window.addEventListener('template:refresh', refreshPanel);
})()