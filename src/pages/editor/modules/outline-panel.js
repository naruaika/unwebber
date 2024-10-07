'use strict';

import {
    elementData,
    selectedElement,
    hoveredElement,
    apiSchema,
    setElementData,
} from '../globals.js';
import { isObjectEmpty } from '../helpers.js';

const mainFrame = document.getElementById('main-iframe');
const panelContentContainer = document.querySelector('#outline-panel .content__container');
const breadcrumb = document.querySelector('#outline-panel .breadcrumb');

const collapsedListItems = [];

let elementDragGuide;
let elementDragTarget;
let elementDragPosition;

const toggleListItemTree = (event, listItem) => {
    event.stopPropagation();

    // Flip vertically the dropdown icon
    listItem.querySelector('.icon-chevron-down').classList.toggle('collapsed');

    // Toggle the visibility of the children elements
    listItem.querySelector('ul').classList.toggle('collapsed');

    // Update the collapsed list items
    collapsedListItems.includes(listItem.dataset.uwId)
        ? collapsedListItems.splice(collapsedListItems.indexOf(listItem.dataset.uwId), 1)
        : collapsedListItems.push(listItem.dataset.uwId);
}

const scrollToElement = (listItemButton) => {
    // If the selected element withing a collapsed list
    // expand the list to show the selected element
    while (
        listItemButton.parentElement?.parentElement?.parentElement &&
        listItemButton.parentElement.parentElement.tagName.toLowerCase() === 'ul'
    ) {
        if (listItemButton.parentElement.parentElement.classList.contains('collapsed')) {
            toggleListItemTree({ stopPropagation: () => {} }, listItemButton.parentElement.parentElement.parentElement);
        }
        listItemButton = listItemButton.parentElement.parentElement;
    }

    // Scroll to the selected element
    listItemButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

const highlightSelectedListItem = (event) => {
    event.stopPropagation();
    event.preventDefault();

    // Highlight the selected list element
    clearListItemSelectionHighlight();
    event.currentTarget?.classList.add('selected');
}

const clearListItemSelectionHighlight = () => {
    // Clear the selected list element
    panelContentContainer.querySelectorAll('button.selected').forEach(element => element.classList.remove('selected'));
}

const highlightHoveredListItem = (event) => {
    // Return if the control key is not pressed
    if (! event.altKey) {
        return;
    }

    // Highlight the hovered list element
    clearListItemHoveringHighlight();
    event.currentTarget?.classList.add('hovered');
}

const clearListItemHoveringHighlight = () => {
    // Clear the hovered list element
    panelContentContainer.querySelectorAll('button.hovered').forEach(element => element.classList.remove('hovered'));
}

const clickListItem = (event) => {
    // Prevent from updating the selected element if the target element is already selected
    if (selectedElement?.dataset.uwId === event.currentTarget.dataset.uwId) {
        return;
    }

    // Select the list item
    highlightSelectedListItem(event);

    // Request to update the selected element
    window.dispatchEvent(new CustomEvent('element:select', {
        detail: { uwId: event.target.dataset.uwId, target: 'outline-panel' }
    }));

    // Refresh the breadcrumb
    window.setTimeout(() => {
        refreshBreadcrumb();
    }, 50);
}

const blurListItemLabel = (event) => {
    // Get the list item element
    const listItem = event.currentTarget.parentElement.parentElement;

    // Reset the editing state
    event.currentTarget.removeAttribute('contenteditable');

    // Save the current action state
    const previousState = {
        label: elementData[listItem.dataset.uwId].label,
    };

    // Apply the new label
    elementData[listItem.dataset.uwId].label = event.currentTarget.textContent;

    if (previousState.label === event.currentTarget.textContent) {
        return;
    }

    // Request to save the action
    const upcomingState = {
        label: elementData[listItem.dataset.uwId].label,
    };
    const actionContext = { uwId: listItem.dataset.uwId };
    window.dispatchEvent(new CustomEvent('action:save', {
        detail: {
            title: 'element:label',
            previous: previousState,
            upcoming: upcomingState,
            reference: actionContext,
        }
    }));

    //
    console.log(`[Editor] Edit element label: @${actionContext.uwId}`);
}

const keydownListItemLabel = (event) => {
    if (event.key === 'Escape') {
        // Get the list item element
        const listItem = event.currentTarget.parentElement.parentElement;

        // Restore the original label
        event.currentTarget.textContent = elementData[listItem.dataset.uwId].label;
        event.currentTarget.blur();

        return;
    }

    if (event.key === 'Enter') {
        event.currentTarget.blur();
        return;
    }
}

const doubleClickListItem = (event) => {
    // Get the label element
    const label = (event.currentTarget || event.target).querySelector('.element-label');

    // Setup the label for editing
    label.setAttribute('contenteditable', true);
    label.addEventListener('blur', blurListItemLabel);
    label.addEventListener('keydown', keydownListItemLabel);

    // Focus the label text
    label.focus();

    // Select the label text
    const range = document.createRange();
    range.selectNodeContents(label);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
}

const showContextMenu = (event) => {
    event.preventDefault();

    // If the target element differs from the selected element
    if (selectedElement?.dataset.uwId !== event.currentTarget.dataset.uwId) {
        // Select the list item
        highlightSelectedListItem(event);
        // Request to update the selected element
        window.dispatchEvent(new CustomEvent('element:select', {
            detail: { uwId: event.currentTarget.dataset.uwId, target: 'outline-panel' }
        }));
        window.setTimeout(() => {
            // Refresh the breadcrumb
            refreshBreadcrumb();
        }, 50);
    }

    // Prepare the request to show the context menu
    const customEvent = new MouseEvent('contextmenu:show', event);
    customEvent.uwTarget = 'outline-panel';
    customEvent.uwMenu = [
        {
            id: 'cut',
            label: 'Cut',
            icon: 'cut',
            action: () => {
                // Request to cut the element
                window.dispatchEvent(new CustomEvent('element:cut'));
            },
            disabled: ['html', 'head', 'body'].includes(event.currentTarget.dataset.tagName),
            shortcut: 'Ctrl+X',
        },
        {
            id: 'copy',
            label: 'Copy',
            icon: 'copy',
            action: () => {
                // Request to copy the element
                window.dispatchEvent(new CustomEvent('element:copy'));
            },
            disabled: ['html', 'head', 'body'].includes(event.currentTarget.dataset.tagName),
            shortcut: 'Ctrl+C',
        },
        {
            id: 'paste',
            label: 'Paste',
            icon: 'paste',
            action: () => {
                // Request to paste the element
                window.dispatchEvent(new CustomEvent('element:paste'));
            },
            disabled: event.currentTarget.dataset.tagName === 'html',
            shortcut: 'Ctrl+V',
        },
        // TODO: add option to paste before/after/first-child/last-child
        // TODO: add option to copy/paste style, class, attributes, etc.
        {
            id: 'delete',
            label: 'Delete',
            icon: 'delete',
            action: () => {
                // Request to delete the element
                window.dispatchEvent(new CustomEvent('element:delete'));
            },
            disabled: ['html', 'head', 'body'].includes(event.currentTarget.dataset.tagName),
            shortcut: 'Delete',
        },
        {
            spacer: true,
            for: ['duplicate', 'clone'],
        },
        {
            id: 'duplicate',
            label: 'Duplicate',
            action: () => {
                // Request to duplicate the element
                window.dispatchEvent(new CustomEvent('element:duplicate'));
            },
            disabled: ['html', 'head', 'body'].includes(event.currentTarget.dataset.tagName),
            shortcut: 'Ctrl+D',
        },
        {
            id: 'clone',
            label: 'Clone...',
            action: () => {
                // Request to clone the element
                window.dispatchEvent(new CustomEvent('element:clone'));
            },
            disabled: ['html', 'head', 'body'].includes(event.currentTarget.dataset.tagName),
        },
        {
            spacer: true,
            for: ['wrap', 'unwrap'],
        },
        {
            id: 'wrap',
            label: 'Wrap...',
            action: () => {
                // Request to wrap the element
                window.dispatchEvent(new CustomEvent('element:wrap'));
            },
            disabled: ['html', 'head', 'body', 'meta', 'title', 'link', 'base'].includes(event.currentTarget.dataset.tagName),
        },
        {
            id: 'unwrap',
            label: 'Unwrap',
            action: () => {
                // Request to unwrap the element
                window.dispatchEvent(new CustomEvent('element:unwrap'));
            },
            disabled:
                ['html', 'head', 'body', 'meta', 'title', 'link', 'base'].includes(event.currentTarget.dataset.tagName) ||
                selectedElement.parentElement.tagName.toLowerCase() === 'body'
            ,
        },
        {
            spacer: true,
            for: ['insert-before', 'insert-after', 'insert-first-child', 'insert-last-child'],
        },
        {
            group: true,
            id: 'insert',
            label: 'Insert',
            for: ['insert-before', 'insert-after', 'insert-first-child', 'insert-last-child'],
        },
        {
            id: 'insert-before',
            label: 'Insert Before...',
            action: () => {
                // Request to insert an element before the element
                window.dispatchEvent(new CustomEvent('element:insert-before'));
            },
            disabled: ['html', 'head', 'body'].includes(event.currentTarget.dataset.tagName),
            belongs: 'insert',
        },
        {
            id: 'insert-after',
            label: 'Insert After...',
            action: () => {
                // Request to insert an element after the element
                window.dispatchEvent(new CustomEvent('element:insert-after'));
            },
            disabled: ['html', 'head', 'body'].includes(event.currentTarget.dataset.tagName),
            belongs: 'insert',
        },
        {
            spacer: true,
            for: ['insert-first-child', 'insert-last-child'],
            belongs: 'insert',
        },
        {
            id: 'insert-first-child',
            label: 'Insert First Child...',
            action: () => {
                // Request to insert an element as the first child of the element
                window.dispatchEvent(new CustomEvent('element:insert-first-child'));
            },
            disabled: event.currentTarget.dataset.tagName === 'html',
            belongs: 'insert',
        },
        {
            id: 'insert-last-child',
            label: 'Insert Last Child...',
            action: () => {
                // Request to insert an element as the last child of the element
                window.dispatchEvent(new CustomEvent('element:insert-last-child'));
            },
            disabled: event.currentTarget.dataset.tagName === 'html',
            belongs: 'insert',
        },
        {
            spacer: true,
            for: ['move-up', 'move-down', 'outdent-up', 'outdent-down', 'indent-up', 'indent-down'],
        },
        {
            group: true,
            id: 'move',
            label: 'Move',
            for: ['move-up', 'move-down', 'outdent-up', 'outdent-down', 'indent-up', 'indent-down'],
        },
        {
            id: 'move-up',
            label: 'Move Up',
            action: () => {
                // Request to move the element up
                window.dispatchEvent(new CustomEvent('element:move-up'));
            },
            disabled:
                ['html', 'head', 'body'].includes(event.currentTarget.dataset.tagName) ||
                (
                    ! selectedElement.previousSibling ||
                    (
                        ! selectedElement.previousElementSibling &&
                        (
                            selectedElement.previousSibling.nodeType === Node.TEXT_NODE &&
                            selectedElement.previousSibling.textContent.trim() === ''
                        )
                    )
                ),
            belongs: 'move',
        },
        {
            id: 'move-down',
            label: 'Move Down',
            action: () => {
                // Request to move the element down
                window.dispatchEvent(new CustomEvent('element:move-down'));
            },
            disabled:
                ['html', 'head', 'body'].includes(event.currentTarget.dataset.tagName) ||
                (
                    ! selectedElement.nextSibling ||
                    (
                        ! selectedElement.nextElementSibling &&
                        (
                            selectedElement.nextSibling.nodeType === Node.TEXT_NODE &&
                            selectedElement.nextSibling.textContent.trim() === ''
                        )
                    )
                ),
            belongs: 'move',
        },
        {
            spacer: true,
            for: ['outdent-up', 'outdent-down'],
            belongs: 'move',
        },
        {
            id: 'outdent-up',
            label: 'Outdent Up',
            action: () => {
                // Request to move the element out and up
                window.dispatchEvent(new CustomEvent('element:outdent-up'));
            },
            disabled:
                ['html', 'head', 'body', 'meta', 'title', 'link', 'base'].includes(event.currentTarget.dataset.tagName) ||
                selectedElement.parentElement.tagName.toLowerCase() === 'body',
            belongs: 'move',
        },
        {
            id: 'outdent-down',
            label: 'Outdent Down',
            action: () => {
                // Request to move the element out and down
                window.dispatchEvent(new CustomEvent('element:outdent-down'));
            },
            disabled:
                ['html', 'head', 'body', 'meta', 'title', 'link', 'base'].includes(event.currentTarget.dataset.tagName) ||
                selectedElement.parentElement.tagName.toLowerCase() === 'body',
            belongs: 'move',
        },
        {
            spacer: true,
            for: ['indent-up', 'indent-down'],
            belongs: 'move',
        },
        {
            id: 'indent-up',
            label: 'Indent Up',
            action: () => {
                // Request to move the element in and up
                window.dispatchEvent(new CustomEvent('element:indent-up'));
            },
            disabled:
                ['html', 'head', 'body', 'meta', 'title', 'link', 'base'].includes(event.currentTarget.dataset.tagName) ||
                ! selectedElement.previousElementSibling ||
                (
                    selectedElement.previousElementSibling &&
                    apiSchema.htmlElements.find(element => element.tag === selectedElement.previousElementSibling.tagName.toLowerCase()).categories.includes('void')
                ),
            belongs: 'move',
        },
        {
            id: 'indent-down',
            label: 'Indent Down',
            action: () => {
                // Request to move the element in and down
                window.dispatchEvent(new CustomEvent('element:indent-down'));
            },
            disabled:
                ['html', 'head', 'body', 'meta', 'title', 'link', 'base'].includes(event.currentTarget.dataset.tagName) ||
                ! selectedElement.nextElementSibling ||
                (
                    selectedElement.nextElementSibling &&
                    apiSchema.htmlElements.find(element => element.tag === selectedElement.nextElementSibling.tagName.toLowerCase()).categories.includes('void')
                ),
            belongs: 'move',
        },
        {
            spacer: true,
            for: ['rename'],
        },
        {
            id: 'rename',
            label: 'Rename...',
            icon: 'edit',
            action: () => doubleClickListItem(event),
        },
    ];

    // Add custom context menu item for color tag
    const selectedColor = elementData[event.currentTarget.dataset.uwId].color || 'transparent';
    const colorTagMenu = document.createElement('div');
    colorTagMenu.classList.add('color-tag');
    ['transparent', 'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'gray'].forEach(color => {
        const colorTag = document.createElement('div');
        colorTag.classList.add('color', color);
        if (selectedColor === color) {
            colorTag.classList.add('selected');
        }
        colorTag.addEventListener('click', () => setElementColorTag(color));
        colorTagMenu.appendChild(colorTag);
    });
    customEvent.uwMenu.push({ spacer: true });
    customEvent.uwMenu.push({ custom: true, element: colorTagMenu });

    // Dispatch the custom event to show the context menu
    window.dispatchEvent(customEvent);
}

