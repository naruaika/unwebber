var appConfig = {};
var apiSchema = {};

var focusedPanelElement = null;
var hoveredElementId = null;
var selectedElement = null;
var templateElementId = null;

var canvasResizeTimeout;

var isViewportResizing = false;

const mainCanvas = document.getElementById('main-canvas');

const kebabToCamel = (kebab) => kebab.replace(/-([a-z])/g, (g) => g[1].toUpperCase());

const hexToRgba = (hex) => {
    hex = hex.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const a = parseInt(hex.substring(6, 8) || 'ff', 16) / 255;
    return `rgba(${r}, ${g}, ${b}, ${a})`;
}

const unsetCanvasSizes = () => {
    // Set the "actual" size of the navigator
    const navigator = document.querySelector('#position-section .navigator');
    navigator.width = 0;
    navigator.height = 0;
    navigator.style.visibility = 'hidden';

    // Set the "actual" size of the canvas top ruler
    const topRuler = document.querySelector('.main-canvas__container .top-ruler');
    topRuler.width = 0;
    topRuler.height = 0;
    topRuler.style.visibility = 'hidden';

    // Set the "actual" size of the canvas left ruler
    const leftRuler = document.querySelector('.main-canvas__container .left-ruler');
    leftRuler.width = 0;
    leftRuler.height = 0;
    leftRuler.style.visibility = 'hidden';
}

const refreshCanvasRulers = (drawSelectedElement = true) => {
    const canvasContainer = document.querySelector('.main-canvas__container');
    const topRuler = canvasContainer.querySelector('.top-ruler');
    const leftRuler = canvasContainer.querySelector('.left-ruler');

    const devicePixelRatio = window.devicePixelRatio;
    const topRulerBoundingRect = topRuler.getBoundingClientRect();
    const leftRulerBoundingRect = leftRuler.getBoundingClientRect();

    // Set the "actual" size of the top ruler
    if (topRuler.width === 0 || topRuler.height === 0) {
        topRuler.width = topRulerBoundingRect.width * devicePixelRatio;
        topRuler.height = 20 * devicePixelRatio;
    }

    // Get the 2D context of the top ruler
    let ctx = topRuler.getContext('2d', { alpha: false });

    // Scale the context to ensure correct drawing operations
    ctx.scale(devicePixelRatio, devicePixelRatio);

    // Clear the canvas
    ctx.clearRect(0, 0, topRuler.width, topRuler.height);

    // Draw the ruler
    ctx.fillStyle = hexToRgba(getComputedStyle(document.documentElement).getPropertyValue('--color-primary'));
    ctx.fillRect(0, 0, topRuler.width, topRuler.height);

    // Draw the ruler ticks
    ctx.fillStyle = hexToRgba(getComputedStyle(document.documentElement).getPropertyValue('--color-base'));
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';

    // Draw the ruler ticks for the top ruler
    const rulerTickSmallHeight = 5;
    const rulerTickMediumHeight = 7;
    const rulerTickLargeHeight = 15;
    const rulerSmallStep = 5;
    const rulerStepMedium = 25;
    const rulerStepLarge = 50;
    const mainCanvasScrollLeft =
        mainCanvas.contentWindow.pageXOffset ||
        mainCanvas.contentDocument.documentElement.scrollLeft ||
        mainCanvas.contentDocument.body.scrollLeft ||
        0;
    for (let i = 0; i < topRulerBoundingRect.width; i += rulerSmallStep) {
        const tickHeight = i % rulerStepLarge === 0
            ? rulerTickLargeHeight
            : i % rulerStepMedium === 0
                ? rulerTickMediumHeight
                : rulerTickSmallHeight;
        ctx.fillRect(i * devicePixelRatio, 0, 1, tickHeight);
        if (i % rulerStepLarge === 0) {
            ctx.fillText(i + mainCanvasScrollLeft, i * devicePixelRatio + 4, 16);
        }
    }

    // Set the "actual" size of the left ruler
    if (leftRuler.width === 0 || leftRuler.height === 0) {
        leftRuler.width = 20 * devicePixelRatio;
        leftRuler.height = leftRulerBoundingRect.height * devicePixelRatio;
    }

    // Get the 2D context of the left ruler
    ctx = leftRuler.getContext('2d', { alpha: false });

    // Scale the context to ensure correct drawing operations
    ctx.scale(devicePixelRatio, devicePixelRatio);

    // Clear the canvas
    ctx.clearRect(0, 0, leftRuler.width, leftRuler.height);

    // Draw the ruler
    ctx.fillStyle = hexToRgba(getComputedStyle(document.documentElement).getPropertyValue('--color-primary'));
    ctx.fillRect(0, 0, leftRuler.width, leftRuler.height);

    // Draw the ruler ticks
    ctx.fillStyle = hexToRgba(getComputedStyle(document.documentElement).getPropertyValue('--color-base'));
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';

    // Draw the ruler ticks for the left ruler
    const mainCanvasScrollTop =
        mainCanvas.contentWindow.pageYOffset ||
        mainCanvas.contentDocument.documentElement.scrollTop ||
        mainCanvas.contentDocument.body.scrollTop ||
        0;
    for (let i = 0; i < leftRulerBoundingRect.height; i += rulerSmallStep) {
        const tickHeight = i % rulerStepLarge === 0
            ? rulerTickLargeHeight
            : i % rulerStepMedium === 0
                ? rulerTickMediumHeight
                : rulerTickSmallHeight;
        ctx.fillRect(0, i * devicePixelRatio, tickHeight, 1);
        if (i % rulerStepLarge === 0) {
            ctx.save();
            ctx.translate(16, i * devicePixelRatio + 4);
            ctx.rotate(-Math.PI / 2);
            ctx.fillText(i + mainCanvasScrollTop, 0, 0);
            ctx.restore();
        }
    }

    // Show the rulers
    topRuler.style.visibility = 'visible';
    leftRuler.style.visibility = 'visible';

    if (isViewportResizing) {
        return; // do nothing
    }

    if (! drawSelectedElement) {
        return; // do nothing
    }

    if (selectedElement) {
        // Fill the area to show the selected element position on the canvas
        ctx = topRuler.getContext('2d', { alpha: false });
        ctx.scale(devicePixelRatio, devicePixelRatio);
        ctx.fillStyle = hexToRgba(getComputedStyle(document.documentElement).getPropertyValue('--color-blue') + '55');
        ctx.fillRect(selectedElement.boundingRect.left, 0, selectedElement.boundingRect.width * devicePixelRatio, topRuler.height);
        ctx = leftRuler.getContext('2d', { alpha: false });
        ctx.scale(devicePixelRatio, devicePixelRatio);
        ctx.fillStyle = hexToRgba(getComputedStyle(document.documentElement).getPropertyValue('--color-blue') + '55');
        ctx.fillRect(0, selectedElement.boundingRect.top, leftRuler.width, selectedElement.boundingRect.height * devicePixelRatio);
    }
}

