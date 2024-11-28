'use strict';

import { appConfig } from "../globals.js";
import { debounce } from "../helpers.js";

let panelContentContainer;

let currentFilePath;
let currentFileName;

let isPanelReady = false;

const refreshPanel = () => {
    if (! panelContentContainer) {
        panelContentContainer = document.querySelector('#pages-panel .content__container');
    }

    currentFilePath = `${appConfig.project.current.path}/${appConfig.project.current.cursor}`;
    currentFileName = appConfig.project.current.cursor.split(/[\\/]/).pop();

    if (! isPanelReady) {
        // Add search input to the panel
        const searchInputContainer = document.createElement('div');
        searchInputContainer.classList.add('panel__search-container');
        if (panelContentContainer.classList.contains('expanded')) {
            searchInputContainer.classList.add('expanded');
        }
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = 'Search pages...';
        searchInput.classList.add('panel__search');

        // Add event listeners to the search input
        const filterListItems = (event) => {
            const query = event.target.value.trim().toLowerCase();
            const listItems = panelContentContainer.querySelectorAll('.list-item');
            listItems.forEach(item => {
                const text = item.querySelector('.label').textContent.trim().toLowerCase();
                if (text.includes(query)) {
                    item.classList.remove('hidden');
                } else {
                    item.classList.add('hidden');
                }
            });
        };
        searchInput.addEventListener('input', debounce(filterListItems, 250));
        searchInput.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                // Clear the search input
                event.target.value = '';
                event.target.dispatchEvent(new Event('input'));
                return;
            }
        });
        searchInput.addEventListener('drop', (event) => {
            searchInput.value = event.dataTransfer.getData('text/plain');
            searchInput.dispatchEvent(new Event('input'));
        });

        // Append the search input to the search container
        searchInputContainer.append(searchInput);

        // Insert the search container before the panel content container
        panelContentContainer.parentElement.insertBefore(searchInputContainer, panelContentContainer);

        // Get the project tree and filter HTML files only, except for *.d.html
        window.unwebber.project.tree(appConfig.project.current.path).then(tree => {
            const walk = (node, files = []) => {
                if (node.type === 'file') {
                    if (
                        node.name.endsWith('.html') &&
                        ! node.name.endsWith('.d.html')
                    ) {
                        files.push({
                            name: node.name,
                            path: node.path,
                        });
                    }
                } else {
                    for (const child of node.children) {
                        walk(child, files);
                    }
                }
                return files;
            };
            const files = walk(tree);

            // Create a DocumentFragment to hold the new elements
            const fragment = document.createDocumentFragment();

            // Populate the panel with the project files
            files.forEach(file => {
                // Create a list item element to hold the file
                const listItem = document.createElement('div');
                listItem.classList.add('list-item');
                if (file.name === currentFileName.replace(/\.d\.(\w+)$/, '.$1')) {
                    listItem.classList.add('selected');
                }
                listItem.setAttribute('data-path', file.path);
                listItem.addEventListener('click', () => { /* TODO: implement this */ });

                // Create an image element to hold the file thumbnail
                // TODO: implement this
                const thumbnail = document.createElement('div');
                thumbnail.classList.add('thumbnail');
                listItem.appendChild(thumbnail);

                // Create an element to hold the file name
                const label = document.createElement('div');
                label.classList.add('label');
                label.textContent = file.name;
                listItem.appendChild(label);

                fragment.appendChild(listItem);
            });

            // Replace the panel content with the fragment
            panelContentContainer.replaceChildren(fragment);
        });

        isPanelReady = true;
    }
}

export const initialize = () => {
    // Create a fragment to hold the panel content
    const fragment = document.createDocumentFragment();
    const container = document.createElement('div');
    container.classList.add('content__container', 'scrollable');
    const placeholder = document.createElement('span');
    // placeholder.textContent = 'Loading...';
    placeholder.classList.add('placeholder');
    container.appendChild(placeholder);
    fragment.appendChild(container);

    // Register the window message event listener
    window.addEventListener('pages:refresh', refreshPanel);

    return fragment;
}