const setElementColorTag = (color) => {
    // Get the list item button element
    const button = panelContentContainer.querySelector(`button[data-uw-id="${selectedElement.dataset.uwId}"]`);

    // Save the current action state
    const previousState = {
        color: elementData[button.dataset.uwId].color,
    };

    // Apply the new color tag
    setElementData(button.dataset.uwId, {
        ...elementData[button.dataset.uwId],
        color,
    });

    if (previousState.color === color) {
        return;
    }

    // Request to save the action
    const upcomingState = {
        color: elementData[button.dataset.uwId].color,
    };
    const actionContext = { uwId: button.dataset.uwId };
    window.dispatchEvent(new CustomEvent('action:save', {
        detail: {
            title: 'element:color-tag',
            previous: previousState,
            upcoming: upcomingState,
            reference: actionContext,
        }
    }));

    //
    console.log(`[Editor] Set element color tag: @${actionContext.uwId}`);

    // Refresh the outline panel
    refreshPanel();
}

const mouseEnterListItem = (event) => {
    // Highlight the hovered list item
    highlightHoveredListItem(event);

    // Prevent from updating the hovered element if the control key is not pressed
    if (! event.altKey) {
        return;
    }

    // Request to update the hovered element
    window.dispatchEvent(new CustomEvent('element:hover', {
        detail: { uwId: event.target.dataset.uwId, target: 'outline-panel' }
    }));
}

