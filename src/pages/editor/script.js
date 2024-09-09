var hoveredElementId = null;
var selectedElementId = null; // TODO: add support for multiple selection

const mainCanvas = document.getElementById('main-canvas');

(() => {
    // Load app configuration
    window.app.config.load().then(appConfig => {
        // Load the project index.html
        const projectPath = appConfig.project.current.path;
        const indexPath = projectPath + '/src/index.d.html';
        mainCanvas.title = appConfig.project.current.name;
        mainCanvas.src = indexPath;

        // Change window title
        const projectName = appConfig.project.current.name;
        document.getElementById('document-name').innerText = projectName;
    });
})();

document.addEventListener('DOMContentLoaded', () => {
    // Automatically open default panels
    document.querySelectorAll('#layers-panel .header, #properties-panel .header').forEach(element => {
        element.click();
    });

    // Automatically select default edit mode
    document.querySelector('#visual-edit-button').click();
});

// Handler to expand/collapse panels
document.querySelectorAll('.main-sidebar__panel .header, .main-bottombar__panel .header').forEach(element => {
    element.addEventListener('click', () => {
        element.classList.toggle('expanded');
        element.parentNode.classList.toggle('expanded');
        element.parentNode.querySelector('.content__container').classList.toggle('expanded');
    });
});

// Handler to click on topbar buttons
document.querySelectorAll('.main-topbar .button-action').forEach(element => {
    element.addEventListener('click', event => {
        // Check if the button belong to an action group
        if (element.dataset.actionGroup) {
            document
                .querySelectorAll('[data-action-group]')
                .forEach(element => element.classList.remove('selected'));
        }
        // Mark the button as selected
        event.target.classList.toggle('selected');
    });
});

// Handler to run/stop website live preview
document.getElementById('website-preview-button').addEventListener('click', () => {
    // TODO: Implement the live preview feature
    document.querySelector('.main-statusbar').classList.toggle('preview');
    document.querySelectorAll('.main-sidebar__left, .main-sidebar__right').forEach(element => {
        element.classList.toggle('hidden');
    });
});

// Handler for drag/drop web components
document.querySelector('.main-canvas__overlay').addEventListener('dragenter', () => {
    console.debug('Object has entered the drop space');
});
document.querySelector('.main-canvas__overlay').addEventListener('dragleave', () => {
    console.debug('Object has left the drop space');
});
document.querySelector('.main-canvas__overlay').addEventListener('dragover', event => {
    event.preventDefault();
});
document.querySelector('.main-canvas__overlay').addEventListener('drop', event => {
    event.preventDefault();
});
document.querySelectorAll('.template-component').forEach(element => {
    element.addEventListener('dragstart', event => {
        // Setup the drag data
        event.dataTransfer.dropEffect = 'copy';
        event.dataTransfer.setData('text', event.target.id);
        // Show the selection indicator
        event.currentTarget.classList.toggle('selected');
        // Show the drop space
        document.querySelector('.main-canvas__overlay').classList.toggle('hidden');
    });
    element.addEventListener('dragend', event => {
        // Hide the selection indicator
        event.currentTarget.classList.toggle('selected');
        // Hide the drop space
        document.querySelector('.main-canvas__overlay').classList.toggle('hidden');
    });
});
// To hide the not-allowed cursor while dragging
document.addEventListener('dragover', event => event.preventDefault());
document.addEventListener('dragenter', event => event.preventDefault());

// Handler for the hover event on the document tree
document.querySelector('#layers-panel .content__container').addEventListener('mouseover', event => {
    if (event.target.tagName.toLowerCase() === 'button') {
        hoveredElementId = event.target.getAttribute('data-id');

        // Send the hovered element ID to the main canvas
        mainCanvas.contentWindow.postMessage({
            type: 'element:hover',
            payload: {
                id: hoveredElementId,
            },
        }, '*');
    }
});
// Handler for the click event on the document tree
document.querySelector('#layers-panel .content__container').addEventListener('mousedown', event => {
    if (event.target.tagName.toLowerCase() === 'button') {
        const selectedElementId = event.target.getAttribute('data-id');

        // Send the selected element ID to the main canvas
        mainCanvas.contentWindow.postMessage({
            type: 'element:select',
            payload: {
                id: selectedElementId,
            },
        }, '*');

        return;
    }

    if (event.target.classList.contains('icon-chevron-down')) {
        // TODO: Implement the expand/collapse feature
        event.target.classList.toggle('collapsed');
        event.target.parentNode.classList.toggle('collapsed');
        return;
    }
});
// Handler for mouse out event on the document tree
document.querySelector('#layers-panel .content__container').addEventListener('mouseout', () => {
    // Update the hovered element ID
    hoveredElementId = null;

    // Send the request to remove the hover effect to the main canvas
    mainCanvas.contentWindow.postMessage({
        type: 'element:unhover',
        payload: {},
    }, '*');
});

