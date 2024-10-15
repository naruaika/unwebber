'use strict';

import {
    metadata,
    selectedNode,
    hoveredNode,
    apiSchema,
    setMetadata,
} from '../globals.js';

const mainFrame = document.getElementById('main-iframe');
const panelContentContainer = document.querySelector('#outline-panel .content__container');
const breadcrumb = document.querySelector('#outline-panel .breadcrumb');

let isPanelReady = false;

let collapsedListItems = [];

let nodeToDrag;
let nodeDragGuide;
let nodeDragTarget;
let nodeDragPosition;

const toggleListItemTree = (event, listItem, force = true) => {
    event.stopPropagation();

    // Flip vertically the dropdown icon
    listItem.querySelector('.icon-chevron-down')?.classList.toggle('collapsed');

    // Toggle the visibility of the children elements
    listItem.querySelector('ul')?.classList.toggle('collapsed');

    // Update the collapsed list items
    if (force) {
        collapsedListItems.includes(listItem.dataset?.uwId)
            ? collapsedListItems.splice(collapsedListItems.indexOf(listItem.dataset?.uwId), 1)
            : collapsedListItems.push(listItem.dataset?.uwId);
    }
}

const scrollToElement = (listItemButton) => {
    // Skip if the selected element is already visible
    const listItemRect = listItemButton.getBoundingClientRect();
    const panelRect = panelContentContainer.getBoundingClientRect();
    if (
        listItemRect.top >= panelRect.top &&
        listItemRect.bottom <= panelRect.bottom
    ) {
        return;
    }

    // If the selected element within a collapsed list
    // expand the list to show the selected element
    let _listItemButton = listItemButton;
    while (
        _listItemButton.parentElement?.parentElement?.parentElement &&
        _listItemButton.parentElement?.parentElement?.tagName.toLowerCase() === 'ul'
    ) {
        if (_listItemButton.parentElement.parentElement.classList.contains('collapsed')) {
            const listItem = _listItemButton.parentElement.parentElement.parentElement;
            toggleListItemTree({ stopPropagation: () => {} }, listItem);
        }
        _listItemButton = _listItemButton.parentElement.parentElement;
    }

    // Scroll to the selected element
    const isNearTop = listItemRect.top < panelRect.top + 50;
    const isNearBottom = listItemRect.bottom > panelRect.bottom - 50;
    if (isNearTop) {
        listItemButton.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (isNearBottom) {
        listItemButton.scrollIntoView({ behavior: 'smooth', block: 'end' });
    } else {
        listItemButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
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
    if (
        selectedNode.node?.dataset?.uwId === event.currentTarget.dataset.uwId ||
        (
            selectedNode.parent?.dataset.uwId === event.currentTarget.dataset.uwParentId &&
            selectedNode.position === event.currentTarget.dataset.uwPosition
        )
    ) {
        return;
    }

    // Request to update the selected element
    window.dispatchEvent(new CustomEvent('element:select', {
        detail: {
            uwId: event.target.dataset.uwId,
            uwPosition: event.target.dataset.uwPosition,
            uwParentId: event.target.dataset.uwParentId,
            target: 'outline-panel',
        }
    }));
}

const blurListItemLabel = (event) => {
    // Get the list item element
    const listItem = event.currentTarget.parentElement.parentElement;

    // Make sure that the first part of the label is visible
    event.target.parentElement.scrollLeft = 0;

    // Reset the editing state
    event.target.removeAttribute('contenteditable');
    event.target.removeEventListener('blur', blurListItemLabel);
    event.target.removeEventListener('keydown', keydownListItemLabel);

    // Save the current action state
    const previousState = {
        // FIXME: should be the container ID instead of the container element
        label: event.target.dataset.text,
        container: selectedNode.parent,
        position: selectedNode.position,
    };

    // Prevent from updating the label if the new label is the same as the previous label
    if (previousState.label === event.target.textContent) {
        return;
    }

    // Save the upcoming action state
    const upcomingState = {
        label: event.target.textContent,
    };

    // Apply the new label
    if (listItem.dataset.uwId) {
        metadata[listItem.dataset.uwId].label = upcomingState.label;
    } else {
        selectedNode.node.textContent = upcomingState.label;
    }
    event.target.dataset.text = upcomingState.label;

    // Request to save the action
    const actionContext = { element: selectedNode.node };
    window.dispatchEvent(new CustomEvent('action:save', {
        detail: {
            title: 'element:label',
            previous: previousState,
            upcoming: upcomingState,
            reference: actionContext,
        }
    }));

    //
    const elementId = actionContext.element.dataset?.uwId || `${previousState.container.dataset.uwId}[${previousState.position}]`;
    console.log(`[Editor] Change element label: @${elementId}`);
}

const keydownListItemLabel = (event) => {
    if (event.key === 'Escape') {
        // Restore the original label
        event.currentTarget.textContent = event.currentTarget.dataset.text;

        // Unfocus the label
        event.currentTarget.blur();

        return;
    }

    if (event.key === 'Enter') {
        // Unfocus the label
        event.currentTarget.blur();

        return;
    }
}

const doubleClickListItem = (event) => {
    // Get the label element
    const elementId = event.currentTarget?.dataset.uwId || event.target?.dataset.uwId;
    const parentElementId = event.currentTarget?.dataset.uwParentId || event.target?.dataset.uwParentId;
    const position = event.currentTarget?.dataset.uwPosition || event.target?.dataset.uwPosition;
    const label = elementId
        ? panelContentContainer.querySelector(`[data-uw-id="${elementId}"] .element-label`)
        : panelContentContainer.querySelector(`[data-uw-id="${parentElementId}"] ul`).childNodes[position].querySelector('.element-label');

    // Setup the label for editing
    label.dataset.text = label.textContent.trim();
    label.setAttribute('contenteditable', true);
    label.addEventListener('blur', blurListItemLabel);
    label.addEventListener('keydown', keydownListItemLabel);

    // Focus the label
    label.focus();

    // Select the label text
    const range = document.createRange();
    range.selectNodeContents(label);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
}

const setElementColorTag = (color) => {
    // Get the list item button element
    const button = panelContentContainer.querySelector(`button[data-uw-id="${selectedNode.node.dataset.uwId}"]`);

    // Save the current action state
    const previousState = {
        color: metadata[button.dataset.uwId].color,
    };

    // Apply the new color tag
    setMetadata(button.dataset.uwId, {
        ...metadata[button.dataset.uwId],
        color,
    });

    if (previousState.color === color) {
        return;
    }

    // Request to save the action
    const upcomingState = {
        color: metadata[button.dataset.uwId].color,
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
    console.log(`[Editor] Change element color tag: @${actionContext.uwId}`);

    // Refresh the outline panel
    refreshPanel();
}

const showContextMenu = (event) => {
    event.preventDefault();

    // If the target element differs from the selected element
    if (
        (selectedNode.node?.dataset?.uwId || '') !== event.currentTarget.dataset.uwId ||
        (selectedNode.parent?.dataset.uwId || '') !== event.currentTarget.dataset.uwParentId ||
        (selectedNode.position || '') !== event.currentTarget.dataset.uwPosition
    ) {
        // Request to update the selected element
        window.dispatchEvent(new CustomEvent('element:select', {
            detail: {
                uwId: event.currentTarget.dataset.uwId,
                uwPosition: event.currentTarget.dataset.uwPosition,
                uwParentId: event.currentTarget.dataset.uwParentId,
                target: 'outline-panel',
            }
        }));
    }

    const parentDisplay = window.getComputedStyle(selectedNode.parent).display;

    const stylePosition = selectedNode.node.dataset?.uwId
        ? window.getComputedStyle(selectedNode.node).position
        : 'static';

    let hasPreviousSibling = true;
    let previousSibling = selectedNode.node.previousSibling;
    while (
        previousSibling &&
        (
            (
                previousSibling.nodeType === Node.TEXT_NODE &&
                previousSibling.textContent.trim() === ''
            ) ||
            'uwIgnore' in previousSibling.dataset
        )
    ) {
        previousSibling = previousSibling.previousSibling;
    }
    if (! previousSibling) {
        hasPreviousSibling = false;
    }

    let hasNextSibling = true;
    let nextSibling = selectedNode.node.nextSibling;
    while (
        nextSibling &&
        (
            (
                nextSibling.nodeType === Node.TEXT_NODE &&
                nextSibling.textContent.trim() === ''
            ) ||
            'uwIgnore' in nextSibling.dataset
        )
    ) {
        nextSibling = nextSibling.nextSibling;
    }
    if (! nextSibling) {
        hasNextSibling = false;
    }

    // Prepare the request to show the context menu
    const customEvent = new MouseEvent('contextmenu:show', event);
    customEvent.uwTarget = 'outline-panel';
    customEvent.uwMenu = [
        {
            group: true,
            id: 'select-same',
            label: 'Select Same',
            for: [
                'select-same-color', 'select-same-bgcolor', 'select-same-brcolor', 'select-same-brstyle',
                'select-same-border', 'select-same-olcolor', 'select-same-olstyle', 'select-same-outline',
                'select-same-elabel', 'select-same-etag', 'select-same-colortag',
            ],
        },
        {
            id: 'select-same-color',
            label: 'Color',
            action: () => {
                // Request to select the elements with the same color
                window.dispatchEvent(new CustomEvent('element:select-same-color'));
            },
            disabled: ! event.currentTarget.dataset.uwId,
            belongs: 'select-same',
        },
        {
            id: 'select-same-bgcolor',
            label: 'Background Color',
            action: () => {
                // Request to select the elements with the same background color
                window.dispatchEvent(new CustomEvent('element:select-same-bgcolor'));
            },
            disabled: ! event.currentTarget.dataset.uwId,
            belongs: 'select-same',
        },
        {
            spacer: true,
            for: ['select-same-brcolor', 'select-same-brstyle', 'select-same-border'],
            belongs: 'select-same',
        },
        {
            id: 'select-same-brcolor',
            label: 'Border Color',
            action: () => {
                // Request to select the elements with the same border color
                window.dispatchEvent(new CustomEvent('element:select-same-brcolor'));
            },
            disabled: ! event.currentTarget.dataset.uwId,
            belongs: 'select-same',
        },
        {
            id: 'select-same-brstyle',
            label: 'Border Style',
            action: () => {
                // Request to select the elements with the same border style
                window.dispatchEvent(new CustomEvent('element:select-same-brstyle'));
            },
            disabled: ! event.currentTarget.dataset.uwId,
            belongs: 'select-same',
        },
        {
            id: 'select-same-border',
            label: 'Border',
            action: () => {
                // Request to select the elements with the same border
                window.dispatchEvent(new CustomEvent('element:select-same-border'));
            },
            disabled: ! event.currentTarget.dataset.uwId,
            belongs: 'select-same',
        },
        {
            spacer: true,
            for: ['select-same-olcolor', 'select-same-olstyle', 'select-same-outline'],
            belongs: 'select-same',
        },
        {
            id: 'select-same-olcolor',
            label: 'Outline Color',
            action: () => {
                // Request to select the elements with the same outline color
                window.dispatchEvent(new CustomEvent('element:select-same-olcolor'));
            },
            disabled: ! event.currentTarget.dataset.uwId,
            belongs: 'select-same',
        },
        {
            id: 'select-same-olstyle',
            label: 'Outline Style',
            action: () => {
                // Request to select the elements with the same outline style
                window.dispatchEvent(new CustomEvent('element:select-same-olstyle'));
            },
            disabled: ! event.currentTarget.dataset.uwId,
            belongs: 'select-same',
        },
        {
            id: 'select-same-outline',
            label: 'Outline',
            action: () => {
                // Request to select the elements with the same outline
                window.dispatchEvent(new CustomEvent('element:select-same-outline'));
            },
            disabled: ! event.currentTarget.dataset.uwId,
            belongs: 'select-same',
        },
        {
            spacer: true,
            for: ['select-same-elabel', 'select-same-etag', 'select-same-colortag'],
            belongs: 'select-same',
        },
        {
            id: 'select-same-elabel',
            label: 'Element Label',
            action: () => {
                // Request to select the elements with the same element label
                window.dispatchEvent(new CustomEvent('element:select-same-elabel'));
            },
            disabled: ! event.currentTarget.dataset.uwId,
            belongs: 'select-same',
        },
        {
            id: 'select-same-etag',
            label: 'Element Tag',
            action: () => {
                // Request to select the elements with the same element tag
                window.dispatchEvent(new CustomEvent('element:select-same-etag'));
            },
            disabled: ! event.currentTarget.dataset.uwId,
            belongs: 'select-same',
        },
        {
            id: 'select-same-colortag',
            label: 'Color Tag',
            action: () => {
                // Request to select the elements with the same color tag
                window.dispatchEvent(new CustomEvent('element:select-same-colortag'));
            },
            disabled: ! event.currentTarget.dataset.uwId,
            belongs: 'select-same',
        },
        {
            spacer: true,
            for: ['cut', 'copy', 'paste', 'delete'],
        },
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
        {
            group: true,
            id: 'paste-special',
            label: 'Paste Special',
            for: [
                'paste-text-content', 'paste-inner-html', 'paste-outer-html', 'paste-style', 'paste-size', 'paste-width',
                'paste-height', 'paste-size-separately', 'paste-width-separately', 'paste-height-separately',
            ],
        },
        {
            id: 'paste-text-content',
            label: 'Paste Text Content',
            action: () => {
                // Request to paste the text content of the element
                window.dispatchEvent(new CustomEvent('element:paste-text-content'));
            },
            disabled:
                event.currentTarget.dataset.tagName === 'html' ||
                ! event.currentTarget.dataset.uwId,
            belongs: 'paste-special',
        },
        {
            id: 'paste-inner-html',
            label: 'Paste Inner HTML',
            action: () => {
                // Request to paste the inner HTML of the element
                window.dispatchEvent(new CustomEvent('element:paste-inner-html'));
            },
            disabled:
                event.currentTarget.dataset.tagName === 'html' ||
                ! event.currentTarget.dataset.uwId,
            belongs: 'paste-special',
        },
        {
            id: 'paste-outer-html',
            label: 'Paste Outer HTML',
            action: () => {
                // Request to paste the outer HTML of the element
                window.dispatchEvent(new CustomEvent('element:paste-outer-html'));
            },
            disabled:
                event.currentTarget.dataset.tagName === 'html' ||
                ! event.currentTarget.dataset.uwId,
            belongs: 'paste-special',
        },
        {
            id: 'paste-style',
            label: 'Paste Style',
            action: () => {
                // Request to paste the style of the element
                window.dispatchEvent(new CustomEvent('element:paste-style'));
            },
            disabled: ! event.currentTarget.dataset.uwId,
            belongs: 'paste-special',
        },
        {
            spacer: true,
            for: [
                'paste-size', 'paste-width', 'paste-height', 'paste-size-separately',
                'paste-width-separately', 'paste-height-separately',
            ],
            belongs: 'paste-special',
        },
        {
            id: 'paste-size',
            label: 'Paste Size',
            action: () => {
                // Request to paste the size of the element
                window.dispatchEvent(new CustomEvent('element:paste-size'));
            },
            disabled: ! event.currentTarget.dataset.uwId,
            belongs: 'paste-special',
        },
        {
            id: 'paste-width',
            label: 'Paste Width',
            action: () => {
                // Request to paste the width of the element
                window.dispatchEvent(new CustomEvent('element:paste-width'));
            },
            disabled: ! event.currentTarget.dataset.uwId,
            belongs: 'paste-special',
        },
        {
            id: 'paste-height',
            label: 'Paste Height',
            action: () => {
                // Request to paste the height of the element
                window.dispatchEvent(new CustomEvent('element:paste-height'));
            },
            disabled: ! event.currentTarget.dataset.uwId,
            belongs: 'paste-special',
        },
        {
            id: 'paste-size-separately',
            label: 'Paste Size Separately',
            action: () => {
                // Request to paste the size of the element separately
                window.dispatchEvent(new CustomEvent('element:paste-size-separately'));
            },
            disabled: ! event.currentTarget.dataset.uwId,
            belongs: 'paste-special',
        },
        {
            id: 'paste-width-separately',
            label: 'Paste Width Separately',
            action: () => {
                // Request to paste the width of the element separately
                window.dispatchEvent(new CustomEvent('element:paste-width-separately'));
            },
            disabled: ! event.currentTarget.dataset.uwId,
            belongs: 'paste-special',
        },
        {
            id: 'paste-height-separately',
            label: 'Paste Height Separately',
            action: () => {
                // Request to paste the height of the element separately
                window.dispatchEvent(new CustomEvent('element:paste-height-separately'));
            },
            disabled: ! event.currentTarget.dataset.uwId,
            belongs: 'paste-special',
        },
        {
            spacer: true,
            for: ['paste-before', 'paste-after'],
            belongs: 'paste-special',
        },
        {
            id: 'paste-before',
            label: 'Paste Before',
            action: () => {
                // Request to paste the element before the element
                window.dispatchEvent(new CustomEvent('element:paste-before'));
            },
            disabled:
                ['html', 'head', 'body'].includes(event.currentTarget.dataset.tagName) ||
                ! event.currentTarget.dataset.uwId,
            belongs: 'paste-special',
        },
        {
            id: 'paste-after',
            label: 'Paste After',
            action: () => {
                // Request to paste the element after the element
                window.dispatchEvent(new CustomEvent('element:paste-after'));
            },
            disabled:
                ['html', 'head', 'body'].includes(event.currentTarget.dataset.tagName) ||
                ! event.currentTarget.dataset.uwId,
            belongs: 'paste-special',
        },
        {
            spacer: true,
            for: ['paste-first-child', 'paste-last-child'],
            belongs: 'paste-special',
        },
        {
            id: 'paste-first-child',
            label: 'Paste First Child',
            action: () => {
                // Request to paste the element as the first child of the element
                window.dispatchEvent(new CustomEvent('element:paste-first-child'));
            },
            disabled:
                event.currentTarget.dataset.tagName === 'html' ||
                ! event.currentTarget.dataset.uwId,
            belongs: 'paste-special',
        },
        {
            id: 'paste-last-child',
            label: 'Paste Last Child',
            action: () => {
                // Request to paste the element as the last child of the element
                window.dispatchEvent(new CustomEvent('element:paste-last-child'));
            },
            disabled:
                event.currentTarget.dataset.tagName === 'html' ||
                ! event.currentTarget.dataset.uwId,
            belongs: 'paste-special',
        },
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
            for: ['duplicate', 'create-clone', 'unlink-clone', 'select-original-clone'],
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
            group: true,
            id: 'clone',
            label: 'Clone',
            for: ['create-clone', 'unlink-clone', 'select-original-clone'],
        },
        {
            id: 'create-clone',
            label: 'Create Clone...',
            action: () => {
                // Request to create a clone of the element
                window.dispatchEvent(new CustomEvent('element:create-clone'));
            },
            disabled:
                ['html', 'head', 'body'].includes(event.currentTarget.dataset.tagName) ||
                ! event.currentTarget.dataset.uwId,
            belongs: 'clone',
        },
        {
            id: 'unlink-clone',
            label: 'Unlink Clone',
            action: () => {
                // Request to unlink a clone of the element
                window.dispatchEvent(new CustomEvent('element:unlink-clone'));
            },
            disabled:
                // TODO: disable if the element is not a clone
                ['html', 'head', 'body'].includes(event.currentTarget.dataset.tagName) ||
                ! event.currentTarget.dataset.uwId,
            belongs: 'clone',
        },
        {
            id: 'select-original-clone',
            label: 'Select Original Clone',
            action: () => {
                // Request to select the original clone of the element
                window.dispatchEvent(new CustomEvent('element:select-original-clone'));
            },
            disabled:
                // TODO: disable if the element is not a clone
                ['html', 'head', 'body'].includes(event.currentTarget.dataset.tagName) ||
                ! event.currentTarget.dataset.uwId,
            belongs: 'clone',
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
            disabled: ['html', 'head', 'body'].includes(event.currentTarget.dataset.tagName),
        },
        {
            id: 'unwrap',
            label: 'Unwrap',
            action: () => {
                // Request to unwrap the element
                window.dispatchEvent(new CustomEvent('element:unwrap'));
            },
            disabled: ['html', 'head', 'body'].includes(event.currentTarget.dataset.tagName),
        },
        {
            spacer: true,
            for: ['insert-before', 'insert-after', 'insert-first-child', 'insert-last-child', 'convert-to'],
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
            disabled:
                event.currentTarget.dataset.tagName === 'html' ||
                ! event.currentTarget.dataset.uwId,
            belongs: 'insert',
        },
        {
            id: 'insert-last-child',
            label: 'Insert Last Child...',
            action: () => {
                // Request to insert an element as the last child of the element
                window.dispatchEvent(new CustomEvent('element:insert-last-child'));
            },
            disabled:
                event.currentTarget.dataset.tagName === 'html' ||
                ! event.currentTarget.dataset.uwId,
            belongs: 'insert',
        },
        {
            id: 'convert-to',
            label: 'Convert to...',
            action: () => {
                // Request to convert the element to another element
                window.dispatchEvent(new CustomEvent('element:convert-to'));
            },
            disabled: ['html', 'head', 'body'].includes(event.currentTarget.dataset.tagName),
        },
        {
            spacer: true,
            for: [
                'move-to-top', 'move-to-bottom', 'move-up', 'move-down', 'outdent-up', 'outdent-down',
                'indent-up', 'indent-down', 'align-left', 'align-center', 'align-right', 'align-top',
                'align-middle', 'align-bottom', 'rotate-left', 'rotate-right', 'flip-horizontal', 'flip-vertical',
            ]
        },
        {
            group: true,
            id: 'move',
            label: 'Move',
            for: [
                'move-to-top', 'move-to-bottom', 'move-up', 'move-down', 'outdent-up', 'outdent-down',
                'indent-up', 'indent-down',
            ],
        },
        {
            id: 'move-to-top',
            label: ['absolute', 'fixed'].includes(stylePosition) ? 'Move to Back' : 'Move to Top',
            action: () => {
                // Request to move the element to the top
                window.dispatchEvent(new CustomEvent('element:move-to-top'));
            },
            disabled:
                ['html', 'head', 'body'].includes(event.currentTarget.dataset.tagName) ||
                ! hasPreviousSibling,
            belongs: 'move',
        },
        {
            id: 'move-up',
            label: ['absolute', 'fixed'].includes(stylePosition) ? 'Move Backward' : 'Move Up',
            action: () => {
                // Request to move the element up
                window.dispatchEvent(new CustomEvent('element:move-up'));
            },
            disabled:
                ['html', 'head', 'body'].includes(event.currentTarget.dataset.tagName) ||
                ! hasPreviousSibling,
            belongs: 'move',
        },
        {
            id: 'move-down',
            label: ['absolute', 'fixed'].includes(stylePosition) ? 'Move Forward' : 'Move Down',
            action: () => {
                // Request to move the element down
                window.dispatchEvent(new CustomEvent('element:move-down'));
            },
            disabled:
                ['html', 'head', 'body'].includes(event.currentTarget.dataset.tagName) ||
                ! hasNextSibling,
            belongs: 'move',
        },
        {
            id: 'move-to-bottom',
            label: ['absolute', 'fixed'].includes(stylePosition) ? 'Move to Front' : 'Move to Bottom',
            action: () => {
                // Request to move the element to bottom
                window.dispatchEvent(new CustomEvent('element:move-to-bottom'));
            },
            disabled:
                ['html', 'head', 'body'].includes(event.currentTarget.dataset.tagName) ||
                ! hasNextSibling,
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
                ['head', 'body'].includes(selectedNode.parent.tagName.toLowerCase()),
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
                ['head', 'body'].includes(selectedNode.parent.tagName.toLowerCase()),
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
                ! selectedNode.node.previousElementSibling ||
                (
                    selectedNode.node.previousElementSibling &&
                    apiSchema.htmlElements.find(element => element.tag === selectedNode.node.previousElementSibling.tagName.toLowerCase()).categories.includes('void')
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
                ! selectedNode.node.nextElementSibling ||
                (
                    selectedNode.node.nextElementSibling &&
                    apiSchema.htmlElements
                        .find(element => element.tag === selectedNode.node.nextElementSibling.tagName.toLowerCase())
                        .categories
                        .includes('void')
                ),
            belongs: 'move',
        },
        {
            group: true,
            id: 'align',
            label: 'Align',
            for: ['align-left', 'align-center', 'align-right', 'align-top', 'align-middle', 'align-bottom'],
        },
        {
            id: 'align-left',
            label: 'Align Left',
            action: () => {
                // Request to align the element to the left
                window.dispatchEvent(new CustomEvent('element:align-left'));
            },
            disabled:
                ! event.currentTarget.dataset.uwId ||
                ['absolute', 'fixed'].includes(stylePosition) ||
                ! ['flex', 'grid'].includes(parentDisplay),
            belongs: 'align',
        },
        {
            id: 'align-center',
            label: 'Align Center',
            action: () => {
                // Request to align the element to the center
                window.dispatchEvent(new CustomEvent('element:align-center'));
            },
            disabled:
                ! event.currentTarget.dataset.uwId ||
                ['absolute', 'fixed'].includes(stylePosition) ||
                ! ['flex', 'grid'].includes(parentDisplay),
            belongs: 'align',
        },
        {
            id: 'align-right',
            label: 'Align Right',
            action: () => {
                // Request to align the element to the right
                window.dispatchEvent(new CustomEvent('element:align-right'));
            },
            disabled:
                ! event.currentTarget.dataset.uwId ||
                ['absolute', 'fixed'].includes(stylePosition) ||
                ! ['flex', 'grid'].includes(parentDisplay),
            belongs: 'align',
        },
        {
            spacer: true,
            for: ['align-top', 'align-middle', 'align-bottom'],
            belongs: 'align',
        },
        {
            id: 'align-top',
            label: 'Align Top',
            action: () => {
                // Request to align the element to the top
                window.dispatchEvent(new CustomEvent('element:align-top'));
            },
            disabled:
                ! event.currentTarget.dataset.uwId ||
                ['absolute', 'fixed'].includes(stylePosition) ||
                ! ['flex', 'grid'].includes(parentDisplay),
            belongs: 'align',
        },
        {
            id: 'align-middle',
            label: 'Align Middle',
            action: () => {
                // Request to align the element to the middle
                window.dispatchEvent(new CustomEvent('element:align-middle'));
            },
            disabled:
                ! event.currentTarget.dataset.uwId ||
                ['absolute', 'fixed'].includes(stylePosition) ||
                ! ['flex', 'grid'].includes(parentDisplay),
            belongs: 'align',
        },
        {
            id: 'align-bottom',
            label: 'Align Bottom',
            action: () => {
                // Request to align the element to the bottom
                window.dispatchEvent(new CustomEvent('element:align-bottom'));
            },
            disabled:
                ! event.currentTarget.dataset.uwId ||
                ['absolute', 'fixed'].includes(stylePosition) ||
                ! ['flex', 'grid'].includes(parentDisplay),
            belongs: 'align',
        },
        {
            group: true,
            id: 'transform',
            label: 'Transform',
            for: ['rotate-left', 'rotate-right', 'flip-horizontal', 'flip-vertical'],
        },
        {
            id: 'rotate-left',
            label: 'Rotate Left',
            action: () => {
                // Request to rotate the element to the left
                window.dispatchEvent(new CustomEvent('element:rotate-left'));
            },
            disabled: ! event.currentTarget.dataset.uwId,
            belongs: 'transform',
        },
        {
            id: 'rotate-right',
            label: 'Rotate Right',
            action: () => {
                // Request to rotate the element to the right
                window.dispatchEvent(new CustomEvent('element:rotate-right'));
            },
            disabled: ! event.currentTarget.dataset.uwId,
            belongs: 'transform',
        },
        {
            spacer: true,
            for: ['flip-horizontal', 'flip-vertical'],
            belongs: 'transform',
        },
        {
            id: 'flip-horizontal',
            label: 'Flip Horizontal',
            action: () => {
                // Request to flip the element horizontally
                window.dispatchEvent(new CustomEvent('element:flip-horizontal'));
            },
            disabled: ! event.currentTarget.dataset.uwId,
            belongs: 'transform',
        },
        {
            id: 'flip-vertical',
            label: 'Flip Vertical',
            action: () => {
                // Request to flip the element vertically
                window.dispatchEvent(new CustomEvent('element:flip-vertical'));
            },
            disabled: ! event.currentTarget.dataset.uwId,
            belongs: 'transform',
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
            disabled: ! event.currentTarget.dataset.uwId,
        },
        {
            id: 'edit-text',
            label: 'Edit Text...',
            icon: 'edit',
            action: () => doubleClickListItem(event),
            disabled: event.currentTarget.dataset.uwId,
        },
    ];

    // Add custom context menu item for select parent element
    const parentElements = [];
    let parent = selectedNode.node.parentElement;
    while (parent) {
        parentElements.push({
            uwId: parent.dataset.uwId,
            uwPosition: parent.parentElement ? Array.prototype.indexOf.call(parent.parentElement.childNodes, parent) : '',
            uwParentId: parent.parentElement?.dataset.uwId || '',
            label: metadata[parent.dataset.uwId].label,
        });
        if (parent.tagName.toLowerCase() === 'html') {
            break;
        }
        parent = parent.parentElement;
    }
    customEvent.uwMenu = [
        {
            group: true,
            id: 'select-parent',
            label: 'Select Parent',
            for: [...Array(parentElements.length).keys()].map(index => `select-parent-${index}`),
            disabled: event.currentTarget.dataset.tagName === 'html',
        },
        ...Array(parentElements.length).fill(null).map((_, index) => ({
            id: `select-parent-${index}`,
            label: parentElements[index].label,
            icon: 'box',
            action: () => {
                // Request to select the parent element
                window.dispatchEvent(new CustomEvent('element:select', {
                    detail: {
                        uwId: parentElements[index].uwId,
                        uwPosition: parentElements[index].uwPosition,
                        uwParentId: parentElements[index].uwParentId,
                        target: 'outline-panel',
                    }
                }));
            },
            belongs: 'select-parent',
        })),
        ...customEvent.uwMenu,
    ];

    // Add custom context menu item for color tag
    if (event.currentTarget.dataset.uwId) {
        const selectedColor = metadata[event.currentTarget.dataset.uwId].color || 'transparent';
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
    }

    // Dispatch the custom event to show the context menu
    window.dispatchEvent(customEvent);
}

const clickBreadcrumbItem = (event) => {
    // Prevent from updating the selected element if the target element is already selected
    if (
        selectedNode.node?.dataset?.uwId === event.currentTarget.dataset.uwId ||
        (
            selectedNode.parent?.dataset.uwId === event.currentTarget.dataset.uwParentId &&
            selectedNode.position === event.currentTarget.dataset.uwPosition
        )
    ) {
        return;
    }

    // Request to update the selected element
    window.dispatchEvent(new CustomEvent('element:select', {
        detail: {
            uwId: event.currentTarget.dataset.uwId,
            uwPosition: event.currentTarget.dataset.uwPosition,
            uwParentId: event.currentTarget.dataset.uwParentId,
            target: 'outline-panel',
        }
    }));
}

const mouseEnterBreadcrumbItem = (event) => {
    // Request to update the hovered element
    window.dispatchEvent(new CustomEvent('element:hover', {
        detail: {
            uwId: event.target.dataset.uwId,
            uwPosition: event.target.dataset.uwPosition,
            uwParentId: event.target.dataset.uwParentId,
            target: 'outline-panel',
        }
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
    if (! selectedNode.node) {
        breadcrumb.classList.remove('expanded');
        return;
    }

    // Clear the breadcrumb
    breadcrumb.innerHTML = '';

    // Populate the breadcrumb of the selected node
    let currentNode = selectedNode.node;
    while (currentNode) {
        const breadcrumbItem = document.createElement('span');
        breadcrumbItem.textContent = currentNode.tagName?.toLowerCase() || '[text]';
        breadcrumbItem.dataset.uwId = currentNode.dataset?.uwId || '';
        breadcrumbItem.dataset.uwPosition = currentNode.parentElement ? Array.prototype.indexOf.call(currentNode.parentElement.childNodes, currentNode) : '';
        breadcrumbItem.dataset.uwParentId = currentNode.parentElement?.dataset.uwId || '';
        breadcrumbItem.addEventListener('click', clickBreadcrumbItem);
        breadcrumbItem.addEventListener('mouseenter', mouseEnterBreadcrumbItem);
        breadcrumbItem.addEventListener('mouseleave', mouseLeaveBreadcrumbItem);
        breadcrumb.insertBefore(breadcrumbItem, breadcrumb.firstChild);
        currentNode = currentNode.parentElement;
    }

    // Show the breadcrumb
    breadcrumb.classList.add('expanded');
}

const toggleElementInclusion = (event, button) => {
    // TODO: implement the inclusion toggle action
}

const toggleElementVisibility = (event, button) => {
    const visibilityIcon = button.querySelector('.element-visibility');
    visibilityIcon.classList.toggle('icon-eye');
    visibilityIcon.classList.toggle('icon-eye-off');

    // TODO: implement the visibility toggle action
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
        detail: {
            uwId: event.target.dataset.uwId,
            uwPosition: event.target.dataset.uwPosition,
            uwParentId: event.target.dataset.uwParentId,
            target: 'outline-panel',
        }
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
    listItem.dataset.tagName = node.tagName ? node.tagName.toLowerCase() : 'text';
    listItem.dataset.uwId = node.dataset?.uwId || '';
    listItem.dataset.uwPosition = node.parentElement ? Array.prototype.indexOf.call(node.parentElement.childNodes, node) : '';
    listItem.dataset.uwParentId = node.parentElement?.dataset.uwId || '';
    listItem.style.setProperty('--guide-size', `${14 + level * 15}px`);

    // Check if the element has children excluding empty text nodes
    let hasChild = false;
    if (node.childNodes?.length > 0) {
        hasChild = [...node.childNodes].some(child => {
            return true &&
                ! child.hasAttribute?.('data-uw-ignore') &&
                (child.nodeType !== Node.TEXT_NODE || child.textContent.trim());
        });
    }

    // Add the button element
    const button = document.createElement('button');
    button.dataset.tagName = node.tagName ? node.tagName.toLowerCase() : 'text';
    button.dataset.uwId = node.dataset?.uwId || '';
    button.dataset.uwPosition = node.parentElement ? Array.prototype.indexOf.call(node.parentElement.childNodes, node) : '';
    button.dataset.uwParentId = node.parentElement?.dataset.uwId || '';
    button.dataset.color = metadata[node.dataset?.uwId]?.color || 'transparent';
    button.dataset.hasChild = hasChild ? 'true' : 'false';
    button.dataset.canHaveChild = node.tagName
        ? ! apiSchema.htmlElements
                .find(element => element.tag === node.tagName.toLowerCase())
                .categories
                .includes('void')
        : false;
    button.style.paddingLeft = `${8 + level * 15}px`;
    if (!['html', 'head', 'body'].includes(node.tagName?.toLowerCase())) {
        button.draggable = true;
    }
    listItem.appendChild(button);

    // Add icon(s) to the button element
    if (hasChild) {
        // add a chevron icon
        let icon = document.createElement('div');
        icon.classList.add('element-dropdown', 'icon', 'icon-chevron-down');
        icon.addEventListener('contextmenu', (event) => event.stopPropagation());
        icon.addEventListener('click', (event) => toggleListItemTree(event, listItem));
        icon.addEventListener('dblclick', (event) => event.stopPropagation());
        button.appendChild(icon);
    } else {
        // add an element identifier icon
        let icon = document.createElement('div');
        icon.classList.add('icon',
            node.nodeType === Node.TEXT_NODE
                ? 'icon-type'
                : 'icon-box'
        );
        button.appendChild(icon);
    }

    // Create a label for the button element
    const buttonLabel = document.createElement('span');
    buttonLabel.classList.add('label');
    buttonLabel.style.setProperty('--visibility', hasChild ? 'visible' : 'hidden');
    // add a span for the element label
    let buttonLabelContent = document.createElement('span');
    buttonLabelContent.classList.add('element-label');
    buttonLabelContent.textContent = null ||
        metadata[node.dataset?.uwId]?.label ||
        (
            node.nodeType === Node.TEXT_NODE
                ? node.textContent.trim()
                : ''
        );
    buttonLabel.append(buttonLabelContent);
    if (node.tagName) {
        // add a span for the element tag name
        buttonLabelContent = document.createElement('span');
        buttonLabelContent.classList.add('element-tagname');
        buttonLabelContent.textContent = node.tagName?.toLowerCase();
        buttonLabel.append(buttonLabelContent);
        // add a span for the element id
        buttonLabelContent = document.createElement('span');
        buttonLabelContent.classList.add('element-id');
        buttonLabelContent.textContent = null ||
            node.id
                ? '#' + node.id
                : node.dataset?.uwId
                    ? '@' + node.dataset.uwId
                    : '';
        buttonLabel.append(buttonLabelContent);
    }
    // append the label to the button
    button.appendChild(buttonLabel);

    // Add inclusion toggle button for the button element
    // except for metadata, HTML, head, and body elements
    if (
        node.tagName &&
        ! ['html', 'head', 'body'].includes(node.tagName.toLowerCase()) &&
        ! apiSchema.htmlElements
            .find(element => element.tag === node.tagName.toLowerCase())
            .categories
            .includes('metadata')
    ) {
        const inclusionCheckbox = document.createElement('input');
        inclusionCheckbox.type = 'checkbox';
        inclusionCheckbox.title = 'Exclude from Viewport';
        inclusionCheckbox.checked = true;
        inclusionCheckbox.classList.add('element-inclusion');
        inclusionCheckbox.addEventListener('contextmenu', (event) => event.stopPropagation());
        inclusionCheckbox.addEventListener('dblclick', (event) => event.stopPropagation());
        inclusionCheckbox.addEventListener('change', (event) => toggleElementInclusion(event, button));
        button.appendChild(inclusionCheckbox);
    } else {
        // add a spacer for the inclusion button
        const spacer = document.createElement('div');
        spacer.classList.add('element-inclusion', 'icon', 'icon-dot');
        button.appendChild(spacer);
    }

    // Add visibility toggle button for the button element
    // except for metadata, HTML, head, and body elements
    if (
        node.tagName &&
        ! ['html', 'head', 'body'].includes(node.tagName.toLowerCase()) &&
        ! apiSchema.htmlElements
            .find(element => element.tag === node.tagName.toLowerCase())
            .categories
            .includes('metadata')
    ) {
        const visibilityButton = document.createElement('div');
        visibilityButton.title = 'Hide in Viewport';
        visibilityButton.classList.add('element-visibility', 'icon', 'icon-eye');
        visibilityButton.addEventListener('contextmenu', (event) => event.stopPropagation());
        visibilityButton.addEventListener('click', (event) => toggleElementVisibility(event, button));
        visibilityButton.addEventListener('dblclick', (event) => event.stopPropagation());
        button.appendChild(visibilityButton);
    } else {
        // add a spacer for the visibility button
        const spacer = document.createElement('div');
        spacer.classList.add('element-visibility', 'icon', 'icon-dot');
        button.appendChild(spacer);
    }

    // Loop through the children elements recursively
    if (hasChild) {
        const unorderedList = document.createElement('ul');
        [...node.childNodes].forEach(child => {
            // Skip the element if it is flagged to be ignored,
            // usually it is a helper element for the editor
            if (
                child.hasAttribute?.('data-uw-ignore') ||
                (
                    child.nodeType === Node.TEXT_NODE &&
                    ! child.textContent.trim()
                )
            ) {
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

    // Add to the collapsed list if the element is new,
    // or has children and is not a top-level element
    if (
        (! isPanelReady || node.dataset?.uwNew) &&
        hasChild && level > 1
    ) {
        if (node.dataset?.uwNew) {
            node.removeAttribute('data-uw-new');
        }
        collapsedListItems.push(node.dataset.uwId);
    }

    // Collapse the list item if it is in the collapsed list
    if (collapsedListItems.includes(listItem.dataset.uwId)) {
        toggleListItemTree({ stopPropagation: () => {} }, listItem, false);
    }

    return listItem;
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
    if (selectedNode.node) {
        // Get the list item element
        const listItemButton = selectedNode.node.dataset?.uwId
            ? panelContentContainer.querySelector(`button[data-uw-id="${selectedNode.node.dataset.uwId}"]`)
            : panelContentContainer.querySelector(`li[data-uw-id="${selectedNode.parent.dataset.uwId}"] ul button[data-uw-position="${selectedNode.position}"]`);

        // Highlight the selected element
        highlightSelectedListItem({
            currentTarget: listItemButton,
            stopPropagation: () => {},
            preventDefault: () => {},
        });
    }

    // Refresh the breadcrumb
    refreshBreadcrumb();

    // Set the panel ready flag
    isPanelReady = true;

    //
    console.log('[Editor] Refreshing outline panel... [DONE]');
}

const onElementSelect = () => {
    // Refresh the breadcrumb
    refreshBreadcrumb();

    // If the selected element is not found
    if (! selectedNode.node) {
        // Clear the selected element
        clearListItemSelectionHighlight();
        return;
    }

    // Get the list item element
    const listItemButton = selectedNode.node.dataset?.uwId
        ? panelContentContainer.querySelector(`button[data-uw-id="${selectedNode.node.dataset.uwId}"]`)
        : panelContentContainer.querySelector(`li[data-uw-id="${selectedNode.parent.dataset.uwId}"] ul button[data-uw-position="${selectedNode.position}"]`);

    // Highlight the selected element
    highlightSelectedListItem({
        currentTarget: listItemButton,
        stopPropagation: () => {},
        preventDefault: () => {},
    });

    // Scroll to the selected element
    scrollToElement(listItemButton);
}

const onElementHover = () => {
    // If the hovered element is not found
    if (! hoveredNode.node) {
        // Clear the hovered element
        clearListItemHoveringHighlight();
        return;
    }

    // Get the list item element
    const listItemButton = hoveredNode.node.nodeType !== Node.TEXT_NODE
        ? panelContentContainer.querySelector(`button[data-uw-id="${hoveredNode.node.dataset.uwId}"]`)
        : panelContentContainer.querySelector(`li[data-uw-id="${hoveredNode.parent.dataset.uwId}"] ul button[data-uw-position="${hoveredNode.position}"]`);

    // Highlight the hovered element
    highlightHoveredListItem({
        currentTarget: listItemButton,
        stopPropagation: () => {},
        preventDefault: () => {},
        altKey: true,
    });

    // Scroll to the hovered element
    scrollToElement(listItemButton);
}

const onPanelDrag = (event) => {
    // Initialize the drag guide element
    if (! nodeDragGuide) {
        nodeDragGuide = document.createElement('div');
        nodeDragGuide.classList.add('element-drag-guide');
        panelContentContainer.appendChild(nodeDragGuide);
    }

    // Find the target element
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('button');

    // Skip if the target element is not found
    if (! target) {
        nodeDragTarget = null;
        nodeDragPosition = null;
        return;
    }

    // Skip if the target element is not within the panel
    if (! panelContentContainer.contains(target)) {
        nodeDragGuide.classList.add('hidden');
        nodeDragTarget = null;
        nodeDragPosition = null;
        return;
    }
    nodeDragTarget = target;

    // Prevent from dragging outside the HTML element
    if (! event.target.closest('li[data-tag-name="html"]').querySelector(`[data-uw-id="${target.dataset.uwId}"]`)) {
        nodeDragGuide.classList.add('hidden');
        nodeDragTarget = null;
        nodeDragPosition = null;
        return
    }

    // Prevent from dragging the element within itself
    if (event.target.parentElement.contains(target)) {
        nodeDragGuide.classList.add('hidden');
        nodeDragTarget = null;
        nodeDragPosition = null;
        return;
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
        nodeDragGuide.style.top = `${targetBoundingRect.top - panelRect.top + panelContentContainer.scrollTop - 1}px`;
        nodeDragPosition = 'before';
    } else {
        nodeDragGuide.style.top = `${targetBoundingRect.bottom - panelRect.top + panelContentContainer.scrollTop - 1}px`;
        nodeDragPosition = 'after';
    }
    if (
        event.target !== target &&
        (
            (isBelowMidPoint && hasChild) ||
            (isBelowTwoThird && canHaveChild)
        )
    ) {
        nodeDragGuide.style.left = `calc(${target.style.paddingLeft} + 15px)`;
        nodeDragPosition = 'first-child';
    } else {
        nodeDragGuide.style.left = `${target.style.paddingLeft}`;
    }
    nodeDragGuide.classList.remove('hidden');
}

const onListItemButtonDragStart = (event) => {
    //
    event.dataTransfer.dropEffect = 'move';
    event.target.classList.add('dragging');
    nodeToDrag = event.target;

    //
    const dragImage = document.createElement('div');
    dragImage.textContent = metadata[event.target.dataset.uwId]?.label || event.target.textContent;
    dragImage.style.padding = '2px 4px';
    dragImage.style.color = 'var(--color-base)';
    dragImage.style.backgroundColor = 'var(--color-blue-600)';
    dragImage.style.borderRadius = '20px';
    dragImage.style.fontSize = '10px';
    dragImage.style.position = 'absolute';
    dragImage.style.maxWidth = '150px';
    dragImage.style.whiteSpace = 'nowrap';
    dragImage.style.overflow = 'hidden';
    dragImage.style.textOverflow = 'ellipsis';
    dragImage.style.top = '-9999px';
    document.body.appendChild(dragImage);
    event.dataTransfer.setDragImage(dragImage, 0, 0);
    setTimeout(() => dragImage.remove(), 0);
}

const onListItemButtonDrop = () => {
    // Skip if the target element is not found
    if (! nodeDragTarget || ! nodeDragPosition) {
        return;
    }

    // Get the dragged element
    const draggedElement = nodeToDrag.dataset.uwId
        ? mainFrame.contentDocument.querySelector(`[data-uw-id="${nodeToDrag.dataset.uwId}"]`)
        : mainFrame.contentDocument.querySelector(`[data-uw-id="${nodeToDrag.dataset.uwParentId}"]`).childNodes[nodeToDrag.dataset.uwPosition];

    // Get the target element
    const targetElement = nodeDragTarget.dataset.uwId
        ? mainFrame.contentDocument.querySelector(`[data-uw-id="${nodeDragTarget.dataset.uwId}"]`)
        : mainFrame.contentDocument.querySelector(`[data-uw-id="${nodeDragTarget.dataset.uwParentId}"]`).childNodes[nodeDragTarget.dataset.uwPosition];

    // Save the current action state
    const previousState = {
        // FIXME: should be the container ID instead of the container element
        container: draggedElement.parentElement.dataset.uwId,
        position: Array.prototype.indexOf.call(draggedElement.parentElement.childNodes, draggedElement),
    };

    // Apply the new parent
    switch (nodeDragPosition) {
        case 'before':
            targetElement.parentNode.insertBefore(draggedElement, targetElement);
            break;
        case 'after':
            targetElement.parentNode.insertBefore(draggedElement, targetElement.nextSibling);
            break;
        case 'first-child':
            targetElement.insertBefore(draggedElement, targetElement.firstChild);
            break;
    }

    // Request to save the action
    const upcomingState = {
        // FIXME: should be the container ID instead of the container element
        container: draggedElement.parentElement.dataset.uwId,
        position: Array.prototype.indexOf.call(draggedElement.parentElement.children, draggedElement),
    };
    const actionContext = {
        uwId: draggedElement.dataset?.uwId || '',
        uwPosition: Array.prototype.indexOf.call(draggedElement.parentElement.childNodes, draggedElement),
        uwParentId: draggedElement.parentElement.dataset.uwId || '',
    };
    window.dispatchEvent(new CustomEvent('action:save', {
        detail: {
            title: 'element:move',
            previous: previousState,
            upcoming: upcomingState,
            reference: actionContext,
        }
    }));

    //
    const elementId = actionContext.uwId || `${actionContext.uwParentId}[${actionContext.uwPosition}]`;
    console.log(`[Editor] Move element: @${elementId}`);

    // Request to update the selected element
    window.dispatchEvent(new CustomEvent('element:select', {
        detail: {
            uwId: actionContext.uwId,
            uwPosition: actionContext.uwPosition,
            uwParentId: actionContext.uwParentId,
            target: 'outline-panel',
        }
    }));
}

const onListItemButtonDragEnd = (event) => {
    // Reset the drag guide element
    event.target.classList.remove('dragging');
    nodeDragGuide.remove();
    nodeDragGuide = null;
    nodeDragTarget = null;
    nodeDragPosition = null;
}

(() => {
    panelContentContainer.addEventListener('drag', onPanelDrag);
    panelContentContainer.addEventListener("dragenter", (event) => event.preventDefault());
    panelContentContainer.addEventListener("dragover", (event) => event.preventDefault());
    panelContentContainer.addEventListener("dragend", (event) => event.preventDefault());

    // Register the window message event listener
    window.addEventListener('outline:refresh', refreshPanel);
    window.addEventListener('outline:select', onElementSelect);
    window.addEventListener('outline:hover', onElementHover);
})()