const mouseLeaveListItem = () => {
    // Clear the hovered list item
    clearListItemHoveringHighlight();
    // Request to update the hovered element
    window.dispatchEvent(new CustomEvent('element:hover', { detail: {} }));
}

const createListItem = (node, level) => {
    // Create the list item element
    const listItem = document.createElement('li');
    listItem.dataset.tagName = node.tagName.toLowerCase();
    listItem.dataset.uwId = node.dataset.uwId;
    listItem.style.setProperty('--guide-size', `${14 + level * 15}px`);

    // Add the button element
    const button = document.createElement('button');
    button.dataset.tagName = node.tagName.toLowerCase();
    button.dataset.uwId = node.dataset.uwId;
    button.dataset.color = elementData[node.dataset.uwId].color || 'transparent';
    button.dataset.hasChild = node.children.length > 0 ? 'true' : 'false';
    button.dataset.canHaveChild = ! apiSchema.htmlElements.find(element => element.tag === node.tagName.toLowerCase()).categories.includes('void');
    button.style.paddingLeft = `${8 + level * 15}px`;
    if (! ['html', 'head', 'body'].includes(node.tagName.toLowerCase())) {
        button.draggable = true;
    }
    listItem.appendChild(button);

    // Add icon(s) to the button element;
    // If the element has children
    if (node.children.length > 0) {
        // add a chevron icon
        let icon = document.createElement('div');
        icon.classList.add('icon', 'icon-chevron-down');
        icon.addEventListener('contextmenu', (event) => event.stopPropagation());
        icon.addEventListener('click', (event) => toggleListItemTree(event, listItem));
        icon.addEventListener('dblclick', (event) => event.stopPropagation());
        button.appendChild(icon);
    } else {
        // add a square icon
        let icon = document.createElement('div');
        icon.classList.add('icon', 'icon-square');
        button.appendChild(icon);
    }

    // Create a label for the button element
    const buttonLabel = document.createElement('span');
    buttonLabel.classList.add('label');
    buttonLabel.style.setProperty('--visibility', node.children.length > 0 ? 'visible' : 'hidden');
    // add a span for the element label
    let buttonLabelContent = document.createElement('span');
    buttonLabelContent.classList.add('element-label');
    buttonLabelContent.textContent = elementData[node.dataset.uwId].label;
    buttonLabel.append(buttonLabelContent);
    // add a span for the element tag name
    buttonLabelContent = document.createElement('span');
    buttonLabelContent.classList.add('element-tagname');
    buttonLabelContent.textContent = '<' + node.tagName.toLowerCase() + '>';
    buttonLabel.append(buttonLabelContent);
    // add a span for the element id
    buttonLabelContent = document.createElement('span');
    buttonLabelContent.classList.add('element-id');
    buttonLabelContent.textContent = node.id ? '#' + node.id : node.dataset.uwId ? '@' + node.dataset.uwId : '';
    buttonLabel.append(buttonLabelContent);
    // append the label to the button
    button.appendChild(buttonLabel);

    // Loop through the children elements recursively
    if (node.children.length > 0) {
        const unorderedList = document.createElement('ul');
        [...node.children].forEach(child => {
            // Skip the element if it is flagged to be ignored,
            // usually it is a helper element for the editor
            if (child.hasAttribute('data-uw-ignore')) {
                return;
            }
            // Create the list item for the child element
            unorderedList.appendChild(createListItem(child, level + 1));
        });
        listItem.appendChild(unorderedList);
    }

    // Register the event listener for the button
    button.addEventListener('click', clickListItem);
    button.addEventListener('dblclick', doubleClickListItem);
    button.addEventListener('contextmenu', showContextMenu);
    button.addEventListener('mouseenter', mouseEnterListItem);
    button.addEventListener('mouseleave', mouseLeaveListItem);
    button.addEventListener('dragstart', onListItemButtonDragStart);
    button.addEventListener('dragover', (event) => event.preventDefault());
    button.addEventListener('drop', onListItemButtonDrop);
    button.addEventListener('dragend', onListItemButtonDragEnd);
    // TODO: add support for multi-selection

    // Collapse the list item if it is in the collapsed list
    if (collapsedListItems.includes(listItem.dataset.uwId)) {
        toggleListItemTree({ stopPropagation: () => {} }, listItem);
    }

    return listItem;
}