// Handler for keydown event on the window
window.addEventListener('keydown', event => {
    if (event.key === 'c' && event.ctrlKey) {
        if (selectedElementId) {
            // Send the request to copy the selected element to the main canvas
            mainCanvas.contentWindow.postMessage({
                type: 'element:copy',
                payload: {
                    id: selectedElementId,
                },
            }, '*');
        }
    }

    if (event.key === 'v' && event.ctrlKey) {
        if (selectedElementId) {
            // Send the request to paste the copied element to the main canvas
            mainCanvas.contentWindow.postMessage({
                type: 'element:paste',
                payload: {
                    id: selectedElementId,
                },
            }, '*');
        }
    }

    if (event.key === 'Delete') {
        if (selectedElementId) {
            // Send the request to remove the selected element to the main canvas
            mainCanvas.contentWindow.postMessage({
                type: 'element:delete',
                payload: {
                    id: selectedElementId,
                },
            }, '*');
        }
    }
});

// Handler for receiving messages from the main canvas
window.addEventListener('message', event => {
    // Convert the document tree to unordered list elements
    const convertToUnorderedList = (tree) => {
        const createListItem = (node, level) => {
            const listItem = document.createElement('li');

            // Add the button element
            const button = document.createElement('button');
            button.style.paddingLeft = `${8 + level * 15}px`;
            button.setAttribute('data-tagname', node.tagName.toLowerCase());
            if (node.id) button.setAttribute('data-id', node.id);
            listItem.appendChild(button);

            // Add an icon to the button element
            if (node.children.length > 0) {
                let icon = document.createElement('div');
                icon.classList.add('icon', 'icon-chevron-down');
                icon.style.pointerEvents = 'all';
                button.appendChild(icon);

                icon = document.createElement('div');
                icon.classList.add('icon', 'icon-box');
                button.appendChild(icon);
            } else {
                const icon = document.createElement('div');
                icon.classList.add('icon', 'icon-square');
                button.appendChild(icon);
            }

            // Add a label to the button element
            const labelSpan = document.createElement('span');
            labelSpan.innerHTML = `<span class="element-label" contenteditable="true">${node.label || 'Element'}</span>`;
            labelSpan.innerHTML += (node.id ? ` <span class="element-id">#${node.id}</span>` : '');
            labelSpan.style.pointerEvents = 'none';
            button.appendChild(labelSpan);

            // Add the hover and selected classes
            if (node.id === hoveredElementId) {
                button.classList.add('hovered');
            }
            if (node.id === selectedElementId) {
                button.classList.add('selected');
            }

            // Add the children elements
            if (node.children.length > 0) {
                const unorderedList = document.createElement('ul');
                node.children.forEach(child => unorderedList.appendChild(createListItem(child, level + 1)));
                listItem.appendChild(unorderedList);
            }

            return listItem;
        };

        const unorderedList = document.createElement('ul');
        unorderedList.appendChild(createListItem(tree, 0));

        return unorderedList;
    };

    // Handle the document tree update
    if (event.data.type === 'document:tree') {
        const documentTree = event.data.payload.tree;
        const unorderedList = convertToUnorderedList(documentTree);
        document.querySelector('#layers-panel .content__container').innerHTML = '';
        document.querySelector('#layers-panel .content__container').appendChild(unorderedList);
    }

    // Handle the element selection
    if (event.data.type === 'element:select') {
        selectedElementId = event.data.payload.id;
        document.querySelectorAll('#layers-panel button').forEach(element => {
            // remove the selected class from all elements
            element.classList.remove('selected');

            // find the selected element
            if (element.getAttribute('data-id') === selectedElementId) {
                // mark the selected element
                element.classList.add('selected');

                // and if it is not already visible on the viewport
                // note that the condition above will less likely to be met
                // since the target element will always be visible on the viewport
                // after hovering it (see the 'element:hover' event handler)
                const container = document.querySelector('.main-sidebar__left');
                const containerRect = container.getBoundingClientRect();
                const boundingRect = element.getBoundingClientRect();
                if (
                    boundingRect.top < containerRect.top ||
                    boundingRect.top > containerRect.height - containerRect.top
                ) {
                    // scroll the selected element into view
                    element.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center',
                        inline: 'nearest'
                    });
                }
            }
        });
    }

    // Handle the element hovering
    if (event.data.type === 'element:hover') {
        hoveredElementId = event.data.payload.id;
        document.querySelectorAll('#layers-panel button').forEach(element => {
            // remove the hovered class from all elements
            element.classList.remove('hovered');

            // find the hovered element
            if (element.getAttribute('data-id') === hoveredElementId) {
                // mark the hovered element
                element.classList.add('hovered');

                // and if it is not already visible on the viewport
                const container = document.querySelector('.main-sidebar__left');
                const containerRect = container.getBoundingClientRect();
                const boundingRect = element.getBoundingClientRect();
                if (
                    boundingRect.top < containerRect.top ||
                    boundingRect.top > containerRect.height - containerRect.top
                ) {
                    // scroll the hovered element into view
                    element.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center',
                        inline: 'nearest'
                    });
                }
            }
        });
    }
});