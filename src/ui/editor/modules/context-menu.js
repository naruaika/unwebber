import { mousePosition, setMousePosition } from '../globals.js';

const container = document.getElementById('context-menu__container');
const menu = container.firstElementChild;

let timeoutId;
let hoveredItem;

const showMenu = (event) => {
    // Populate the context menu
    menu.innerHTML = '';
    event.uwMenu.forEach(item => {
        if (item.disabled) {
            return;
        }

        // Create a spacer
        if (item.spacer) {
            // If all the items below the spacer are disabled, don't show the spacer
            if (
                item.for &&
                event.uwMenu
                    .filter(_item => item.for.includes(_item.id))
                    .every(_item => _item.disabled)
            ) {
                return;
            }

            // If there is no item above the spacer, don't show the spacer
            if (! item.belongs) {
                if (menu.children.length === 0) {
                    return;
                }
            } else {
                const group = menu.querySelector(`[data-uw-id="${item.belongs}"]`);
                if (group.querySelector('.context-menu').children.length === 0) {
                    return;
                }
            }

            const spacer = document.createElement('div');
            spacer.classList.add('spacer');

            // Append the menu item to the context menu
            // or to a group if the item belongs to a group
            if (! item.belongs) {
                menu.appendChild(spacer);
            } else {
                const group = menu.querySelector(`[data-uw-id="${item.belongs}"]`);
                group.querySelector('.context-menu').appendChild(spacer);
            }

            return;
        }

        // Create a group
        if (item.group) {
            // If all the items belongs the group are disabled, don't show the group
            if (
                event.uwMenu
                    .filter(_item => item.for.includes(_item.id))
                    .every(_item => _item.disabled)
            ) {
                return;
            }

            // Create a group menu item
            const group = document.createElement('div');
            group.dataset.uwId = item.id;
            group.classList.add('item', 'group');
            group.innerHTML = `
                <div class="icon icon-blank"></div>
                <div class="label">${item.label}</div>
            `;
            menu.appendChild(group);

            // Create a child menu container
            const childMenu = document.createElement('div');
            childMenu.classList.add('context-menu', 'scrollable', 'hidden');
            group.addEventListener('mouseenter', (event) => onMouseOverGroupMenuItem(event, group, childMenu));
            group.appendChild(childMenu);

            return;
        }

        // Create a custom menu item
        if (item.custom) {
            // Parse the HTML string to a DOM element
            const menuItem = item.element;
            menuItem.classList.add('item');
            menuItem.addEventListener('mouseenter', () => onMouseOverMenuItem(menuItem));
            menuItem.addEventListener('click', hideMenu);

            // Append the menu item to the context menu
            // or to a group if the item belongs to a group
            if (! item.belongs) {
                menu.appendChild(menuItem);
            } else {
                const group = menu.querySelector(`[data-uw-id="${item.belongs}"]`);
                group.querySelector('.context-menu').appendChild(menuItem);
            }

            return;
        }

        // Create a menu item
        const menuItem = document.createElement('div');
        menuItem.classList.add('item');
        menuItem.innerHTML = `
            <div class="icon icon-${item.icon ? item.icon : 'blank'}"></div>
            <div class="label">${item.label}</div>
            <div class="key">${item.shortcut || ''}</div>
        `;
        menuItem.addEventListener('mouseenter', () => onMouseOverMenuItem(menuItem));
        menuItem.addEventListener('click', () => {
            setTimeout(item.action, 0);
            hideMenu();
        });

        // Append the menu item to the context menu
        // or to a group if the item belongs to a group
        if (! item.belongs) {
            menu.appendChild(menuItem);
        } else {
            const group = menu.querySelector(`[data-uw-id="${item.belongs}"]`);
            group.querySelector('.context-menu').appendChild(menuItem);
        }
    });

    // Show context menu
    container.classList.remove('hidden');
    const menuBoundingRect = menu.getBoundingClientRect();
    let left = event.clientX;
    let top = event.clientY;
    // reposition if the context menu will overflow horizontally
    if (left + menuBoundingRect.width > window.innerWidth) {
        left = window.innerWidth - menuBoundingRect.width;
    }
    // reposition if the context menu will overflow vertically
    if (top + menuBoundingRect.height > window.innerHeight) {
        top = window.innerHeight - menuBoundingRect.height;
    }
    menu.style.left = `${left}px`;
    menu.style.top = `${top - 1}px`;
    menu.focus();

    //
    console.log(`[Editor] Show context menu: ${event.uwTarget}`);
}

const hideMenu = (event) => {
    // Hide the context menu
    container.classList.add('hidden');
    menu.classList.remove('show');

    // Dispatch a custom event to inform the other components
    const customEvent = new MouseEvent('contextmenu:hide', event);
    window.dispatchEvent(customEvent);
}

const onMouseOverGroupMenuItem = (event, group, childMenu) => {
    clearTimeout(timeoutId);
    hoveredItem = event.currentTarget;
    timeoutId = setTimeout(() => {
        if (hoveredItem !== event.target) {
            return;
        }
        // Hide all the child menus
        Array.from(menu.children)
            .filter(_item => _item.classList.contains('group'))
            .forEach(_group => _group.querySelector('.context-menu').classList.add('hidden'));
        // Show the current hovered child menu
        childMenu.classList.remove('hidden');
        // Position the child menu
        const groupBoundingRect = group.getBoundingClientRect();
        const childMenuBoundingRect = childMenu.getBoundingClientRect();
        let childMenuLeft = groupBoundingRect.right - 3;
        let childMenuTop = groupBoundingRect.top;
        // reposition if the child menu will overflow horizontally
        if (childMenuLeft + childMenuBoundingRect.width > window.innerWidth) {
            childMenuLeft = groupBoundingRect.left - childMenuBoundingRect.width + 3;
        }
        // reposition if the child menu will overflow vertically
        if (childMenuTop + childMenuBoundingRect.height > window.innerHeight) {
            childMenuTop = window.innerHeight - childMenuBoundingRect.height + 3;
        }
        childMenu.style.left = `${childMenuLeft}px`;
        childMenu.style.top = `${childMenuTop - 4}px`;
    }, 200);
}

const onMouseOverMenuItem = (menuItem) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
        // Hide all the child menus of the other groups
        Array.from(menuItem.closest('.context-menu').children)
            .filter(_item => _item.classList.contains('group') && _item !== menuItem)
            .forEach(_group => _group.querySelector('.context-menu').classList.add('hidden'));
    }, 200);
}

const onKeyDown = (event) => {
    if (event.key === 'Escape') {
        container.classList.add('hidden');
        menu.classList.remove('show');
        return;
    }
}

const onMenuMouseDown = (event) => {
    event.stopPropagation();

    // Store the initial position of the mouse
    setMousePosition(event.clientX, event.clientY);
}

(() => {
    // Register the element event listener
    container.addEventListener('pointerdown', hideMenu);
    container.addEventListener('dragover', (event) => event.preventDefault());
    container.addEventListener('dragenter', (event) => event.preventDefault());
    menu.addEventListener('pointerdown', onMenuMouseDown);

    // Register the window message event listener
    window.addEventListener('contextmenu:show', showMenu);
    window.addEventListener('keydown', onKeyDown);
})()