const clickBreadcrumbItem = (event) => {
    // Prevent from updating the selected element if the target element is already selected
    if (selectedElement?.dataset.uwId === event.currentTarget.dataset.uwId) {
        return;
    }

    // Select the list item
    const currentTarget = panelContentContainer.querySelector(`button[data-uw-id="${event.target.dataset.uwId}"]`);
    highlightSelectedListItem({ stopPropagation: () => {}, preventDefault: () => {}, currentTarget });

    // Request to update the selected element
    window.dispatchEvent(new CustomEvent('element:select', {
        detail: { uwId: event.currentTarget.dataset.uwId, target: 'outline-panel' }
    }));

    // Refresh the breadcrumb
    window.setTimeout(() => {
        refreshBreadcrumb();
    }, 50);
}

const mouseEnterBreadcrumbItem = (event) => {
    // Highlight the hovered list item
    const currentTarget = panelContentContainer.querySelector(`button[data-uw-id="${event.target.dataset.uwId}"]`);
    highlightHoveredListItem({ altKey: true, currentTarget });

    // Scroll to the selected element
    scrollToElement(currentTarget);

    // Request to update the hovered element
    window.dispatchEvent(new CustomEvent('element:hover', {
        detail: { uwId: event.target.dataset.uwId, target: 'outline-panel' }
    }));
}