const onCanvasRulerMouseMove = (event) => {
    // // Send the request to show the ruler lines to the main canvas
    // mainCanvas.contentWindow.postMessage({
    //     type: 'document:show-ruler-lines',
    //     payload: {
    //         x: event.target.classList.contains('top-ruler')
    //             ? event.clientX - event.target.getBoundingClientRect().left
    //             : null,
    //         y: event.target.classList.contains('left-ruler')
    //             ? event.clientY - event.target.getBoundingClientRect().top
    //             : null,
    //     },
    // }, '*');
}

const onCanvasRulerMouseLeave = () => {
    // Send the request to hide the ruler lines to the main canvas
    mainCanvas.contentWindow.postMessage({
        type: 'document:hide-ruler-lines',
        payload: {},
    }, '*');
}

const onCanvasOverlayDragOver = (event) => {
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
}

const onCanvasOverlayDrop = (event) => {
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

    // Give the focus back to the main canvas
    mainCanvas.focus();
}

const onCanvasResize = () => {
    isViewportResizing = true;

    // Unset the canvas sizes
    unsetCanvasSizes();

    // Refresh the canvas rulers
    refreshCanvasRulers();

    // Send the resize event to the main canvas
    mainCanvas.contentWindow.postMessage({
        type: 'window:resize',
        payload: {},
    }, '*');

    clearTimeout(canvasResizeTimeout);
    canvasResizeTimeout = setTimeout(() => {
        isViewportResizing = false;

        // Refresh the canvas rulers
        refreshCanvasRulers();

        // Refresh the navigator
        refreshPositionSectionOnPropertiesPanel();

        // Send the resize event to the main canvas
        mainCanvas.contentWindow.postMessage({
            type: 'window:afterresize',
            payload: {},
        }, '*');
    }, 250);
}

const refreshOutlinePanel = (documentTree) => {
    const listContainer = document.querySelector('#outline-panel .content__container');

    // Convert the document tree to unordered list elements
    const convertToUnorderedList = (tree) => {
        const createListItem = (node, level) => {
            const listItem = document.createElement('li');

            // Add the button element
            const button = document.createElement('button');
            button.style.paddingLeft = `${8 + level * 15}px`;
            button.setAttribute('data-tag-name', node.tagName.toLowerCase());
            button.setAttribute('data-uw-id', node.id);
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
            labelSpan.innerHTML += ` <span class="element-id">${node.elementId ? '#' + node.elementId : node.id ? '@' + node.id : ''}</span>`;
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

    listContainer.querySelector('.placeholder')?.classList.add('hidden');
    listContainer.querySelector('ul')?.remove();
    listContainer.appendChild(convertToUnorderedList(documentTree));
}

const refreshHoveredElementOnOutlinePanel = () => {
    document.querySelectorAll('#outline-panel button').forEach(element => {
        // Remove the hovered class from all elements
        element.classList.remove('hovered');

        // Find the hovered element
        if (element.getAttribute('data-uw-id') === hoveredElementId) {
            // mark the hovered element
            element.classList.add('hovered');

            // make the hovered element visible on the outline panel
            scrollOutlinePanelToElement(hoveredElementId);
        }
    });
}

const refreshSelectedElementOnOutlinePanel = () => {
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
                breadcrumbItem.innerText = element.dataset.tagName;
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
                breadcrumbItem.addEventListener('mouseover', event => {
                    // Send the hovered element ID to the main canvas
                    mainCanvas.contentWindow.postMessage({
                        type: 'element:hover',
                        payload: {
                            id: event.target.dataset.uwId,
                        },
                    }, '*');
                });
                breadcrumb.insertBefore(breadcrumbItem, breadcrumb.firstChild);
                if (
                    element.dataset.tagName === 'body' ||
                    element?.parentElement?.tagName.toLowerCase() !== 'li'
                ) {
                    break;
                }
                element = element.parentElement?.parentElement?.parentElement?.querySelector('button');
            }
            breadcrumb.classList.add('expanded');
        }
    });
}

