var appConfig = {};
var apiSchema = {};

var hoveredElementId = null;
var selectedElement = null;
var templateElementId = null;

const mainCanvas = document.getElementById('main-canvas');

(() => {
    // Load app configuration
    window.app.config.load().then(config => {
        appConfig = config;

        // Load the project index.html
        const projectPath = appConfig.project.current.path;
        const indexPath = projectPath + '/src/index.d.html';
        mainCanvas.title = appConfig.project.current.name;
        mainCanvas.src = indexPath;

        // Change window title
        const projectName = appConfig.project.current.name;
        document.getElementById('document-name').innerText = projectName;
    });

    // Load API index file
    window.app.apis.load().then(apis => {
        apiSchema = apis;

        // Populate template options
        const templatesPanel = document.getElementById('templates-panel');
        const listContainer = templatesPanel.querySelector('.content-list');
        apiSchema.htmlElements
            .filter(template =>
                ! template.categories.includes('metadata') &&
                ! [
                    'html',
                    'head',
                    'title',
                    'style',
                    'script',
                    'body',
                    'template',
                    'slot',
                ].includes(template.tag)
            )
            .forEach(template => {
                const contentOption = document.createElement('div');
                contentOption.classList.add('content-option');
                contentOption.classList.add('template-element');
                contentOption.dataset.label = template.alias;
                contentOption.dataset.tagname = template.tag;
                contentOption.innerHTML = `${template.alias} &lt;${template.tag}&gt;`;
                contentOption.title = template.description;
                contentOption.id = `uw-template-element-${template.tag}`;
                listContainer.appendChild(contentOption);
            });

        // Remove the placeholder element from the templates panel
        templatesPanel.querySelector('.placeholder').remove();

        // Attach draggable events to template elements
        makeTemplateElementsDraggable();
    });
})();