const mouseLeaveBreadcrumbItem = () => {
    // Clear the hovered list item
    clearListItemHoveringHighlight();

    // Request to update the hovered element
    window.dispatchEvent(new CustomEvent('element:hover', { detail: {} }));
}

const refreshBreadcrumb = () => {
    // Hide the breadcrumb if no element is selected
    if (! selectedElement) {
        breadcrumb.classList.remove('expanded');
        return;
    }

    // Get the list item element
    let listItem = panelContentContainer.querySelector(`button[data-uw-id="${selectedElement?.dataset.uwId}"]`);

    // Clear the breadcrumb
    breadcrumb.innerHTML = '';

    // Populate the breadcrumb with the selected element
    while (true) {
        const breadcrumbItem = document.createElement('span');
        breadcrumbItem.textContent = listItem.dataset.tagName;
        breadcrumbItem.dataset.uwId = listItem.dataset.uwId;
        breadcrumbItem.addEventListener('click', clickBreadcrumbItem);
        breadcrumbItem.addEventListener('mouseenter', mouseEnterBreadcrumbItem);
        breadcrumbItem.addEventListener('mouseleave', mouseLeaveBreadcrumbItem);
        breadcrumb.insertBefore(breadcrumbItem, breadcrumb.firstChild);
        listItem = listItem.parentElement?.parentElement?.parentElement?.querySelector('button');
        if (listItem.dataset.tagName === 'html' || ! listItem || isObjectEmpty(listItem)) {
            break;
        }
    }

    // Show the breadcrumb
    breadcrumb.classList.add('expanded');
}