const scrollOutlinePanelToElement = (elementId) => {
    // If it is not already visible on the viewport
    const listContainer = document.querySelector('#outline-panel .content__container');
    const containerRect = listContainer.getBoundingClientRect();
    const element = document.querySelector(`#outline-panel button[data-uw-id="${elementId}"]`);
    const elementRect = element.getBoundingClientRect();
    if (
        elementRect.top < containerRect.top ||
        elementRect.top > containerRect.bottom
    ) {
        // scroll the hovered element into view
        // NOTE: sometimes the scrolling function not working at all
        // so a timeout was added to ensure the scrolling function works
        window.setTimeout(() => {
            element.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                inline: 'nearest'
            });
        }, 50);
    }
}

const onOutlinePanelMouseOver = (event) => {
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
}

const onOutlinePanelMouseDown = (event) => {
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
}

const onOutlinePanelMouseOut = () => {
    // Update the hovered element ID
    hoveredElementId = null;

    // Send the request to remove the hover effect to the main canvas
    mainCanvas.contentWindow.postMessage({
        type: 'element:unhover',
        payload: {},
    }, '*');
}

const onOutlinePanelKeyDown = (event) => {
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

    if (event.key === 'x' && event.ctrlKey) {
        if (selectedElement?.dataset.uwId) {
            // Send the request to cut the selected element to the main canvas
            mainCanvas.contentWindow.postMessage({
                type: 'element:cut',
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
}

const refreshAttributesPanel = () => {
    //
    const listContainer = document.querySelector('#attributes-panel .content__container');

    listContainer.querySelectorAll('.field-container').forEach(element => element.remove());

    // If no element is selected
    if (! selectedElement) {
        // show the placeholder element
        listContainer.querySelector('.placeholder')?.classList.remove('hidden');
        return;
    }

    listContainer.querySelector('.placeholder')?.classList.add('hidden');
    apiSchema.htmlAttributes
        .filter(attribute =>
            (
                attribute.belongsTo === 'global' ||
                // TODO: add support for format like "input|type=file"
                attribute.belongsTo.includes(selectedElement.tagName.toLowerCase())
            ) &&
            ! [
                // TODO: implement special treatment for these attributes
                // 'draggable',
                // 'contenteditable',
                // 'inert',
                // 'autofocus',
                // 'enterkeyhint',
                'style',
            ].includes(attribute.name)
        )
        .forEach(attribute => {
            const attributeContainer = document.createElement('fieldset');
            attributeContainer.classList.add('field-container');

            const cachedAttribute = JSON.parse(selectedElement.dataset.uwAttributes || '{}')[attribute.name];

            // Create the checkbox
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.dataset.key = attribute.name;
            checkbox.checked = cachedAttribute?.checked || false;
            checkbox.id = `attribute-${attribute.name}`;
            checkbox.classList.add('field-checkbox');
            checkbox.addEventListener('change', event => {
                // send the property value to the main canvas
                const inputBox = event.target.parentElement.querySelector('.field-value');
                mainCanvas.contentWindow.postMessage({
                    type: 'element:attribute',
                    payload: {
                        id: selectedElement.id,
                        attribute: event.target.dataset.key,
                        value: attribute.type === 'boolean' ? true : inputBox.value || inputBox.placeholder,
                        checked: event.target.checked ? 'true' : 'false',
                    },
                }, '*');
            });
            attributeContainer.appendChild(checkbox);

            // Create the label
            const label = document.createElement('label');
            label.innerText = attribute.name;
            label.title = attribute.name;
            label.htmlFor = `attribute-${attribute.name}`;
            label.classList.add('field-name');
            attributeContainer.appendChild(label);

            //
            const onKeyDown = event => {
                if (event.key === 'Enter' || event.key === 'Tab') {
                    // Send the attribute value to the main canvas
                    const checkBox = event.target.parentElement.querySelector('.field-checkbox');
                    mainCanvas.contentWindow.postMessage({
                        type: 'element:attribute',
                        payload: {
                            id: selectedElement.id,
                            attribute: event.target.dataset.key,
                            value: event.target.value,
                            checked: checkBox.checked ? 'true' : 'false',
                        },
                    }, '*');
                    return;
                }
                if (event.key === 'Escape') {
                    // Restore the attribute value
                    event.target.value = cachedAttribute?.value;
                    return;
                }
            }

            // If the attribute type is char, string, or number
            if (['char', 'string', 'number'].includes(attribute.type)) {
                // create the input box
                const inputBox = document.createElement('input');
                inputBox.type = attribute.type === 'number' ? 'number' : 'text';
                inputBox.value = cachedAttribute?.value || '';
                inputBox.dataset.key = attribute.name;
                if (attribute.type === 'char') {
                    inputBox.maxLength = 1;
                }
                inputBox.classList.add('field-value');
                inputBox.addEventListener('keydown', onKeyDown);
                attributeContainer.appendChild(inputBox);
            }

            // If the attribute type is enum
            if (attribute.type === 'enum') {
                const filterDropdownItems = () => {
                    const query = inputBox.value.toLowerCase();
                    const filteredValues = [];
                    // filter the values based on the query
                    attribute.options.forEach(option => {
                        if (
                            ! option.value.toLowerCase().includes(query) ||
                            (
                                option.belongsTo !== 'global' &&
                                ! option.belongsTo.includes(selectedElement.tagName.toLowerCase())
                            )
                        ) {
                            return;
                        }
                        filteredValues.push(option.value || '[empty]');
                    });
                    // create the dropdown items
                    dropdownList.innerHTML = '';
                    filteredValues.forEach(value => {
                        const item = document.createElement('div');
                        item.classList.add('dropdown-item');
                        item.textContent = value;
                        item.addEventListener('click', () => {
                            inputBox.value = value;
                            dropdownList.classList.add('hidden');
                            inputBox.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
                        });
                        dropdownList.appendChild(item);
                    });
                    if (filteredValues.length > 0) {
                        // show the dropdown list
                        dropdownList.classList.remove('hidden');
                        // calculate the best position for the dropdown list
                        const attributeContainerRect = attributeContainer.getBoundingClientRect();
                        if (attributeContainerRect.bottom + dropdownList.offsetHeight > listContainer.offsetHeight) {
                            dropdownList.style.top = 'unset';
                            dropdownList.style.bottom = '100%';
                        } else {
                            dropdownList.style.bottom = 'unset';
                            dropdownList.style.top = '100%';
                        }
                        dropdownList.style.right = '8px';
                    } else {
                        // hide the dropdown list
                        dropdownList.classList.add('hidden');
                    }
                }

                // create the input box
                const inputBox = document.createElement('input');
                inputBox.type = 'text';
                inputBox.value = cachedAttribute?.value || '';
                inputBox.dataset.key = attribute.name;
                inputBox.classList.add('field-value');
                inputBox.addEventListener('keydown', onKeyDown);
                attributeContainer.appendChild(inputBox);

                // create the dropdown list
                const dropdownList = document.createElement('div');
                dropdownList.setAttribute('popover', 'auto');
                dropdownList.id = `attribute-${attribute.name}-dropdown`;
                dropdownList.classList.add('field-options');
                dropdownList.classList.add('scrollable');
                dropdownList.classList.add('hidden');
                inputBox.setAttribute('popovertarget', dropdownList.id);
                attributeContainer.appendChild(dropdownList);

                //
                inputBox.addEventListener('input', filterDropdownItems);
                inputBox.addEventListener('focus', filterDropdownItems);
            }

            // If the attribute type is boolean
            if (attribute.type === 'boolean') {
                const divisionBox = document.createElement('div');
                divisionBox.innerText = '[true]';
                divisionBox.classList.add('field-value');
                attributeContainer.appendChild(divisionBox);
            }

            // If the attribute type is dict
            if (attribute.type === 'dict') {
                // create the input box
                // FIXME: should be a dynamic list of key-value pairs
                const inputBox = document.createElement('input');
                inputBox.type = 'text';
                inputBox.value = cachedAttribute?.value || '';
                inputBox.dataset.key = attribute.name;
                inputBox.classList.add('field-value');
                inputBox.addEventListener('keydown', onKeyDown);
                attributeContainer.appendChild(inputBox);
            }

            // TODO: add support for custom attribute option indicated by the "etc" key

            listContainer.appendChild(attributeContainer);
        });
}

const refreshPropertiesPanel = () => {
    //
    const listContainer = document.querySelector('#properties-panel .content__container');

    // If no element is selected
    if (! selectedElement) {
        // show the placeholder element
        listContainer.querySelector('.placeholder')?.classList.remove('hidden');
        listContainer.querySelectorAll('.panel__section').forEach(element => element.classList.add('hidden'));
        return;
    }

    listContainer.querySelector('.placeholder')?.classList.add('hidden');
    listContainer.querySelectorAll('.panel__section').forEach(element => element.classList.remove('hidden'));

    // Refresh the panel sections
    refreshLayoutSectionOnPropertiesPanel();
    refreshSpacingSectionOnPropertiesPanel();
    refreshPositionSectionOnPropertiesPanel();

    const formSchema = [
        {
            name: 'layout',
            fields: [
                'display', 'flex-basis', 'flex-direction', 'flex-grow', 'flex-shrink', 'flex-wrap', 'grid-area', 'grid-auto-columns',
                'grid-auto-flow', 'grid-auto-rows', 'grid-column', 'grid-column-end', 'grid-column-start', 'grid-row', 'grid-row-end',
                'grid-row-start', 'grid-template', 'grid-template-areas', 'grid-template-columns', 'grid-template-rows', 'align-content',
                'align-items', 'align-self', 'justify-content', 'justify-items', 'justify-self', 'gap', 'order',
            ],
        },
        {
            name: 'spacing',
            fields: [
                'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height', 'margin', 'margin-top', 'margin-right',
                'margin-bottom', 'margin-left', 'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
                'border-width', 'border-left-width', 'border-right-width', 'border-top-width', 'border-bottom-width',
            ],
        },
        {
            name: 'position',
            fields: [
                'position', 'top', 'right', 'bottom', 'left', 'z-index',
            ],
        },
        {
            name: 'typography',
            fields: [
                'font-family', 'font-size', 'font-style', 'font-weight', 'line-height', 'letter-spacing', 'text-align',
                'text-indent', 'text-transform'
            ],
        }
    ];

    const styleGlobalValueOptions = [
        'inherit',
        'initial',
        'revert',
        'revert-layer',
        'unset',
    ];

    // Populate the panel sections
    formSchema.forEach(sectionSchema => {
        // Find the form container
        const formContainer = listContainer.querySelector(`#${sectionSchema.name}-section .form`);

        // Clear the form container
        formContainer.innerHTML = '';

        // Populate the form fields
        sectionSchema.fields.forEach(fieldName => {
            //
            const propertySpecification = apiSchema.cssProperties.find(property => property.name === fieldName);

            // Check the field visibility rules
            const visibilityRules = propertySpecification?.visibilityRules || [];
            const compliedVisibilityRule = rule => {
                const appliedValue = selectedElement.computedStyle[kebabToCamel(rule.property)];
                switch (rule.operator) {
                    case 'inside in':
                        return rule.values.includes(selectedElement.parent?.computedStyle[rule.property] || '');
                    case 'in':
                        return rule.values.includes(appliedValue);
                    case 'equals':
                    default:
                        return appliedValue === rule.value;
                }
            };
            if (! visibilityRules.every(compliedVisibilityRule)) {
                return; // skip the field
            }

            //
            const cachedProperty = JSON.parse(selectedElement.dataset.uwProperties || '{}')[fieldName];
            const computedValue = selectedElement.computedStyle[kebabToCamel(fieldName)];

            //
            const propertyContainer = document.createElement('fieldset');
            propertyContainer.classList.add('field-container');

            // create the checkbox
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.dataset.key = fieldName;
            checkbox.checked = cachedProperty?.checked || false;
            checkbox.id = `property-${fieldName}`;
            checkbox.classList.add('field-checkbox');
            checkbox.addEventListener('change', event => {
                // send the property value to the main canvas
                const inputBox = event.target.parentElement.querySelector('.field-value');
                mainCanvas.contentWindow.postMessage({
                    type: 'element:style',
                    payload: {
                        id: selectedElement.id,
                        property: event.target.dataset.key,
                        value: inputBox.value || inputBox.placeholder,
                        checked: event.target.checked ? 'true' : 'false',
                    },
                }, '*');
            });
            propertyContainer.appendChild(checkbox);

            // Create the label
            const label = document.createElement('label');
            label.innerText = fieldName;
            label.title = fieldName;
            label.htmlFor = `property-${fieldName}`;
            label.classList.add('field-name');
            if (cachedProperty) {
                label.classList.add('field-modified');
            }
            propertyContainer.appendChild(label);

            // create the input box
            const inputBox = document.createElement('input');
            inputBox.type = 'text';
            inputBox.dataset.key = fieldName;
            inputBox.classList.add('field-value');
            inputBox.value = cachedProperty?.value || computedValue || propertySpecification.initialValue;
            inputBox.placeholder = propertySpecification.initialValue;
            inputBox.addEventListener('keydown', event => {
                if (event.key === 'Escape') {
                    // restore the property value
                    event.target.value = cachedProperty?.value || propertySpecification.initialValue;
                }
            });
            inputBox.addEventListener('change', event => {
                // send the property value to the main canvas
                const checkBox = event.target.parentElement.querySelector('.field-checkbox');
                mainCanvas.contentWindow.postMessage({
                    type: 'element:style',
                    payload: {
                        id: selectedElement.id,
                        property: event.target.dataset.key,
                        value: event.target.value,
                        checked: checkBox.checked ? 'true' : 'false',
                    },
                }, '*');
            });
            propertyContainer.appendChild(inputBox);

            // create the datalist
            if (propertySpecification.specifiedValues) {
                const filterDropdownItems = () => {
                    const query = inputBox.value.toLowerCase();
                    // filter the values based on the query
                    const filteredValues = [
                        ...propertySpecification.specifiedValues,
                        ...styleGlobalValueOptions,
                    ].filter(value => value.toLowerCase().includes(query));
                    // create the dropdown items
                    dropdownList.innerHTML = '';
                    filteredValues.forEach(value => {
                        const item = document.createElement('div');
                        item.classList.add('dropdown-item');
                        item.textContent = value;
                        item.addEventListener('click', () => {
                            inputBox.value = value;
                            dropdownList.classList.add('hidden');
                            inputBox.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
                        });
                        dropdownList.appendChild(item);
                    });
                    if (filteredValues.length > 0) {
                        // show the dropdown list
                        dropdownList.classList.remove('hidden');
                        // calculate the best position for the dropdown list
                        const propertyContainerRect = propertyContainer.getBoundingClientRect();
                        if (propertyContainerRect.bottom + dropdownList.offsetHeight > listContainer.offsetHeight) {
                            dropdownList.style.top = 'unset';
                            dropdownList.style.bottom = '100%';
                        } else {
                            dropdownList.style.bottom = 'unset';
                            dropdownList.style.top = '100%';
                        }
                        dropdownList.style.right = '8px';
                    } else {
                        // hide the dropdown list
                        dropdownList.classList.add('hidden');
                    }
                }

                // create the dropdown list
                const dropdownList = document.createElement('div');
                dropdownList.setAttribute('popover', 'auto');
                dropdownList.id = `property-${fieldName}-dropdown`;
                dropdownList.classList.add('field-options');
                dropdownList.classList.add('scrollable');
                inputBox.setAttribute('popovertarget', dropdownList.id);
                propertyContainer.appendChild(dropdownList);

                //
                inputBox.addEventListener('input', filterDropdownItems);
                inputBox.addEventListener('focus', filterDropdownItems);
            }

            //
            formContainer.appendChild(propertyContainer);
        });
    });
}

const refreshLayoutSectionOnPropertiesPanel = () => {
    const listContainer = document.querySelector('#properties-panel .content__container');
    const simulator = listContainer.querySelector('#layout-section .simulator');

    // Simulate the layout of the selected parent element and its children
    // and the selected element itself and its children
    // TODO: if it has grid layout, draw the grid lines
    simulator.innerHTML = '';
    const parentElement = document.createElement('div');
    Object.keys(selectedElement.parent.computedStyle).forEach(style => {
        parentElement.style[style] = selectedElement.parent.computedStyle[style];
    });
    parentElement.classList.add('parent-element');
    let childIndex = 0;
    for (let child of selectedElement.parent.children) {
        if (
            child.computedStyle.position === 'absolute' ||
            child.computedStyle.position === 'fixed' ||
            ['head', 'script'].includes(child.tagName.toLowerCase())
        ) {
            continue;
        }
        const childElement = document.createElement('div');
        Object.keys(child.computedStyle).forEach(style => {
            childElement.style[style] = child.computedStyle[style];
        });
        if (child.id === selectedElement.id) {
            childElement.classList.add('element');
            let grandChildIndex = 0;
            if (selectedElement.children.length === 0) {
                childElement.innerText = 'E';
            }
            for (let grandChild of selectedElement.children) {
                if (
                    grandChild.computedStyle.position === 'absolute' ||
                    grandChild.computedStyle.position === 'fixed' ||
                    ['head', 'script'].includes(grandChild.tagName.toLowerCase())
                ) {
                    continue;
                }
                const grandChildElement = document.createElement('div');
                Object.keys(grandChild.computedStyle).forEach(style => {
                    grandChildElement.style[style] = grandChild.computedStyle[style];
                });
                grandChildElement.classList.add('child-element');
                grandChildElement.innerText = `C${++grandChildIndex}`;
                childElement.appendChild(grandChildElement);
            }
            childIndex++;
        } else {
            childElement.innerText = `S${++childIndex}`;
            childElement.classList.add('sibling-element');
        }
        parentElement.appendChild(childElement);
    }
    simulator.appendChild(parentElement);
}

const onLayoutSimulatorMouseEnter = () => {
    // Make the selected element visible on the outline panel
    scrollOutlinePanelToElement(selectedElement.id);

    // Send a request to show the layout identifiers to the main canvas
    mainCanvas.contentWindow.postMessage({
        type: 'element:show-layout-identifiers',
        payload: {},
    }, '*');
}

const onLayoutSimulatorMouseLeave = () => {
    // Send a request to hide the layout identifiers to the main canvas
    mainCanvas.contentWindow.postMessage({
        type: 'element:hide-layout-identifiers',
        payload: {},
    }, '*');
}

const refreshSpacingSectionOnPropertiesPanel = () => {
    const listContainer = document.querySelector('#properties-panel .content__container');
    const boxModel = listContainer.querySelector('#spacing-section .box-model');

    boxModel.querySelector('.element__width').innerText = parseFloat(selectedElement.boundingRect.width.toFixed(3));
    boxModel.querySelector('.element__height').innerText = parseFloat(selectedElement.boundingRect.height.toFixed(3));
    boxModel.querySelector('.margin__top').innerText = parseFloat(parseFloat(selectedElement.computedStyle.marginTop).toFixed(3));
    boxModel.querySelector('.margin__left').innerText = parseFloat(parseFloat(selectedElement.computedStyle.marginLeft).toFixed(3));
    boxModel.querySelector('.margin__right').innerText = parseFloat(parseFloat(selectedElement.computedStyle.marginRight).toFixed(3));
    boxModel.querySelector('.margin__bottom').innerText = parseFloat(parseFloat(selectedElement.computedStyle.marginBottom).toFixed(3));
    boxModel.querySelector('.border__top').innerText = parseFloat(parseFloat(selectedElement.computedStyle.borderTopWidth).toFixed(3));
    boxModel.querySelector('.border__left').innerText = parseFloat(parseFloat(selectedElement.computedStyle.borderLeftWidth).toFixed(3));
    boxModel.querySelector('.border__right').innerText = parseFloat(parseFloat(selectedElement.computedStyle.borderRightWidth).toFixed(3));
    boxModel.querySelector('.border__bottom').innerText = parseFloat(parseFloat(selectedElement.computedStyle.borderBottomWidth).toFixed(3));
    boxModel.querySelector('.padding__top').innerText = parseFloat(parseFloat(selectedElement.computedStyle.paddingTop).toFixed(3));
    boxModel.querySelector('.padding__left').innerText = parseFloat(parseFloat(selectedElement.computedStyle.paddingLeft).toFixed(3));
    boxModel.querySelector('.padding__right').innerText = parseFloat(parseFloat(selectedElement.computedStyle.paddingRight).toFixed(3));
    boxModel.querySelector('.padding__bottom').innerText = parseFloat(parseFloat(selectedElement.computedStyle.paddingBottom).toFixed(3));
}

const onSpacingBoxModelMouseEnter = () => {
    // Make the selected element visible on the outline panel
    scrollOutlinePanelToElement(selectedElement.id);

    // Send a request to show the box model to the main canvas
    mainCanvas.contentWindow.postMessage({
        type: 'element:show-box-model',
        payload: {},
    }, '*');
}

const onSpacingBoxModelMouseLeave = () => {
    // Send a request to hide the box model to the main canvas
    mainCanvas.contentWindow.postMessage({
        type: 'element:hide-box-model',
        payload: {},
    }, '*');
}

const refreshPositionSectionOnPropertiesPanel = () => {
    if (isViewportResizing) {
        return; // do nothing
    }

    const listContainer = document.querySelector('#properties-panel .content__container');
    const navigator = listContainer.querySelector('#position-section .navigator');

    const devicePixelRatio = window.devicePixelRatio;

    // Set the "actual" size of the canvas
    if (navigator.width === 0 || navigator.height === 0) {
        const navigatorBoundingRect = navigator.getBoundingClientRect();
        navigator.width = navigatorBoundingRect.width * devicePixelRatio;
        navigator.height = navigatorBoundingRect.height * devicePixelRatio;
    }

    // Get the 2D context of the canvas
    const ctx = navigator.getContext('2d', { alpha: false });

    // Scale the context to ensure correct drawing operations
    ctx.scale(devicePixelRatio, devicePixelRatio);

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
    ctx.setLineDash([]);
    ctx.strokeRect(mBody.left, mBody.top, mBody.width, mBody.height);

    if (! selectedElement) {
        return; // do nothing
    }

    // Calculate the element position in the navigator
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
    ctx.strokeStyle = hexToRgba(getComputedStyle(document.documentElement).getPropertyValue('--color-blue'));
    ctx.setLineDash([]);
    ctx.strokeRect(mBody.left + mElement.left, mBody.top + mElement.top, mElement.width, mElement.height);

    // Calculate the virtual viewport (which is the main canvas) position in the navigator
    const mainCanvasViewportBoundingRect = mainCanvas.contentDocument.documentElement.getBoundingClientRect();
    const mainCanvasScrollTop =
        mainCanvas.contentWindow.pageYOffset ||
        mainCanvas.contentDocument.documentElement.scrollTop ||
        mainCanvas.contentDocument.body.scrollTop ||
        0;
    const mainCanvasScrollLeft =
        mainCanvas.contentWindow.pageXOffset ||
        mainCanvas.contentDocument.documentElement.scrollLeft ||
        mainCanvas.contentDocument.body.scrollLeft ||
        0;
    mViewport = {
        width: mainCanvasBoundingRect.width * mBodyScaleFactor,
        height: mainCanvasBoundingRect.height * mBodyScaleFactor,
        top: (mainCanvasViewportBoundingRect.top - bodyBoudingRect.top + mainCanvasScrollTop) * mBodyScaleFactor,
        left: (mainCanvasViewportBoundingRect.left - bodyBoudingRect.left + mainCanvasScrollLeft) * mBodyScaleFactor
    };

    // Draw the viewport if it meets the condition
    if (mViewport.height < mBody.height || mViewport.width < mBody.width) {
        ctx.strokeStyle = hexToRgba(getComputedStyle(document.documentElement).getPropertyValue('--color-base'));
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(mBody.left + mViewport.left, mBody.top + mViewport.top, mViewport.width, mViewport.height);
    }

    // Show the navigator
    navigator.style.visibility = 'visible';
}

const onPositionNavigatorMouseEnter = () => {
    // Make the selected element visible on the outline panel
    scrollOutlinePanelToElement(selectedElement.id);

    // Send a request to show the box model to the main canvas
    mainCanvas.contentWindow.postMessage({
        type: 'element:scroll-to',
        payload: {
            id: selectedElement.id,
        },
    }, '*');
}

const populateTemplatesPanel = () => {
    const listContainer = document.querySelector('#templates-panel .content__container');

    // Remove the placeholder element from the templates panel
    listContainer.querySelector('.placeholder').remove();

    // Add search input to the templates panel
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search templates...';
    searchInput.classList.add('panel__search');
    searchInput.addEventListener('input', event => {
        const query = event.target.value.toLowerCase();
        listContainer.querySelectorAll('.template-element').forEach(element => {
            if (element.dataset.label.toLowerCase().includes(query)) {
                element.classList.remove('hidden');
            } else {
                element.classList.add('hidden');
            }
        });
    });
    listContainer.append(searchInput, listContainer.firstChild);

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
            contentOption.dataset.tagName = template.tag;
            contentOption.innerHTML = `${template.name} &lt;${template.tag}&gt;`;
            contentOption.title = template.description;
            contentOption.id = `uw-template-element-${template.tag}`;
            listContainer.appendChild(contentOption);
        });

    // Attach draggable events to template elements
    makeTemplateElementsDraggable();
}

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

            // Refresh the canvas rulers
            refreshCanvasRulers(drawSelectedElement = false);

            //
            const tagSpecification = apiSchema.htmlElements.find(htmlElement =>
                htmlElement.tag === event.target.dataset.tagName.toLowerCase()
            )
            window.unwebber.apis.template(tagSpecification.tag, 'element').then(template => {
                // Convert the template string to a DOM element
                const element = new DOMParser().parseFromString(template, 'text/html').body.firstChild;

                // Send the template element to the main canvas
                mainCanvas.contentWindow.postMessage({
                    type: 'element:beforeinsert',
                    payload: {
                        template: element.outerHTML,
                    },
                }, '*');
            });
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

            // Refresh the canvas rulers
            refreshCanvasRulers();
        });

        element.addEventListener('dragover', event => {
            event.preventDefault();
        });
    });
}