document.addEventListener('DOMContentLoaded', () => {
    // Automatically open default panels
    document.querySelectorAll('.main-sidebar__panel .header').forEach(element => {
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
document.querySelector('.main-canvas__overlay').addEventListener('dragover', event => {
    event.preventDefault();

    // Send the mouse position to the main canvas
    const rect = event.target.getBoundingClientRect();
    mainCanvas.contentWindow.postMessage({
        type: 'element:beforeinsert',
        payload: {
            position: {
                x: event.clientX - rect.left,
                y: event.clientY - rect.top
            },
        },
    }, '*');
});
document.querySelector('.main-canvas__overlay').addEventListener('drop', event => {
    event.preventDefault();

    // Send the mouse position to the main canvas
    const rect = event.target.getBoundingClientRect();
    mainCanvas.contentWindow.postMessage({
        type: 'element:insert',
        payload: {
            position: {
                x: event.clientX - rect.left,
                y: event.clientY - rect.top
            },
        },
    }, '*');
});
const makeTemplateElementsDraggable = () => {
    document.querySelectorAll('#templates-panel .content-option').forEach(element => {
        element.draggable = true;

        element.addEventListener('dragstart', event => {
            // Setup the drag data
            event.dataTransfer.dropEffect = 'copy';
            templateElementId = event.target.id;

            // Create a transparent canvas to set as drag image
            const transparentCanvas = document.createElement('canvas');
            event.dataTransfer.setDragImage(transparentCanvas, 0, 0);
            transparentCanvas.remove();

            // Show the selection indicator
            event.currentTarget.classList.toggle('selected');

            // Show the drop space
            document.querySelector('.main-canvas__overlay').classList.toggle('hidden');

            // Send the template element to the main canvas
            mainCanvas.contentWindow.postMessage({
                type: 'element:beforeinsert',
                payload: {
                    // TODO: get the real template
                    template: document.getElementById(templateElementId).outerHTML,
                },
            }, '*');
        });

        element.addEventListener('dragend', event => {
            // Hide the selection indicator
            event.currentTarget.classList.toggle('selected');

            // Hide the drop space
            document.querySelector('.main-canvas__overlay').classList.toggle('hidden');

            // Remove the template element from the main canvas
            mainCanvas.contentWindow.postMessage({
                type: 'element:beforeinsert',
                payload: {
                    template: null,
                },
            }, '*');

            // Clear the template element ID
            templateElementId = null;
        });

        element.addEventListener('dragover', event => {
            event.preventDefault();
        });
    });
}
// To hide the not-allowed cursor while dragging
document.addEventListener('dragover', event => event.preventDefault());
document.addEventListener('dragenter', event => event.preventDefault());

// Handler for the hover event on the document tree
document.querySelector('#layers-panel .content__container').addEventListener('mouseover', event => {
    if (event.target.tagName.toLowerCase() === 'button') {
        // If the hovered element ID is the same as the current target ID
        if (hoveredElementId === event.target.getAttribute('data-uw-id')) {
            return; // do nothing
        }

        hoveredElementId = event.target.getAttribute('data-uw-id');

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
        const selectedElementId = event.target.getAttribute('data-uw-id');

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
        if (selectedElement?.dataset.uwId) {
            // Send the request to copy the selected element to the main canvas
            mainCanvas.contentWindow.postMessage({
                type: 'element:copy',
                payload: {
                    id: selectedElement?.dataset.uwId,
                },
            }, '*');
        }
    }

    if (event.key === 'v' && event.ctrlKey) {
        if (selectedElement?.dataset.uwId) {
            // Send the request to paste the copied element to the main canvas
            mainCanvas.contentWindow.postMessage({
                type: 'element:paste',
                payload: {
                    id: selectedElement?.dataset.uwId,
                },
            }, '*');
        }
    }

    if (event.key === 'Delete') {
        if (selectedElement?.dataset.uwId) {
            // Send the request to remove the selected element to the main canvas
            mainCanvas.contentWindow.postMessage({
                type: 'element:delete',
                payload: {
                    id: selectedElement?.dataset.uwId,
                },
            }, '*');
        }
    }

    if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
        event.preventDefault();

        if (selectedElement?.dataset.uwId) {
            // Send the request to move the selected element up/left the tree to the main canvas
            mainCanvas.contentWindow.postMessage({
                type: 'element:move-up-or-left',
                payload: {
                    id: selectedElement?.dataset.uwId,
                },
            }, '*');
        }
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
        event.preventDefault();

        if (selectedElement?.dataset.uwId) {
            // Send the request to move the selected element down/right the tree to the main canvas
            mainCanvas.contentWindow.postMessage({
                type: 'element:move-down-or-right',
                payload: {
                    id: selectedElement?.dataset.uwId,
                },
            }, '*');
        }
    }
});

// Handler for the element selection
const refreshAttributesPanel = () => {
    if (! selectedElement) {
        return;
    }

    // TODO: add support for custom element tag, custom attributes, and data-* attributes
    const attributesPanel = document.getElementById('attributes-panel');
    const listContainer = attributesPanel.querySelector('.content__container');
    listContainer.querySelector('.placeholder')?.remove();
    listContainer.innerHTML = '';
    apiSchema.htmlAttributes
        .filter(attribute =>
            (
                attribute.belongsTo === 'global' ||
                // TODO: add support for format like "input|type=file"
                attribute.belongsTo.includes(selectedElement.tagName.toLowerCase())
            ) &&
            ! [
                // 'id',
                // 'class',
                'slot',
                'style',
            ].includes(attribute.name)
        )
        .forEach(attribute => {
            if (listContainer.innerHTML !== '') {
                listContainer.innerHTML += ', ';
            }
            listContainer.innerHTML += attribute.name;
        });
};

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
            if (node.id) button.setAttribute('data-uw-id', node.id);
            listItem.appendChild(button);

            // Add icon(s) to the button element
            if (node.children.length > 0) {
                // add a chevron icon
                let icon = document.createElement('div');
                icon.classList.add('icon', 'icon-chevron-down');
                icon.style.pointerEvents = 'all';
                button.appendChild(icon);
                // add a box icon
                icon = document.createElement('div');
                icon.classList.add('icon', 'icon-box');
                button.appendChild(icon);
            } else {
                // add a square icon
                const icon = document.createElement('div');
                icon.classList.add('icon', 'icon-square');
                button.appendChild(icon);
            }

            // Add a label to the button element
            const labelSpan = document.createElement('span');
            labelSpan.innerHTML = `<span class="element-label" contenteditable="true">${node.label || node.tagName.toLowerCase()}</span>`;
            labelSpan.innerHTML += ` <span class="element-id">${node.elementId ? '#' + node.elementId : '@' + node.id}</span>`;
            labelSpan.style.pointerEvents = 'none';
            button.appendChild(labelSpan);

            // Add the hover and selected classes
            if (node.id === hoveredElementId) {
                button.classList.add('hovered');
            }
            if (node.id === selectedElement?.dataset.uwId) {
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
        selectedElement = event.data.payload;

        document.querySelectorAll('#layers-panel button').forEach(element => {
            // remove the selected class from all elements
            element.classList.remove('selected');

            // find the selected element
            if (element.getAttribute('data-uw-id') === selectedElement.id) {
                // mark the selected element
                element.classList.add('selected');

                // refresh the attributes and properties panels
                refreshAttributesPanel();
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
            if (element.getAttribute('data-uw-id') === hoveredElementId) {
                // mark the hovered element
                element.classList.add('hovered');

                // and if it is not already visible on the viewport
                const container = document.querySelector('.main-sidebar__left');
                const containerRect = container.getBoundingClientRect();
                const boundingRect = element.getBoundingClientRect();
                if (
                    boundingRect.top < containerRect.top ||
                    boundingRect.top > containerRect.bottom
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

    if (event.data.type === 'window:ready') {
        // Send the API index to the main canvas
        mainCanvas.contentWindow.postMessage({
            type: 'document:init',
            payload: {
                appConfig: appConfig,
                apiSchema: apiSchema,
            },
        }, '*');
    }
});