const refreshPanel = () => {
    //
    console.log('[Editor] Refreshing outline panel...');

    // TODO: add search input to filter elements by tag name, id, and label

    // Remove all the existing elements from the panel
    panelContentContainer.innerHTML = '';

    // Populate the outline panel with the document tree
    const documentTree = mainFrame.contentDocument.documentElement;
    const unorderedList = document.createElement('ul');
    unorderedList.appendChild(createListItem(documentTree, 0));
    panelContentContainer.appendChild(unorderedList);

    // If the selected element is found
    if (selectedElement) {
        // Highlight the selected element
        highlightSelectedListItem({
            currentTarget: panelContentContainer.querySelector(`button[data-uw-id="${selectedElement?.dataset.uwId}"]`),
            stopPropagation: () => {},
            preventDefault: () => {},
        });
    }

    // Refresh the breadcrumb
    refreshBreadcrumb();

    //
    console.log('[Editor] Refreshing outline panel... [DONE]');
}

const onElementSelect = (event) => {
    // Prevent the event from being triggered by itself
    if (event?.detail.target === 'outline-panel') {
        return;
    }

    // Refresh the breadcrumb
    refreshBreadcrumb();

    // If the selected element is not found
    if (! selectedElement) {
        // Clear the selected element
        clearListItemSelectionHighlight();
        return;
    }

    // Get the list item element
    const listItemButton = panelContentContainer.querySelector(`button[data-uw-id="${selectedElement?.dataset.uwId}"]`);

    // Highlight the selected element
    highlightSelectedListItem({
        currentTarget: listItemButton,
        stopPropagation: () => {},
        preventDefault: () => {},
    });

    // Scroll to the selected element
    scrollToElement(listItemButton);
}

