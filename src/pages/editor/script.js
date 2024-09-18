var appConfig = {};
var apiSchema = {};

var focusedPanelElement = null;
var hoveredElementId = null;
var selectedElement = null;
var templateElementId = null;

const mainCanvas = document.getElementById('main-canvas');

(() => {
    // Load app configuration
    window.unwebber.config.load().then(config => {
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
    window.unwebber.apis.load().then(apis => {
        apiSchema = apis;

        // Populate the templates panel
        populateTemplatesPanel();
    });
})();

document.addEventListener('DOMContentLoaded', () => {
    // Automatically open default panels
    document.querySelectorAll('.main-sidebar__panel .header').forEach(element => {
        if (
            [
                'attributes-panel',
                'assets-panel',
                'templates-panel'
            ].includes(element.parentElement.id)
        ) {
            return;
        }
        element.click();
    });

    // Automatically select default edit mode
    document.querySelector('#visual-edit-button').click();
});

// Handler to expand/collapse panels
document.querySelectorAll('.main-sidebar__panel > .header').forEach(element => {
    element.addEventListener('click', () => {
        element.classList.toggle('expanded');
        element.parentNode.classList.toggle('expanded');
        element.parentNode.querySelectorAll(':scope > :not(.header)').forEach(element => {
            element.classList.toggle('expanded');
        });
    });
});

// Handler for resizing the main canvas container
let canvasResizeTimeout;
(new ResizeObserver(() => {
    // Send the resize event to the main canvas
    mainCanvas.contentWindow.postMessage({
        type: 'window:resize',
        payload: {},
    }, '*');

    clearTimeout(canvasResizeTimeout);
    canvasResizeTimeout = setTimeout(() => {
        // Send the resize event to the main canvas
        mainCanvas.contentWindow.postMessage({
            type: 'window:afterresize',
            payload: {},
        }, '*');

        // Refresh the navigation section
        refreshNavigationSection();
    }, 250);
})).observe(document.querySelector('.main-canvas__container'));

// Handler for resizing the main window
let windowResizeTimeout;
window.addEventListener('resize', () => {
    // Send the resize event to the main canvas
    mainCanvas.contentWindow.postMessage({
        type: 'window:resize',
        payload: {},
    }, '*');

    clearTimeout(windowResizeTimeout);
    windowResizeTimeout = setTimeout(() => {
        // Send the resize event to the main canvas
        mainCanvas.contentWindow.postMessage({
            type: 'window:afterresize',
            payload: {},
        }, '*');

        // Refresh the navigation section
        refreshNavigationSection();
    }, 250);
});

// Handler for drag/drop on the main canvas
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

// Handler for the events on the document tree
document.querySelector('#outline-panel .content__container').addEventListener('mouseover', event => {
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
document.querySelector('#outline-panel .content__container').addEventListener('mousedown', event => {
    event.stopPropagation();

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
document.querySelector('#outline-panel .content__container').addEventListener('mouseout', () => {
    // Update the hovered element ID
    hoveredElementId = null;

    // Send the request to remove the hover effect to the main canvas
    mainCanvas.contentWindow.postMessage({
        type: 'element:unhover',
        payload: {},
    }, '*');
});
document.querySelector('#outline-panel .content__container').addEventListener('keydown', event => {
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

// Handler for panel content updates
const refreshOutlinePanel = (tree) => {
    const listContainer = document.querySelector('#outline-panel .content__container');

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
            labelSpan.innerHTML = `<span class="element-label">${node.label || node.tagName.toLowerCase()}</span>`;
            labelSpan.innerHTML += ` <span class="element-tagname">${node.tagName.toLowerCase()}</span>`;
            labelSpan.innerHTML += ` <span class="element-id">${node.elementId ? '#' + node.elementId : '@' + node.id}</span>`;
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

    listContainer.querySelector('.placeholder').classList.add('hidden');
    listContainer.querySelector('ul')?.remove();
    listContainer.appendChild(convertToUnorderedList(tree));
}
const refreshAttributesPanel = () => {
    //
    const listContainer = document.querySelector('#attributes-panel .content__container');

    listContainer.querySelectorAll('.attribute-container').forEach(element => element.remove());

    // If no element is selected
    if (! selectedElement) {
        // show the placeholder element
        listContainer.querySelector('.placeholder').classList.remove('hidden');
        return;
    }

    listContainer.querySelector('.placeholder').classList.add('hidden');
    apiSchema.htmlAttributes
        .filter(attribute =>
            (
                attribute.belongsTo === 'global' ||
                // TODO: add support for format like "input|type=file"
                attribute.belongsTo.includes(selectedElement.tagName.toLowerCase())
            ) &&
            ! [
                // 'class',
                // 'slot',
                // 'style',
            ].includes(attribute.name)
        )
        .forEach(attribute => {
            const attributeContainer = document.createElement('div');
            attributeContainer.classList.add('attribute-container');

            // Create the checkbox
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `attribute-${attribute.name}`;
            checkbox.classList.add('attribute-checkbox');
            attributeContainer.appendChild(checkbox);

            // Create the attribute name
            const attributeName = document.createElement('label');
            attributeName.innerText = attribute.name;
            attributeName.htmlFor = `attribute-${attribute.name}`;
            attributeName.classList.add('attribute-name');
            attributeContainer.appendChild(attributeName);

            // If the attribute type is char
            if (attribute.type === 'char') {
                // create the input box
                const inputBox = document.createElement('input');
                inputBox.type = 'text';
                inputBox.maxLength = 1;
                inputBox.classList.add('attribute-value');
                attributeContainer.appendChild(inputBox);
            }

            // If the attribute type is string
            if (attribute.type === 'string') {
                // create the input box
                const inputBox = document.createElement('input');
                inputBox.type = 'text';
                inputBox.classList.add('attribute-value');
                attributeContainer.appendChild(inputBox);
            }

            // If the attribute type is number
            if (attribute.type === 'number') {
                // create the input box
                const inputBox = document.createElement('input');
                inputBox.type = 'number';
                inputBox.classList.add('attribute-value');
                attributeContainer.appendChild(inputBox);
            }

            // If the attribute type is enum
            if (attribute.type === 'enum') {
                // create the input box
                const inputBox = document.createElement('input');
                inputBox.type = 'text';
                inputBox.classList.add('attribute-value');
                attributeContainer.appendChild(inputBox);

                // create the datalist
                const dataList = document.createElement('datalist');
                dataList.id = `datalist-${attribute.name}`;
                attribute.options.forEach(option => {
                    if (
                        option.belongsTo !== 'global' &&
                        ! option.belongsTo.includes(selectedElement.tagName.toLowerCase())
                    ) {
                        return;
                    }
                    const optionBox = document.createElement('option');
                    optionBox.value = option.value || '[empty]';
                    optionBox.innerText = option.value || '[empty]';
                    dataList.appendChild(optionBox);
                });
                attributeContainer.appendChild(dataList);

                // associate the input box with the datalist
                inputBox.setAttribute('list', `datalist-${attribute.name}`);
            }

            // If the attribute type is boolean
            if (attribute.type === 'boolean') {
                const divisionBox = document.createElement('div');
                divisionBox.innerText = '[true]';
                divisionBox.classList.add('attribute-value');
                attributeContainer.appendChild(divisionBox);
            }

            // If the attribute type is dict
            if (attribute.type === 'dict') {
                // create the input box
                // FIXME: should be a dynamic list of key-value pairs
                const inputBox = document.createElement('input');
                inputBox.type = 'text';
                inputBox.classList.add('attribute-value');
                attributeContainer.appendChild(inputBox);
            }

            // TODO: add support for custom attribute option indicated by the "etc" key

            listContainer.appendChild(attributeContainer);
        });
};
const refreshPropertiesPanel = () => {
    //
    const listContainer = document.querySelector('#properties-panel .content__container');

    // If no element is selected
    if (! selectedElement) {
        // show the placeholder element
        listContainer.querySelector('.placeholder').classList.remove('hidden');
        listContainer.querySelectorAll('.panel__section').forEach(element => element.classList.add('hidden'));
        return;
    }

    listContainer.querySelector('.placeholder').classList.add('hidden');
    listContainer.querySelectorAll('.panel__section').forEach(element => element.classList.remove('hidden'));

    const { width, height, top, left } = selectedElement.boundingRect;
    const { top: marginTop, left: marginLeft, right: marginRight, bottom: marginBottom } = selectedElement.margins;
    const { top: borderTop, left: borderLeft, right: borderRight, bottom: borderBottom } = selectedElement.borders;
    const { top: paddingTop, left: paddingLeft, right: paddingRight, bottom: paddingBottom } = selectedElement.paddings;

    // Refresh the box model section
    const boxModel = listContainer.querySelector('#spacing-section .box-model');
    boxModel.querySelector('.element__width').innerText = parseFloat(width.toFixed(3));
    boxModel.querySelector('.element__height').innerText = parseFloat(height.toFixed(3));
    boxModel.querySelector('.margin__top').innerText = marginTop;
    boxModel.querySelector('.margin__left').innerText = marginLeft;
    boxModel.querySelector('.margin__right').innerText = marginRight;
    boxModel.querySelector('.margin__bottom').innerText = marginBottom;
    boxModel.querySelector('.border__top').innerText = borderTop;
    boxModel.querySelector('.border__left').innerText = borderLeft;
    boxModel.querySelector('.border__right').innerText = borderRight;
    boxModel.querySelector('.border__bottom').innerText = borderBottom;
    boxModel.querySelector('.padding__top').innerText = paddingTop;
    boxModel.querySelector('.padding__left').innerText = paddingLeft;
    boxModel.querySelector('.padding__right').innerText = paddingRight;
    boxModel.querySelector('.padding__bottom').innerText = paddingBottom;

    // Refresh the navigation section
    refreshNavigationSection();
};
const refreshNavigationSection = () => {
    const listContainer = document.querySelector('#properties-panel .content__container');
    const navigator = listContainer.querySelector('#position-and-scaling-section .navigator');

    const devicePixelRatio = window.devicePixelRatio;
    const navigatorBoundingRect = navigator.getBoundingClientRect();

    // Set the "actual" size of the canvas
    navigator.width = navigatorBoundingRect.width * devicePixelRatio;
    navigator.height = navigatorBoundingRect.height * devicePixelRatio;

    // Get the 2D context of the canvas
    const ctx = navigator.getContext('2d', { alpha: false });

    // Scale the context to ensure correct drawing operations
    ctx.scale(devicePixelRatio, devicePixelRatio);

    function hexToRgba(hex) {
        hex = hex.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, 1.0)`;
    }

    // Clear the canvas
    ctx.clearRect(0, 0, navigator.width, navigator.height);

    // Draw the navigator background
    ctx.fillStyle = hexToRgba(getComputedStyle(document.documentElement).getPropertyValue('--color-secondary'));
    ctx.fillRect(0, 0, navigator.width, navigator.height);

    // Update the navigator aspect ratio to match the main canvas aspect ratio
    const mainCanvasBoundingRect = mainCanvas.contentDocument.documentElement.getBoundingClientRect();
    const mainCanvasAspectRatio = mainCanvasBoundingRect.width / mainCanvasBoundingRect.height;

    // Fit the body to the navigator
    const bodyBoudingRect = mainCanvas.contentDocument.body.getBoundingClientRect();
    const bodyAspectRatio = bodyBoudingRect.width / bodyBoudingRect.height;
    if (bodyAspectRatio > mainCanvasAspectRatio) {
        mBody = {
            top: (navigator.height - (navigator.width / bodyAspectRatio)) / 2,
            left: 0,
            width: navigator.width,
            height: navigator.width / bodyAspectRatio
        };
        if (mBody.height > navigator.height) {
            mBody.height = navigator.height;
            mBody.width = navigator.height * bodyAspectRatio;
            mBody.top = 0;
            mBody.left = (navigator.width - mBody.width) / 2;
        }
    } else {
        // TODO: make the overflowed elements fit into the navigator
        mBody = {
            top: 0,
            left: (navigator.width - (navigator.height * bodyAspectRatio)) / 2,
            width: navigator.height * bodyAspectRatio,
            height: navigator.height
        };
        if (mBody.width > navigator.width) {
            mBody.width = navigator.width;
            mBody.height = navigator.width / bodyAspectRatio;
            mBody.top = (navigator.height - mBody.height) / 2;
            mBody.left = 0;
        }
    }

    // Draw the body
    ctx.fillStyle = hexToRgba(getComputedStyle(document.documentElement).getPropertyValue('--color-gray'));
    ctx.fillRect(mBody.left, mBody.top, mBody.width, mBody.height);

    // Add border to the body
    ctx.strokeStyle = hexToRgba(getComputedStyle(document.documentElement).getPropertyValue('--color-base'));
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.strokeRect(mBody.left, mBody.top, mBody.width, mBody.height);

    if (! selectedElement) {
        return; // do nothing
    }

    // Update the element position in the navigator
    const selectedElementBoundingRect = selectedElement.boundingRect;
    const mBodyScaleFactor = mBody.width / bodyBoudingRect.width;
    mElement = {
        width: selectedElementBoundingRect.width * mBodyScaleFactor,
        height: selectedElementBoundingRect.height * mBodyScaleFactor,
        top: (selectedElementBoundingRect.top - bodyBoudingRect.top) * mBodyScaleFactor,
        left: (selectedElementBoundingRect.left - bodyBoudingRect.left) * mBodyScaleFactor
    };

    // Draw the element
    ctx.fillStyle = hexToRgba(getComputedStyle(document.documentElement).getPropertyValue('--color-light-gray'));
    ctx.fillRect(mBody.left + mElement.left, mBody.top + mElement.top, mElement.width, mElement.height);

    // Add border to the element
    ctx.strokeStyle = hexToRgba(getComputedStyle(document.documentElement).getPropertyValue('--color-base'));
    ctx.setLineDash([]);
    ctx.strokeRect(mBody.left + mElement.left, mBody.top + mElement.top, mElement.width, mElement.height);
};
const populateTemplatesPanel = () => {
    const listContainer = document.querySelector('#templates-panel .content__container');

    // Remove the placeholder element from the templates panel
    listContainer.querySelector('.placeholder').remove();

    // Populate template options
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
                // 'template',
                // 'slot',
            ].includes(template.tag)
        )
        .forEach(template => {
            const contentOption = document.createElement('div');
            contentOption.classList.add('content-option');
            contentOption.classList.add('template-element');
            contentOption.dataset.label = template.name;
            contentOption.dataset.tagname = template.tag;
            contentOption.innerHTML = `${template.name} &lt;${template.tag}&gt;`;
            contentOption.title = template.description;
            contentOption.id = `uw-template-element-${template.tag}`;
            listContainer.appendChild(contentOption);
        });

    // Attach draggable events to template elements
    makeTemplateElementsDraggable();
}

// Handler for the element box model panel section
document.getElementById('spacing-section').addEventListener('mouseenter', () => {
    // Send a request to show the box model to the main canvas
    mainCanvas.contentWindow.postMessage({
        type: 'element:show-box-model',
        payload: {},
    }, '*');
});
document.getElementById('spacing-section').addEventListener('mouseleave', () => {
    // Send a request to hide the box model to the main canvas
    mainCanvas.contentWindow.postMessage({
        type: 'element:hide-box-model',
        payload: {},
    }, '*');
});

// Handler for mouse down event on the main window
window.addEventListener('mousedown', event => {
    // Update the focused element
    focusedPanelElement = event.target;
    // If the focused element does not have an ID
    if (! focusedPanelElement.id) {
        // find the closest parent element with an ID
        focusedPanelElement = focusedPanelElement.closest('[id]');
    }
}, { capture: true });

// Handler for receiving messages from the main canvas
window.addEventListener('message', event => {
    // Handle the document tree update
    if (event.data.type === 'document:tree') {
        const documentTree = event.data.payload.tree;

        // refresh the outline panel
        refreshOutlinePanel(documentTree);

        // if previous focused element exist
        if (focusedPanelElement) {
            // find the selected element within the focused element
            const selectedElement = focusedPanelElement.querySelector('.selected');

            // re-focus the target element
            selectedElement ? selectedElement.focus() : focusedPanelElement.focus();
        }
    }

    // Handle the element selection
    if (event.data.type === 'element:select') {
        selectedElement = event.data.payload;

        document.querySelector('#outline-panel .breadcrumb').classList.remove('expanded');

        document.querySelectorAll('#outline-panel .content__container button').forEach(element => {
            // remove the selected class from all elements
            element.classList.remove('selected');

            // find the selected element
            if (element.getAttribute('data-uw-id') === selectedElement?.id) {
                // mark the selected element
                element.classList.add('selected');

                // update the breadcrumb
                const breadcrumb = document.querySelector('#outline-panel .breadcrumb');
                breadcrumb.innerHTML = '';
                while (element) {
                    const breadcrumbItem = document.createElement('span');
                    breadcrumbItem.innerText = element.dataset.tagname;
                    breadcrumbItem.setAttribute('data-uw-id', element.dataset.uwId);
                    breadcrumbItem.addEventListener('click', event => {
                        // Send the selected element ID to the main canvas
                        mainCanvas.contentWindow.postMessage({
                            type: 'element:select',
                            payload: {
                                id: event.target.dataset.uwId,
                            },
                        }, '*');
                    });
                    breadcrumb.insertBefore(breadcrumbItem, breadcrumb.firstChild);
                    if (
                        element.dataset.tagname === 'body' ||
                        element?.parentElement?.tagName.toLowerCase() !== 'li'
                    ) {
                        break;
                    }
                    element = element.parentElement?.parentElement?.parentElement?.querySelector('button');
                }
                breadcrumb.classList.add('expanded');
            }
        });

        // refresh the attributes and properties panels
        refreshAttributesPanel();
        refreshPropertiesPanel();
    }

    // Handle the element hovering
    if (event.data.type === 'element:hover') {
        hoveredElementId = event.data.payload.id;
        document.querySelectorAll('#outline-panel button').forEach(element => {
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

    if (event.data.type === 'canvas:focus') {
        // Unset the focused element
        focusedPanelElement = null;
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