const regainPanelElementFocus = () => {
    // If previous focused element exist
    if (focusedPanelElement) {
        // Find the selected element within the focused element
        const selectedElement = focusedPanelElement.querySelector('.selected');

        // Re-focus the target element
        selectedElement ? selectedElement.focus() : focusedPanelElement.focus();
    }
}

const onWindowKeyDown = (event) => {
    if (event.key === 'Escape') {
        if (event.target.classList.contains('field-value')) {
            // Hide the popover element
            event.target.parentElement?.querySelector('.field-options')?.classList.add('hidden');
        }
        return;
    }

    if (event.ctrlKey && event.key === 'z') {
        // Send the undo request to the main canvas if the focus is within the outline panel
        if (
            document.activeElement?.tagName.toLowerCase() === 'body' ||
            document.activeElement.closest('#outline-panel')
        ) {
            mainCanvas.contentWindow.postMessage({
                type: 'document:undo',
                payload: {},
            }, '*');
        } else {
            // TODO: Implement the undo feature for the other panels
        }
        return;
    }

    if (event.ctrlKey && event.key === 'y') {
        // Send the redo request to the main canvas if the focus is within the outline panel
        if (
            document.activeElement?.tagName.toLowerCase() === 'body' ||
            document.activeElement.closest('#outline-panel')
        ) {
                mainCanvas.contentWindow.postMessage({
                type: 'document:redo',
                payload: {},
            }, '*');
        } else {
            // TODO: Implement the undo feature for the other panels
        }
        return;
    }
}