const onElementHover = (event) => {
    // Prevent the event from being triggered by itself
    if (event?.detail.target === 'outline-panel') {
        return;
    }

    // If the hovered element is not found
    if (! hoveredElement) {
        // Clear the hovered element
        clearListItemHoveringHighlight();
        return;
    }

    // Get the list item element
    const listItemButton = panelContentContainer.querySelector(`button[data-uw-id="${hoveredElement?.dataset.uwId}"]`);

    // Highlight the hovered element
    highlightHoveredListItem({
        currentTarget: listItemButton,
        stopPropagation: () => {},
        preventDefault: () => {},
        altKey: event.altKey,
    });

    // Scroll to the hovered element
    scrollToElement(listItemButton);
}

const onPanelDrag = (event) => {
    // Initialize the drag guide element
    if (! elementDragGuide) {
        elementDragGuide = document.createElement('div');
        elementDragGuide.classList.add('element-drag-guide');
        panelContentContainer.appendChild(elementDragGuide);
    }

    // Find the target element
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('button');

    // Skip if the target element is not found
    if (! target) {
        elementDragTarget = null;
        elementDragPosition = null;
        return;
    }

    // Skip if the target element is not within the panel
    if (! panelContentContainer.contains(target)) {
        elementDragGuide.classList.add('hidden');
        elementDragTarget = null;
        elementDragPosition = null;
        return;
    }
    elementDragTarget = target;

    // Prevent from dragging outside the HTML element
    if (! event.target.closest('li[data-tag-name="html"]').querySelector(`[data-uw-id="${target.dataset.uwId}"]`)) {
        elementDragGuide.classList.add('hidden');
        elementDragTarget = null;
        elementDragPosition = null;
        return
    }

    // Show the drag guide element
    const panelRect = panelContentContainer.getBoundingClientRect();
    const targetBoundingRect = target.getBoundingClientRect();
    const targetMidPoint = targetBoundingRect.top + targetBoundingRect.height / 2;
    const isAboveMidPoint = event.clientY < targetMidPoint;
    const isBelowMidPoint = event.clientY > targetMidPoint;
    const isBelowTwoThird = event.clientY > targetBoundingRect.top + targetBoundingRect.height * 2 / 3;
    const hasChild = target.dataset.hasChild === 'true';
    const canHaveChild = target.dataset.canHaveChild === 'true';
    if (isAboveMidPoint) {
        elementDragGuide.style.top = `${targetBoundingRect.top - panelRect.top + panelContentContainer.scrollTop - 1}px`;
        elementDragPosition = 'before';
    } else {
        elementDragGuide.style.top = `${targetBoundingRect.bottom - panelRect.top + panelContentContainer.scrollTop - 1}px`;
        elementDragPosition = 'after';
    }
    if (
        event.target !== target &&
        (
            (isBelowMidPoint && hasChild) ||
            (isBelowTwoThird && canHaveChild)
        )
    ) {
        elementDragGuide.style.left = `calc(${target.style.paddingLeft} + 15px)`;
        elementDragPosition = 'first-child';
    } else {
        elementDragGuide.style.left = `${target.style.paddingLeft}`;
    }
    elementDragGuide.classList.remove('hidden');
}

