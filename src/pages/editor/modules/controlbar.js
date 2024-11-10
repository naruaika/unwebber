'use strict';

let _snapCheckState = false;
let _gridCheckState = false;
let _marginCheckState = false;

export const getSnapCheckState = () => _snapCheckState;
export const getGridCheckState = () => _gridCheckState;
export const getMarginCheckState = () => _marginCheckState;

const toggleSnapCheckState = (event) => {
    _snapCheckState = event.target.checked;
}

const toggleGridCheckState = (event) => {
    _gridCheckState = event.target.checked;
    window.dispatchEvent(new CustomEvent('editor:toggle-grid', { detail: { state: _gridCheckState } }));
}

const toggleMarginCheckState = (event) => {
    _marginCheckState = event.target.checked;
}

export const initialize = () => {
    const container = document.querySelector('.main-controlbar');
    const overflowButton = container.querySelector('.overflow__button');
    const overflowList = container.querySelector('.overflow__list');

    //
    const listeners = [
        {
            selector: '#move-to-bottom-button',
            type: 'click',
            callback: () => window.dispatchEvent(new CustomEvent('element:move-to-top-tree')),
        },
        {
            selector: '#move-down-button',
            type: 'click',
            callback: () => window.dispatchEvent(new CustomEvent('element:move-up-tree')),
        },
        {
            selector: '#move-up-button',
            type: 'click',
            callback: () => window.dispatchEvent(new CustomEvent('element:move-down-tree')),
        },
        {
            selector: '#move-to-top-button',
            type: 'click',
            callback: () => window.dispatchEvent(new CustomEvent('element:move-to-bottom-tree')),
        },
        {
            selector: '#flip-horizontal-button',
            type: 'click',
            callback: () => window.dispatchEvent(new CustomEvent('element:flip-horizontal')),
        },
        {
            selector: '#flip-vertical-button',
            type: 'click',
            callback: () => window.dispatchEvent(new CustomEvent('element:flip-vertical')),
        },
        {
            selector: '#rotate-left-button',
            type: 'click',
            callback: () => window.dispatchEvent(new CustomEvent('element:rotate-left')),
        },
        {
            selector: '#rotate-right-button',
            type: 'click',
            callback: () => window.dispatchEvent(new CustomEvent('element:rotate-right')),
        },
        {
            selector: '#snapping-toggle-button',
            type: 'change',
            callback: toggleSnapCheckState,
        },
        {
            selector: '#snapping-customize-button',
            type: 'click',
            callback: () => { /* TODO: implement this */ },
        },
        {
            selector: '#grid-toggle-button',
            type: 'click',
            callback: toggleGridCheckState,
        },
        {
            selector: '#grid-customize-button',
            type: 'click',
            callback: () => { /* TODO: implement this */ },
        },
        {
            selector: '#margin-toggle-button',
            type: 'click',
            callback: toggleMarginCheckState,
        },
        {
            selector: '#margin-customize-button',
            type: 'click',
            callback: () => { /* TODO: implement this */ },
        },
    ];
    listeners.forEach(({ selector, type, callback }) => {
        container.querySelector(selector).addEventListener(type, callback);
    });

    // Create an IntersectionObserver to detect overflowed groups
    let overflowedGroups = [];
    const intersectionObserver = new IntersectionObserver((entries) => {
        entries.reverse().forEach(entry => {
            // Add the group to the overflowed groups list if it is not fully visible
            // or remove it otherwise
            if (entry.intersectionRatio < 1) {
                overflowedGroups.push(entry.target);
                const fragment = document.createDocumentFragment();
                entry.target.querySelectorAll('.button').forEach(button => {
                    if (! button.id) {
                        return;
                    }
                    // create the menu item
                    const selector = `#${button.id}`;
                    const menuItem = document.createElement('div');
                    menuItem.classList.add('item');
                    menuItem.setAttribute('data-selector', selector);
                    menuItem.setAttribute('tabindex', -1);
                    // add the icon of the button
                    const icon = button.querySelector('.icon');
                    if (icon) {
                        const newIcon = icon.cloneNode(true);
                        if (newIcon.classList.contains('icon-chevron-down')) {
                            newIcon.classList.replace('icon-chevron-down', 'icon-blank');
                        }
                        menuItem.appendChild(newIcon);
                    }
                    // add the title of the button
                    const title = button.getAttribute('title');
                    if (title) {
                        const newTitle = document.createElement('span');
                        newTitle.innerText = title;
                        menuItem.appendChild(newTitle);
                    }
                    // add the event listener
                    const listener = listeners.find(listener => listener.selector === selector);
                    if (listener) {
                        menuItem.addEventListener(listener.type, () => {
                            listener.callback();
                            overflowList.classList.add('hidden');
                        });
                    }
                    // append the menu item to the fragment
                    fragment.appendChild(menuItem);
                });
                overflowList.insertBefore(fragment, overflowList.firstChild);
            } else {
                const menuItemIndex = overflowedGroups.findIndex(group => group === entry.target);
                if (menuItemIndex !== -1) {
                    overflowedGroups.splice(menuItemIndex, 1);
                    entry.target.querySelectorAll('.button').forEach(button => {
                        overflowList.querySelector(`[data-selector="#${button.id}"]`)?.remove();
                    });
                }
            }
        });

        // Show the overflow button if there are overflowed groups
        // or hide it otherwise
        if (overflowedGroups.length > 0) {
            overflowButton.classList.remove('invisible');
        } else {
            overflowButton.classList.add('invisible');
            overflowList.classList.add('hidden');
        }
    });
    container.querySelectorAll('.group').forEach(group => intersectionObserver.observe(group));

    //
    overflowButton.addEventListener('click', () => {
        overflowList.classList.toggle('hidden');
    });
    document.addEventListener('mousedown', (event) => {
        if (! event.target.closest('.main-controlbar .overflow__container')) {
            overflowList.classList.add('hidden');
        }
    });
}