const onWindowMouseDown = (event) => {
    // Update the focused element
    focusedPanelElement = event.target;
    // If the focused element does not have an ID
    if (! focusedPanelElement.id) {
        // find the closest parent element with an ID
        focusedPanelElement = focusedPanelElement.closest('[id]');
    }
}

const onWindowMessage = (event) => {
    // Handle the document tree update
    if (event.data.type === 'document:tree') {
        const documentTree = event.data.payload.tree;

        // Refresh the outline panel
        refreshOutlinePanel(documentTree);

        // Re-gain panel element focus
        regainPanelElementFocus();
    }

    // Handle the document scroll
    if (event.data.type === 'document:scroll') {
        if (selectedElement) {
            selectedElement.boundingRect = event.data.payload.selectedElement.boundingRect;
        }

        // Refresh the canvas rulers and the navigator
        refreshCanvasRulers();
        refreshPositionSectionOnPropertiesPanel();
    }

    // Handle the element selection
    if (event.data.type === 'element:select') {
        selectedElement = event.data.payload;

        // Refresh the canvas rulers
        refreshCanvasRulers();

        // Refresh the panels
        refreshSelectedElementOnOutlinePanel();
        refreshAttributesPanel();
        refreshPropertiesPanel();
    }

    // Handle the element hovering
    if (event.data.type === 'element:hover') {
        hoveredElementId = event.data.payload.id;

        // Refresh the hovered element on the outline panel
        refreshHoveredElementOnOutlinePanel();
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
}

document.addEventListener('DOMContentLoaded', () => {
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
    window.unwebber.apis.schema().then(schema => {
        apiSchema = schema;

        // Populate the templates panel
        populateTemplatesPanel();
    });

    //
    document.addEventListener('dragover', (event) => event.preventDefault());
    document.addEventListener('dragenter', (event) => event.preventDefault());

    //
    document.querySelector('.main-frame .top-ruler').addEventListener('mousemove', onCanvasRulerMouseMove);
    document.querySelector('.main-frame .top-ruler').addEventListener('mouseleave', onCanvasRulerMouseLeave);
    document.querySelector('.main-frame .left-ruler').addEventListener('mousemove', onCanvasRulerMouseMove);
    document.querySelector('.main-frame .left-ruler').addEventListener('mouseleave', onCanvasRulerMouseLeave);
    document.querySelector('.main-frame .main-canvas__overlay').addEventListener('dragover', onCanvasOverlayDragOver);
    document.querySelector('.main-frame .main-canvas__overlay').addEventListener('drop', onCanvasOverlayDrop);

    //
    document.querySelector('#outline-panel .content__container').addEventListener('mouseover', onOutlinePanelMouseOver);
    document.querySelector('#outline-panel .content__container').addEventListener('mousedown', onOutlinePanelMouseDown);
    document.querySelector('#outline-panel .content__container').addEventListener('mouseout', onOutlinePanelMouseOut);
    document.querySelector('#outline-panel .content__container').addEventListener('keydown', onOutlinePanelKeyDown);

    //
    document.querySelector('#properties-panel .header').addEventListener('click', refreshPositionSectionOnPropertiesPanel);
    document.querySelector('#layout-section .simulator').addEventListener('mouseenter', onLayoutSimulatorMouseEnter);
    document.querySelector('#layout-section .simulator').addEventListener('mouseleave', onLayoutSimulatorMouseLeave);
    document.querySelector('#spacing-section .box-model').addEventListener('mouseenter', onSpacingBoxModelMouseEnter);
    document.querySelector('#spacing-section .box-model').addEventListener('mouseleave', onSpacingBoxModelMouseLeave);
    document.querySelector('#position-section .navigator').addEventListener('mouseenter', onPositionNavigatorMouseEnter);

    //
    window.addEventListener('keydown', onWindowKeyDown);
    window.addEventListener('mousedown', onWindowMouseDown, { capture: true });
    window.addEventListener('message', onWindowMessage);

    //
    window.addEventListener('resize', onCanvasResize);
    new ResizeObserver(onCanvasResize).observe(document.querySelector('.main-canvas__container'));

    // Attach mouse event listener to panel headers
    document.querySelectorAll('.main-sidebar__panel > .header').forEach(element => {
        element.addEventListener('click', () => {
            element.classList.toggle('expanded');
            element.parentNode.classList.toggle('expanded');
            element.parentNode.querySelectorAll(':scope > :not(.header)').forEach(element => element.classList.toggle('expanded'));
        });
    });

    // Automatically open default panels
    document.querySelectorAll('.main-sidebar__panel .header').forEach(element => {
        if (['outline-panel', 'templates-panel'].includes(element.parentElement.id)) {
            element.click();
        }
    });

    // Automatically select default edit mode
    document.querySelector('#visual-edit-button').click();

    // Set the initial canvas sizes
    unsetCanvasSizes();

    // Refresh the canvas rulers
    refreshCanvasRulers();
});