const onListItemButtonDragStart = (event) => {
    //
    event.dataTransfer.dropEffect = 'move';
    event.target.classList.add('dragging');
    event.dataTransfer.setData('element-id', event.target.dataset.uwId);

    //
    const dragImage = document.createElement('div');
    dragImage.textContent = elementData[event.target.dataset.uwId].label;
    dragImage.style.padding = '2px 4px';
    dragImage.style.color = 'var(--color-base)';
    dragImage.style.backgroundColor = 'var(--color-blue-600)';
    dragImage.style.borderRadius = '20px';
    dragImage.style.fontSize = '10px';
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-9999px';
    document.body.appendChild(dragImage);
    event.dataTransfer.setDragImage(dragImage, 0, 0);
    setTimeout(() => dragImage.remove(), 0);
}

const onListItemButtonDrop = (event) => {
    // Skip if the target element is not found
    if (! elementDragTarget || ! elementDragPosition) {
        return;
    }

    // Get the dragged element
    const draggedElement = mainFrame.contentDocument.querySelector(`[data-uw-id="${event.dataTransfer.getData('element-id')}"]`);

    // Get the target element
    const targetElement = mainFrame.contentDocument.querySelector(`[data-uw-id="${elementDragTarget.dataset.uwId}"]`);

    // Save the current action state
    const previousState = {
        // FIXME: should be the container ID instead of the container element
        container: draggedElement.parentElement.dataset.uwId,
        position: Array.prototype.indexOf.call(draggedElement.parentElement.children, draggedElement),
    };

    // Apply the new parent
    switch (elementDragPosition) {
        case 'before':
            targetElement.insertAdjacentElement('beforebegin', draggedElement);
            break;
        case 'after':
            targetElement.insertAdjacentElement('afterend', draggedElement);
            break;
        case 'first-child':
            targetElement.insertAdjacentElement('afterbegin', draggedElement);
            break;
    }

    // Request to save the action
    const upcomingState = {
        // FIXME: should be the container ID instead of the container element
        container: draggedElement.parentElement.dataset.uwId,
        position: Array.prototype.indexOf.call(draggedElement.parentElement.children, draggedElement),
    };
    const actionContext = { uwId: draggedElement.dataset.uwId };
    window.dispatchEvent(new CustomEvent('action:save', {
        detail: {
            title: 'element:move',
            previous: previousState,
            upcoming: upcomingState,
            reference: actionContext,
        }
    }));

    //
    console.log(`[Editor] Move element: @${actionContext.uwId}`);

    // Request to update the selected element
    window.dispatchEvent(new CustomEvent('element:select', {
        detail: { uwId: actionContext.uwId, target: 'outline-panel' }
    }));

    // Refresh the outline panel
    window.setTimeout(() => {
        refreshPanel();
    }, 50);
}

const onListItemButtonDragEnd = (event) => {
    // Reset the drag guide element
    event.target.classList.remove('dragging');
    elementDragGuide = null;
    elementDragTarget = null;
    elementDragPosition = null;
}

(() => {
    panelContentContainer.addEventListener('drag', onPanelDrag);
    panelContentContainer.addEventListener("dragenter", (event) => event.preventDefault());
    panelContentContainer.addEventListener("dragover", (event) => event.preventDefault());
    panelContentContainer.addEventListener("dragend", (event) => event.preventDefault());

    // Register the window message event listener
    window.addEventListener('document:tree', refreshPanel);
    window.addEventListener('element:select', onElementSelect);
    window.addEventListener('element:hover', onElementHover);
})()