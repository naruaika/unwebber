'use strict';

import {
    elementData,
    selectedElement,
    hoveredElement,
    apiSchema,
    setElementData,
} from '../globals.js';

const mainFrame = document.getElementById('main-iframe');
const panelContentContainer = document.querySelector('#outline-panel .content__container');
const breadcrumb = document.querySelector('#outline-panel .breadcrumb');

const collapsedListItems = [];

let elementDragGuide;
let elementDragTarget;
let elementDragPosition;

const toggleListItemTree = (event, listItem, force = true) => {
    event.stopPropagation();

    // Flip vertically the dropdown icon
    listItem.querySelector('.icon-chevron-down').classList.toggle('collapsed');

    // Toggle the visibility of the children elements
    listItem.querySelector('ul').classList.toggle('collapsed');

    if (force) {
        // Update the collapsed list items
        collapsedListItems.includes(listItem.dataset.uwId)
            ? collapsedListItems.splice(collapsedListItems.indexOf(listItem.dataset.uwId), 1)
            : collapsedListItems.push(listItem.dataset.uwId);
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

    // If the selected element withing a collapsed list
    // expand the list to show the selected element
    let listItem = listItemButton;
    while (
        listItem.parentElement?.parentElement?.parentElement &&
        listItem.parentElement.parentElement.tagName.toLowerCase() === 'ul'
    ) {
        if (listItem.parentElement.parentElement.classList.contains('collapsed')) {
            toggleListItemTree({ stopPropagation: () => {} }, listItem.parentElement.parentElement.parentElement);
        }
        listItem = listItem.parentElement.parentElement;
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
    if (selectedElement?.dataset.uwId === event.currentTarget.dataset.uwId) {
        return;
    }

    // Request to update the selected element
    window.dispatchEvent(new CustomEvent('element:select', {
        detail: { uwId: event.target.dataset.uwId, target: 'outline-panel' }
    }));
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
    const elementId = event.currentTarget?.dataset.uwId || event.target?.dataset.uwId;
    const label = panelContentContainer.querySelector(`[data-uw-id="${elementId}"] .element-label`);

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
        // Request to update the selected element
        window.dispatchEvent(new CustomEvent('element:select', {
            detail: { uwId: event.currentTarget.dataset.uwId, target: 'outline-panel' }
        }));
    }

    // Prepare the request to show the context menu
    const customEvent = new MouseEvent('contextmenu:show', event);
    customEvent.uwTarget = 'outline-panel';
    customEvent.uwMenu = [
        {
            group: true,
            id: 'select-same',
            label: 'Select Same',
            for: ['select-same-color', 'select-same-bgcolor', 'select-same-brcolor', 'select-same-brstyle', 'select-same-border', 'select-same-olcolor', 'select-same-olstyle', 'select-same-outline', 'select-same-elabel', 'select-same-etag', 'select-same-colortag'],
        },
        {
            id: 'select-same-color',
            label: 'Color',
            action: () => {
                // Request to select the elements with the same color
                window.dispatchEvent(new CustomEvent('element:select-same-color'));
            },
            belongs: 'select-same',
        },
        {
            id: 'select-same-bgcolor',
            label: 'Background Color',
            action: () => {
                // Request to select the elements with the same background color
                window.dispatchEvent(new CustomEvent('element:select-same-bgcolor'));
            },
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
            belongs: 'select-same',
        },
        {
            id: 'select-same-brstyle',
            label: 'Border Style',
            action: () => {
                // Request to select the elements with the same border style
                window.dispatchEvent(new CustomEvent('element:select-same-brstyle'));
            },
            belongs: 'select-same',
        },
        {
            id: 'select-same-border',
            label: 'Border',
            action: () => {
                // Request to select the elements with the same border
                window.dispatchEvent(new CustomEvent('element:select-same-border'));
            },
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
            belongs: 'select-same',
        },
        {
            id: 'select-same-olstyle',
            label: 'Outline Style',
            action: () => {
                // Request to select the elements with the same outline style
                window.dispatchEvent(new CustomEvent('element:select-same-olstyle'));
            },
            belongs: 'select-same',
        },
        {
            id: 'select-same-outline',
            label: 'Outline',
            action: () => {
                // Request to select the elements with the same outline
                window.dispatchEvent(new CustomEvent('element:select-same-outline'));
            },
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
            belongs: 'select-same',
        },
        {
            id: 'select-same-etag',
            label: 'Element Tag',
            action: () => {
                // Request to select the elements with the same element tag
                window.dispatchEvent(new CustomEvent('element:select-same-etag'));
            },
            belongs: 'select-same',
        },
        {
            id: 'select-same-colortag',
            label: 'Color Tag',
            action: () => {
                // Request to select the elements with the same color tag
                window.dispatchEvent(new CustomEvent('element:select-same-colortag'));
            },
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
            for: ['paste-text-content', 'paste-inner-html', 'paste-outer-html', 'paste-style', 'paste-size', 'paste-width', 'paste-height', 'paste-size-separately', 'paste-width-separately', 'paste-height-separately'],
        },
        {
            id: 'paste-text-content',
            label: 'Paste Text Content',
            action: () => {
                // Request to paste the text content of the element
                window.dispatchEvent(new CustomEvent('element:paste-text-content'));
            },
            disabled: event.currentTarget.dataset.tagName === 'html',
            belongs: 'paste-special',
        },
        {
            id: 'paste-inner-html',
            label: 'Paste Inner HTML',
            action: () => {
                // Request to paste the inner HTML of the element
                window.dispatchEvent(new CustomEvent('element:paste-inner-html'));
            },
            disabled: event.currentTarget.dataset.tagName === 'html',
            belongs: 'paste-special',
        },
        {
            id: 'paste-outer-html',
            label: 'Paste Outer HTML',
            action: () => {
                // Request to paste the outer HTML of the element
                window.dispatchEvent(new CustomEvent('element:paste-outer-html'));
            },
            disabled: event.currentTarget.dataset.tagName === 'html',
            belongs: 'paste-special',
        },
        {
            id: 'paste-style',
            label: 'Paste Style',
            action: () => {
                // Request to paste the style of the element
                window.dispatchEvent(new CustomEvent('element:paste-style'));
            },
            belongs: 'paste-special',
        },
        {
            spacer: true,
            for: ['paste-size', 'paste-width', 'paste-height', 'paste-size-separately', 'paste-width-separately', 'paste-height-separately'],
            belongs: 'paste-special',
        },
        {
            id: 'paste-size',
            label: 'Paste Size',
            action: () => {
                // Request to paste the size of the element
                window.dispatchEvent(new CustomEvent('element:paste-size'));
            },
            belongs: 'paste-special',
        },
        {
            id: 'paste-width',
            label: 'Paste Width',
            action: () => {
                // Request to paste the width of the element
                window.dispatchEvent(new CustomEvent('element:paste-width'));
            },
            belongs: 'paste-special',
        },
        {
            id: 'paste-height',
            label: 'Paste Height',
            action: () => {
                // Request to paste the height of the element
                window.dispatchEvent(new CustomEvent('element:paste-height'));
            },
            belongs: 'paste-special',
        },
        {
            id: 'paste-size-separately',
            label: 'Paste Size Separately',
            action: () => {
                // Request to paste the size of the element separately
                window.dispatchEvent(new CustomEvent('element:paste-size-separately'));
            },
            belongs: 'paste-special',
        },
        {
            id: 'paste-width-separately',
            label: 'Paste Width Separately',
            action: () => {
                // Request to paste the width of the element separately
                window.dispatchEvent(new CustomEvent('element:paste-width-separately'));
            },
            belongs: 'paste-special',
        },
        {
            id: 'paste-height-separately',
            label: 'Paste Height Separately',
            action: () => {
                // Request to paste the height of the element separately
                window.dispatchEvent(new CustomEvent('element:paste-height-separately'));
            },
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
            disabled: ['html', 'head', 'body'].includes(event.currentTarget.dataset.tagName),
            belongs: 'paste-special',
        },
        {
            id: 'paste-after',
            label: 'Paste After',
            action: () => {
                // Request to paste the element after the element
                window.dispatchEvent(new CustomEvent('element:paste-after'));
            },
            disabled: ['html', 'head', 'body'].includes(event.currentTarget.dataset.tagName),
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
            disabled: event.currentTarget.dataset.tagName === 'html',
            belongs: 'paste-special',
        },
        {
            id: 'paste-last-child',
            label: 'Paste Last Child',
            action: () => {
                // Request to paste the element as the last child of the element
                window.dispatchEvent(new CustomEvent('element:paste-last-child'));
            },
            disabled: event.currentTarget.dataset.tagName === 'html',
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
            disabled: ['html', 'head', 'body'].includes(event.currentTarget.dataset.tagName),
            belongs: 'clone',
        },
        {
            id: 'unlink-clone',
            label: 'Unlink Clone',
            action: () => {
                // Request to unlink a clone of the element
                window.dispatchEvent(new CustomEvent('element:unlink-clone'));
            },
            // TODO: disable if the element is not a clone
            disabled: ['html', 'head', 'body'].includes(event.currentTarget.dataset.tagName),
            belongs: 'clone',
        },
        {
            id: 'select-original-clone',
            label: 'Select Original Clone',
            action: () => {
                // Request to select the original clone of the element
                window.dispatchEvent(new CustomEvent('element:select-original-clone'));
            },
            // TODO: disable if the element is not a clone
            disabled: ['html', 'head', 'body'].includes(event.currentTarget.dataset.tagName),
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
            for: ['move-to-top', 'move-to-bottom', 'move-up', 'move-down', 'outdent-up', 'outdent-down', 'indent-up', 'indent-down', 'align-left', 'align-center', 'align-right', 'align-top', 'align-middle', 'align-bottom', 'rotate-left', 'rotate-right', 'flip-horizontal', 'flip-vertical']
        },
        {
            group: true,
            id: 'move',
            label: 'Move',
            for: ['move-to-top', 'move-to-bottom', 'move-up', 'move-down', 'outdent-up', 'outdent-down', 'indent-up', 'indent-down'],
        },
        {
            // TODO: rename to 'Move to Front' for absolute/fixed positioning?
            id: 'move-to-top',
            label: 'Move to Top',
            action: () => {
                // Request to move the element to the top
                window.dispatchEvent(new CustomEvent('element:move-to-top'));
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
            // TODO: rename to 'Move Forward' for absolute/fixed positioning?
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
            // TODO: rename to 'Move Backward' for absolute/fixed positioning?
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
            // TODO: rename to 'Move to Back' for absolute/fixed positioning?
            id: 'move-to-bottom',
            label: 'Move to Bottom',
            action: () => {
                // Request to move the element to bottom
                window.dispatchEvent(new CustomEvent('element:move-to-bottom'));
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
            belongs: 'align',
        },
        {
            id: 'align-center',
            label: 'Align Center',
            action: () => {
                // Request to align the element to the center
                window.dispatchEvent(new CustomEvent('element:align-center'));
            },
            belongs: 'align',
        },
        {
            id: 'align-right',
            label: 'Align Right',
            action: () => {
                // Request to align the element to the right
                window.dispatchEvent(new CustomEvent('element:align-right'));
            },
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
            belongs: 'align',
        },
        {
            id: 'align-middle',
            label: 'Align Middle',
            action: () => {
                // Request to align the element to the middle
                window.dispatchEvent(new CustomEvent('element:align-middle'));
            },
            belongs: 'align',
        },
        {
            id: 'align-bottom',
            label: 'Align Bottom',
            action: () => {
                // Request to align the element to the bottom
                window.dispatchEvent(new CustomEvent('element:align-bottom'));
            },
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
            belongs: 'transform',
        },
        {
            id: 'rotate-right',
            label: 'Rotate Right',
            action: () => {
                // Request to rotate the element to the right
                window.dispatchEvent(new CustomEvent('element:rotate-right'));
            },
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
            belongs: 'transform',
        },
        {
            id: 'flip-vertical',
            label: 'Flip Vertical',
            action: () => {
                // Request to flip the element vertically
                window.dispatchEvent(new CustomEvent('element:flip-vertical'));
            },
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
        },
    ];

    // Add custom context menu item for select parent element
    const parentElements = [];
    let parent = selectedElement.parentElement;
    while (parent) {
        parentElements.push({
            id: parent.dataset.uwId,
            label: elementData[parent.dataset.uwId].label,
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
            action: () => {
                // Request to select the parent element
                window.dispatchEvent(new CustomEvent('element:select', {
                    detail: { uwId: parentElements[index].id, target: 'outline-panel' }
                }));
            },
            belongs: 'select-parent',
        })),
        ...customEvent.uwMenu,
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

const clickBreadcrumbItem = (event) => {
    // Prevent from updating the selected element if the target element is already selected
    if (selectedElement?.dataset.uwId === event.currentTarget.dataset.uwId) {
        return;
    }

    // Request to update the selected element
    window.dispatchEvent(new CustomEvent('element:select', {
        detail: { uwId: event.currentTarget.dataset.uwId, target: 'outline-panel' }
    }));
}

const mouseEnterBreadcrumbItem = (event) => {
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

    // Clear the breadcrumb
    breadcrumb.innerHTML = '';

    // Populate the breadcrumb with the selected element
    let parentElement = selectedElement;
    while (parentElement) {
        const breadcrumbItem = document.createElement('span');
        breadcrumbItem.textContent = parentElement.tagName.toLowerCase();
        breadcrumbItem.dataset.uwId = parentElement.dataset.uwId;
        breadcrumbItem.addEventListener('click', clickBreadcrumbItem);
        breadcrumbItem.addEventListener('mouseenter', mouseEnterBreadcrumbItem);
        breadcrumbItem.addEventListener('mouseleave', mouseLeaveBreadcrumbItem);
        breadcrumb.insertBefore(breadcrumbItem, breadcrumb.firstChild);
        parentElement = parentElement.parentElement;
    }

    // Show the breadcrumb
    breadcrumb.classList.add('expanded');
}

const toggleElementInclusion = (event, button) => {
    // TODO: implement the inclusion toggle action
    // TODO: push to action history
}

const toggleElementVisibility = (event, button) => {
    const visibilityIcon = button.querySelector('.element-visibility');
    visibilityIcon.classList.toggle('icon-eye');
    visibilityIcon.classList.toggle('icon-eye-off');

    // TODO: implement the visibility toggle action
    // TODO: push to action history
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
    listItem.dataset.tagName = node.tagName ? node.tagName.toLowerCase() : 'text';
    listItem.dataset.uwId = node.dataset?.uwId || '';
    listItem.style.setProperty('--guide-size', `${14 + level * 15}px`);

    // Check if the element has children
    // exlude for text nodes and empty text nodes
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
    button.dataset.color = elementData[node.dataset?.uwId]?.color || 'transparent';
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
        // add a square icon
        icon = document.createElement('div');
        icon.classList.add('icon', 'icon-box');
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
        elementData[node.dataset?.uwId]?.label ||
        (
            node.nodeType === Node.TEXT_NODE
                ? node.textContent.trim()
                : ''
        );
    buttonLabel.append(buttonLabelContent);
    // add a span for the element tag name
    if (node.tagName) {
        buttonLabelContent = document.createElement('span');
        buttonLabelContent.classList.add('element-tagname');
        buttonLabelContent.textContent = '<' + node.tagName.toLowerCase() + '>';
        buttonLabel.append(buttonLabelContent);
    }
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
    // set the title attribute for the button
    button.title = buttonLabel.textContent;
    // append the label to the button
    button.appendChild(buttonLabel);

    // Add inclusion toggle button for the button element
    // except for metadata, HTML, head, and body elements
    if (
        node.tagName &&
        ! ['html', 'head', 'body'].includes(node.tagName.toLowerCase()) &&
        ! apiSchema.htmlElements.find(element => element.tag === node.tagName.toLowerCase()).categories.includes('metadata')
    ) {
        const inclusionCheckbox = document.createElement('input');
        inclusionCheckbox.type = 'checkbox';
        inclusionCheckbox.classList.add('element-inclusion');
        inclusionCheckbox.checked = true;
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
        ! apiSchema.htmlElements.find(element => element.tag === node.tagName.toLowerCase()).categories.includes('metadata')
    ) {
        const visibilityButton = document.createElement('div');
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
    if (selectedElement) {
        // Get the list item element
        const listItemButton = panelContentContainer.querySelector(`button[data-uw-id="${selectedElement?.dataset.uwId}"]`);
        // Highlight the selected element
        highlightSelectedListItem({
            currentTarget: listItemButton,
            stopPropagation: () => {},
            preventDefault: () => {},
        });
    }

    // Refresh the breadcrumb
    refreshBreadcrumb();

    //
    console.log('[Editor] Refreshing outline panel... [DONE]');
}

const onElementSelect = () => {
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

const onElementHover = () => {
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
        altKey: true,
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
}

const onListItemButtonDragEnd = (event) => {
    // Reset the drag guide element
    event.target.classList.remove('dragging');
    elementDragGuide.remove();
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
    window.addEventListener('outline:refresh', refreshPanel);
    window.addEventListener('outline:select', onElementSelect);
    window.addEventListener('outline:hover', onElementHover);
})()