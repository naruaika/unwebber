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
                event.uwMenu.filter(_item => item.for.includes(_item.id)).every(_item => _item.disabled)
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
            if (event.uwMenu.filter(_item => item.for.includes(_item.id)).every(_item => _item.disabled)) {
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
            childMenu.classList.add('context-menu', 'scrollable', 'no-drag', 'hidden');
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
            setTimeout(item.action, 50);
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

const hideMenu = () => {
    container.classList.add('hidden');
    menu.classList.remove('show');
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
            .forEach(_group => {
                _group.querySelector('.context-menu').classList.add('hidden');
            });
        // Show the current hovered child menu
        childMenu.classList.remove('hidden');
        // Position the child menu
        const groupBoundingRect = group.getBoundingClientRect();
        const childMenuBoundingRect = childMenu.getBoundingClientRect();
        let childMenuLeft = groupBoundingRect.right - 3;
        let childMenuTop = groupBoundingRect.top;
        // Reposition if the child menu will overflow horizontally
        if (childMenuLeft + childMenuBoundingRect.width > window.innerWidth) {
            childMenuLeft = groupBoundingRect.left - childMenuBoundingRect.width + 3;
        }
        // Reposition if the child menu will overflow vertically
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

const onMenuDragStart = (event) => {
    event.stopImmediatePropagation();

    // Create a transparent canvas to set as drag image
    const transparentCanvas = document.createElement('canvas');
    event.dataTransfer.setDragImage(transparentCanvas, 0, 0);
    event.dataTransfer.dropEffect = 'move';
    transparentCanvas.remove();
}

const onMenuDrag = (event) => {
    // Skip the event if the mouse is outside the window
    if (event.clientX === 0 && event.clientY === 0) {
        return;
    }

    // Move the context menu with the mouse
    const deltaX = event.clientX - mousePosition.x;
    const deltaY = event.clientY - mousePosition.y;
    const menuBoundingRect = menu.getBoundingClientRect();
    const newLeft = menuBoundingRect.left + deltaX;
    const newTop = menuBoundingRect.top + deltaY;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const menuWidth = menuBoundingRect.width;
    const menuHeight = menuBoundingRect.height;

    // Check if the new position will cause overflow
    if (newLeft >= 0 && newLeft + menuWidth <= windowWidth) {
        menu.style.left = `${newLeft}px`;
    }
    if (newTop >= 0 && newTop + menuHeight <= windowHeight) {
        menu.style.top = `${newTop}px`;
    }
    if (newLeft + menuWidth > windowWidth) {
        menu.style.left = `${windowWidth - menuWidth}px`;
    }
    if (newTop + menuHeight > windowHeight) {
        menu.style.top = `${windowHeight - menuHeight}px`;
    }

    // Update the mouse position
    setMousePosition(event.clientX, event.clientY);
}

(() => {
    // Register the element event listener
    container.addEventListener('mousedown', hideMenu);
    container.addEventListener("dragover", (event) => event.preventDefault());
    container.addEventListener("dragenter", (event) => event.preventDefault());
    menu.addEventListener('mousedown', onMenuMouseDown);
    menu.addEventListener('dragstart', onMenuDragStart);
    menu.addEventListener('drag', onMenuDrag);
    menu.addEventListener("dragenter", (event) => event.preventDefault());
    menu.addEventListener("dragover", (event) => event.preventDefault());
    menu.addEventListener("dragend", (event) => event.preventDefault());

    // Register the window message event listener
    window.addEventListener('contextmenu:show', showMenu);
    window.addEventListener('keydown', onKeyDown);
})()