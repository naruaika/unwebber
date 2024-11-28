'use strict';

export const initialize = () => {
    // Create a fragment to hold the panel content
    const fragment = document.createDocumentFragment();
    const container = document.createElement('div');
    container.classList.add('content__container', 'scrollable');
    const placeholder = document.createElement('span');
    placeholder.textContent = 'Coming soon.';
    placeholder.classList.add('placeholder');
    container.appendChild(placeholder);
    fragment.appendChild(container);

    // Register the window message event listener
    window.addEventListener('swatches:refresh', () => { /* TODO: implement this */ });

    return fragment;
}