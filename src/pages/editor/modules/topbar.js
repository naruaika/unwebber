'use strict';

import {
    selectedElement,
    hasCutElement,
    elementToPaste,
    setSelectedElement,
    setHoveredElement,
    setHasCutElement,
    setElementToPaste,
    apiSchema,
} from '../globals.js';
import { setupDocument } from '../helpers.js';

const mainFrame = document.getElementById('main-iframe');

export const Mode = Object.freeze({
    MOVE: 'move',
    NODE: 'node',
    CODE: 'code',
    LIVE: 'live',
});

export var currentMode;

export const setMode = (targetMode) => {
    // Return if the target mode is invalid
    if (! Object.values(Mode).includes(targetMode)) {
        console.log(`[Editor] Invalid edit mode: ${targetMode}`);
        return;
    }

    // Set the current edit mode
    currentMode = targetMode;
    console.log(`[Editor] Select edit mode: ${currentMode}`);

    // Set the edit mode button to checked
    document.getElementById(`edit-${targetMode}-button`).checked = true;
}

const onButtonClick = (event) => {
    // Set the current edit mode
    setMode(event.target?.value);
}

const onElementSelect = (event) => {
    // Set the selected element to null if there is no event detail
    if (! event?.detail.uwId) {
        setSelectedElement(null);
        return;
    }

    // Update the selected element
    const element = mainFrame.contentDocument.querySelector(`[data-uw-id="${event.detail.uwId}"]`);
    setSelectedElement(element);
    console.log(`[Editor] Select element: @${element.dataset.uwId}`);
}

const onElementHover = (event) => {
    // Set the hovered element to null if there is no event detail
    if (! event?.detail.uwId) {
        setHoveredElement(null);
        return;
    }

    // Update the hovered element
    const element = mainFrame.contentDocument.querySelector(`[data-uw-id="${event.detail.uwId}"]`);
    setHoveredElement(element);
    console.log(`[Editor] Hover element: @${element.dataset.uwId}`);
}

const onElementCut = () => {
    // Return if there is no selected element
    if (! selectedElement) {
        console.log('[Editor] Cannot cut element: no element selected');
        return;
    }

    // Prevent cutting the HTML, head, or body elements
    if (['html', 'head', 'body'].includes(selectedElement.tagName.toLowerCase())) {
        console.log('[Editor] Cannot cut element: the element is not allowed to be cut');
        return;
    }

    // Save the current action state
    const previousState = {
        // FIXME: should be the container ID instead of the container element
        container: selectedElement.parentElement,
        position: Array.prototype.indexOf.call(selectedElement.parentElement.childNodes, selectedElement),
    };
    const actionContext = { element: selectedElement };

    // Remove the selected element from the document
    selectedElement.remove();

    // Set the element to paste and the cut element flag
    setHasCutElement(true);
    setElementToPaste(selectedElement);

    // Clear the selected element
    setSelectedElement(null);

    // Request to save the action
    window.dispatchEvent(new CustomEvent('action:save', {
        detail: {
            title: 'element:cut',
            previous: previousState,
            upcoming: {},
            reference: actionContext,
        }
    }));

    //
    console.log(`[Editor] Cut element: @${actionContext.element.dataset.uwId}`);

    // Request the document tree refresh
    window.dispatchEvent(new CustomEvent('document:tree'));
}

const onElementCopy = () => {
    // Return if there is no selected element
    if (! selectedElement) {
        console.log('[Editor] Cannot cut element: no element selected');
        return;
    }

    // Prevent copying the HTML, head, or body elements
    if (['html', 'head', 'body'].includes(selectedElement.tagName.toLowerCase())) {
        console.log('[Editor] Cannot copy element: the element is not allowed to be copied');
        return;
    }

    // Set the element to paste
    setElementToPaste(selectedElement);
    console.log(`[Editor] Copy element: @${selectedElement.dataset.uwId}`);
}

const onElementPaste = () => {
    // Return if there is no element-to-paste
    if (! elementToPaste) {
        console.log('[Editor] Cannot paste element: no element to paste');
        return;
    }

    // Save the current action state
    const actionContext = { element: elementToPaste };

    // Clone the element-to-paste if it is not a cut element
    if (! hasCutElement) {
        setElementToPaste(elementToPaste.cloneNode(true));
    }

    // Paste the element to the document if there is selected element
    // or insert it relative to the selected element
    if (selectedElement) {
        // Append the element to the selected element if the selected element has child nodes
        // or insert it after the selected element
        if (selectedElement.hasChildNodes()) {
            // Insert the element after the selected element if the selected element only contains empty text
            // or append the element to the selected element
            if (Array.from(selectedElement.childNodes).every(node => node.nodeType === Node.TEXT_NODE)) {
                selectedElement.insertAdjacentElement('afterend', elementToPaste);
            } else {
                selectedElement.appendChild(elementToPaste);
            }
        } else {
            selectedElement.insertAdjacentElement('afterend', elementToPaste);
        }
    } else {
        mainFrame.contentDocument.body.appendChild(elementToPaste);
    }

    // Save the upcoming action state
    const upcomingState = {
        // FIXME: should be the container ID instead of the container element
        container: elementToPaste.parentElement,
        position: Array.prototype.indexOf.call(elementToPaste.parentElement.childNodes, elementToPaste),
        hasCutElement,
    };

    // Cache the pasted element
    setupDocument(elementToPaste, ! hasCutElement);
    if (hasCutElement) {
        setHasCutElement(false);
        elementToPaste.removeAttribute('id');
    }

    // Select the pasted element
    onElementSelect({ detail: { uwId: elementToPaste.dataset.uwId } });

    // Request to save the action
    window.dispatchEvent(new CustomEvent('action:save', {
        detail: {
            title: 'element:paste',
            previous: {},
            upcoming: upcomingState,
            reference: actionContext,
        }
    }));

    //
    console.log(`[Editor] Paste element: @${actionContext.element.dataset.uwId}`);

    // Request the document tree refresh
    window.dispatchEvent(new CustomEvent('document:tree'));
}

const onElementDelete = () => {
    // Return if there is no selected element
    if (! selectedElement) {
        console.log('[Editor] Cannot delete element: no element selected');
        return;
    }

    // Prevent deleting the HTML, head, or body elements
    if (['html', 'head', 'body'].includes(selectedElement.tagName.toLowerCase())) {
        console.log('[Editor] Cannot delete element: the element is not allowed to be deleted');
        return;
    }

    const previousState = {
        // FIXME: should be the container ID instead of the container element
        container: selectedElement.parentElement,
        position: Array.prototype.indexOf.call(selectedElement.parentElement.childNodes, selectedElement),
    };
    const actionContext = { element: selectedElement };

    // Remove the selected element from the document
    selectedElement.remove();

    // Clear the selected element
    setSelectedElement(null);

    // Request to save the action
    window.dispatchEvent(new CustomEvent('action:save', {
        detail: {
            title: 'element:delete',
            previous: previousState,
            upcoming: {},
            reference: actionContext,
        }
    }));

    //
    console.log(`[Editor] Delete element: @${actionContext.element.dataset.uwId}`);

    // Request the document tree refresh
    window.dispatchEvent(new CustomEvent('document:tree'));
}

const onElementDuplicate = () => {
    // Return if there is no selected element
    if (! selectedElement) {
        console.log('[Editor] Cannot duplicate element: no element selected');
        return;
    }

    // Prevent duplicating the HTML, head, or body elements
    if (['html', 'head', 'body'].includes(selectedElement.tagName.toLowerCase())) {
        console.log('[Editor] Cannot duplicate element: the element is not allowed to be duplicated');
        return;
    }

    // Save the current action state
    const previousState = {
        // FIXME: should be the container ID instead of the container element
        container: selectedElement.parentElement,
        position: Array.prototype.indexOf.call(selectedElement.parentElement.childNodes, selectedElement),
    };

    // Duplicate the selected element
    const duplicatedElement = selectedElement.cloneNode(true);
    selectedElement.insertAdjacentElement('afterend', duplicatedElement);

    // Cache the duplicated element
    setupDocument(duplicatedElement);

    // Select the duplicated element
    onElementSelect({ detail: { uwId: duplicatedElement.dataset.uwId } });

    // Request to save the action
    window.dispatchEvent(new CustomEvent('action:save', {
        detail: {
            title: 'element:duplicate',
            previous: previousState,
            upcoming: {},
            reference: { element: duplicatedElement },
        }
    }));

    //
    console.log(`[Editor] Duplicate element: @${duplicatedElement.dataset.uwId}`);

    // Request the document tree refresh
    window.dispatchEvent(new CustomEvent('document:tree'));
}

const onElementClone = () => { /* TODO: implement this */ }

const onElementWrap = () => { /* TODO: implement this */ }

const onElementUnwrap = () => {
    // Return if there is no selected element
    if (! selectedElement) {
        console.log('[Editor] Cannot unwrap element: no element selected');
        return;
    }

    // Prevent unwrapping the HTML, head, body, meta, title, link, or base elements
    if (
        ['html', 'head', 'body', 'meta', 'title', 'link', 'base'].includes(selectedElement.tagName.toLowerCase()) ||
        selectedElement.parentElement.tagName.toLowerCase() === 'body'
    ) {
        console.log('[Editor] Cannot unwrap element: the element is not allowed to be unwrapped');
        return;
    }

    // Remove empty text nodes from the parent of the selected element
    Array.from(selectedElement.parentElement.childNodes).forEach(node => {
        if (node.nodeType === Node.TEXT_NODE && node.textContent.trim() === '') {
            node.remove();
        }
    });

    // Save the current action state
    // FIXME: should be the container ID instead of the container element
    const parentElement = selectedElement.parentElement;
    const previousState = { container: parentElement };

    // Unwrap the selected element and all of its siblings
    Array.from(selectedElement.parentElement.childNodes).forEach(node => {
        selectedElement.parentElement.insertAdjacentElement('beforebegin', node);
    });

    // Remove the parent element of the selected element
    parentElement.remove();

    // Request to save the action
    window.dispatchEvent(new CustomEvent('action:save', {
        detail: {
            title: 'element:unwrap',
            previous: previousState,
            upcoming: {},
            reference: { elements: Array.from(selectedElement.parentElement.childNodes) },
        }
    }));

    //
    console.log(`[Editor] Unwrap element in: @${previousState.container.dataset.uwId}`);

    // Request the document tree refresh
    window.dispatchEvent(new CustomEvent('document:tree'));
}

const onElementInsertBefore = () => { /* TODO: implement this */ }

const onElementInsertAfter = () => { /* TODO: implement this */ }

const onElementInsertFirstChild = () => { /* TODO: implement this */ }

const onElementInsertLastChild = () => { /* TODO: implement this */ }

const onElementMoveUp = () => {
    // Return if there is no selected element
    if (! selectedElement) {
        console.log('[Editor] Cannot move up element: no element selected');
        return;
    }

    // Prevent moving up the HTML, head, or body elements
    if (
        ['html', 'head', 'body'].includes(selectedElement.tagName.toLowerCase()) ||
        (
            ! selectedElement.previousSibling ||
            (
                ! selectedElement.previousElementSibling &&
                (
                    selectedElement.previousSibling.nodeType === Node.TEXT_NODE &&
                    selectedElement.previousSibling.textContent.trim() === ''
                )
            )
        )
    ) {
        console.log('[Editor] Cannot move up element: the element is not allowed to be moved up');
        return;
    }

    // Save the current action state
    const previousState = {
        // FIXME: should be the container ID instead of the container element
        container: selectedElement.parentElement,
        position: Array.prototype.indexOf.call(selectedElement.parentElement.childNodes, selectedElement),
    };

    // Move up the selected element
    if (
        selectedElement.previousSibling.nodeType === Node.TEXT_NODE &&
        selectedElement.previousSibling.textContent.trim() !== ''
    ) {
        selectedElement.previousSibling.insertAdjacentElement('beforebegin', selectedElement);
    } else {
        selectedElement.previousElementSibling.insertAdjacentElement('beforebegin', selectedElement);
    }

    // Request to save the action
    const upcomingState = {
        position: Array.prototype.indexOf.call(selectedElement.parentElement.childNodes, selectedElement),
    };
    window.dispatchEvent(new CustomEvent('action:save', {
        detail: {
            title: 'element:move-up',
            previous: previousState,
            upcoming: upcomingState,
            reference: { element: selectedElement },
        }
    }));

    //
    console.log(`[Editor] Move up element: @${selectedElement.dataset.uwId}`);

    // Request the document tree refresh
    window.dispatchEvent(new CustomEvent('document:tree'));
}

const onElementMoveDown = () => {
    // Return if there is no selected element
    if (! selectedElement) {
        console.log('[Editor] Cannot move down element: no element selected');
        return;
    }

    // Prevent moving down the HTML, head, or body elements
    if (
        ['html', 'head', 'body'].includes(selectedElement.tagName.toLowerCase()) ||
        (
            ! selectedElement.nextSibling ||
            (
                ! selectedElement.nextElementSibling &&
                (
                    selectedElement.nextSibling.nodeType === Node.TEXT_NODE &&
                    selectedElement.nextSibling.textContent.trim() === ''
                )
            )
        )
    ) {
        console.log('[Editor] Cannot move down element: the element is not allowed to be moved down');
        return;
    }

    // Save the current action state
    const previousState = {
        // FIXME: should be the container ID instead of the container element
        container: selectedElement.parentElement,
        position: Array.prototype.indexOf.call(selectedElement.parentElement.childNodes, selectedElement),
    };

    // Move down the selected element
    if (
        selectedElement.nextSibling.nodeType === Node.TEXT_NODE &&
        selectedElement.nextSibling.textContent.trim() !== ''
    ) {
        selectedElement.nextSibling.insertAdjacentElement('afterend', selectedElement);
    } else {
        selectedElement.nextElementSibling.insertAdjacentElement('afterend', selectedElement);
    }

    // Request to save the action
    const upcomingState = {
        position: Array.prototype.indexOf.call(selectedElement.parentElement.childNodes, selectedElement),
    };
    window.dispatchEvent(new CustomEvent('action:save', {
        detail: {
            title: 'element:move-down',
            previous: previousState,
            upcoming: upcomingState,
            reference: { element: selectedElement },
        }
    }));

    //
    console.log(`[Editor] Move down element: @${selectedElement.dataset.uwId}`);

    // Request the document tree refresh
    window.dispatchEvent(new CustomEvent('document:tree'));
}

const onElementOutdentUp = () => {
    // Return if there is no selected element
    if (! selectedElement) {
        console.log('[Editor] Cannot outdent up element: no element selected');
        return;
    }

    // Prevent outdenting up the HTML, head, body, meta, title, link, or base elements
    // or the child of the body element
    if (
        ['html', 'head', 'body', 'meta', 'title', 'link', 'base'].includes(selectedElement.tagName.toLowerCase()) ||
        selectedElement.parentElement.tagName.toLowerCase() === 'body'
    ) {
        console.log('[Editor] Cannot outdent up element: the element is not allowed to be moved out up');
        return;
    }

    // Prevent outdenting up the child of the body element
    if (selectedElement.parentElement.tagName.toLowerCase() === 'body') {
        console.log('[Editor] Cannot outdent up element: the element is already the child of the body element');
        return;
    }

    // Save the current action state
    const previousState = {
        // FIXME: should be the container ID instead of the container element
        container: selectedElement.parentElement,
        position: Array.prototype.indexOf.call(selectedElement.parentElement.childNodes, selectedElement),
    };

    // Move out up the selected element
    selectedElement.parentElement.insertAdjacentElement('beforebegin', selectedElement);

    // Request to save the action
    const upcomingState = {
        // FIXME: should be the container ID instead of the container element
        container: selectedElement.parentElement,
        position: Array.prototype.indexOf.call(selectedElement.parentElement.childNodes, selectedElement),
    };
    window.dispatchEvent(new CustomEvent('action:save', {
        detail: {
            title: 'element:outdent-up',
            previous: previousState,
            upcoming: upcomingState,
            reference: { element: selectedElement },
        }
    }));

    //
    console.log(`[Editor] Move out up element: @${selectedElement.dataset.uwId}`);

    // Request the document tree refresh
    window.dispatchEvent(new CustomEvent('document:tree'));
}

const onElementOutdentDown = () => {
    // Return if there is no selected element
    if (! selectedElement) {
        console.log('[Editor] Cannot outdent down element: no element selected');
        return;
    }

    // Prevent outdenting down the HTML, head, body, meta, title, link, or base elements
    // or the child of the body element
    if (
        ['html', 'head', 'body', 'meta', 'title', 'link', 'base'].includes(selectedElement.tagName.toLowerCase()) ||
        selectedElement.parentElement.tagName.toLowerCase() === 'body'
    ) {
        console.log('[Editor] Cannot outdent down element: the element is not allowed to be moved out down');
        return;
    }

    // Prevent outdenting down the child of the body element
    if (selectedElement.parentElement.tagName.toLowerCase() === 'body') {
        console.log('[Editor] Cannot outdent down element: the element is already the child of the body element');
        return;
    }

    // Save the current action state
    const previousState = {
        // FIXME: should be the container ID instead of the container element
        container: selectedElement.parentElement,
        position: Array.prototype.indexOf.call(selectedElement.parentElement.childNodes, selectedElement),
    };

    // Move out down the selected element
    selectedElement.parentElement.insertAdjacentElement('afterend', selectedElement);

    // Request to save the action
    const upcomingState = {
        // FIXME: should be the container ID instead of the container element
        container: selectedElement.parentElement,
        position: Array.prototype.indexOf.call(selectedElement.parentElement.childNodes, selectedElement),
    };
    window.dispatchEvent(new CustomEvent('action:save', {
        detail: {
            title: 'element:outdent-down',
            previous: previousState,
            upcoming: upcomingState,
            reference: { element: selectedElement },
        }
    }));

    //
    console.log(`[Editor] Move out down element: @${selectedElement.dataset.uwId}`);

    // Request the document tree refresh
    window.dispatchEvent(new CustomEvent('document:tree'));
}

const onElementIndentUp = () => {
    // Return if there is no selected element
    if (! selectedElement) {
        console.log('[Editor] Cannot indent up element: no element selected');
        return;
    }

    // Prevent indenting up the HTML, head, body, meta, title, link, or base elements
    // or when there is no previous element
    // or when the previous element is a void element
    if (
        ['html', 'head', 'body', 'meta', 'title', 'link', 'base'].includes(selectedElement.tagName) ||
        ! selectedElement.previousElementSibling ||
        (
            selectedElement.previousElementSibling &&
            apiSchema.htmlElements.find(element => element.tag === selectedElement.previousElementSibling.tagName.toLowerCase()).categories.includes('void')
        )
    ) {
        console.log('[Editor] Cannot indent up element: the element is not allowed to be indented up');
        return;
    }

    // Save the current action state
    const previousState = {
        // FIXME: should be the container ID instead of the container element
        container: selectedElement.parentElement,
        position: Array.prototype.indexOf.call(selectedElement.parentElement.childNodes, selectedElement),
    };

    // Indent up the selected element
    selectedElement.previousElementSibling.insertAdjacentElement('beforeend', selectedElement);

    // Request to save the action
    const upcomingState = {
        // FIXME: should be the container ID instead of the container element
        container: selectedElement.parentElement,
        position: Array.prototype.indexOf.call(selectedElement.parentElement.childNodes, selectedElement),
    };
    window.dispatchEvent(new CustomEvent('action:save', {
        detail: {
            title: 'element:indent-up',
            previous: previousState,
            upcoming: upcomingState,
            reference: { element: selectedElement },
        }
    }));

    //
    console.log(`[Editor] Indent up element: @${selectedElement.dataset.uwId}`);

    // Request the document tree refresh
    window.dispatchEvent(new CustomEvent('document:tree'));
}

const onElementIndentDown = () => {
    // Return if there is no selected element
    if (! selectedElement) {
        console.log('[Editor] Cannot indent down element: no element selected');
        return;
    }

    // Prevent indenting down the HTML, head, body, meta, title, link, or base elements
    // or when there is no next element
    // or when the next element is a void element
    if (
        ['html', 'head', 'body', 'meta', 'title', 'link', 'base'].includes(selectedElement.tagName) ||
        ! selectedElement.nextElementSibling ||
        (
            selectedElement.nextElementSibling &&
            apiSchema.htmlElements.find(element => element.tag === selectedElement.nextElementSibling.tagName.toLowerCase()).categories.includes('void')
        )
    ) {
        console.log('[Editor] Cannot indent down element: the element is not allowed to be indented down');
        return;
    }

    // Save the current action state
    const previousState = {
        // FIXME: should be the container ID instead of the container element
        container: selectedElement.parentElement,
        position: Array.prototype.indexOf.call(selectedElement.parentElement.childNodes, selectedElement),
    };

    // Indent down the selected element
    selectedElement.nextElementSibling.insertAdjacentElement('afterbegin', selectedElement);

    // Request to save the action
    const upcomingState = {
        // FIXME: should be the container ID instead of the container element
        container: selectedElement.parentElement,
        position: Array.prototype.indexOf.call(selectedElement.parentElement.childNodes, selectedElement),
    };
    window.dispatchEvent(new CustomEvent('action:save', {
        detail: {
            title: 'element:indent-down',
            previous: previousState,
            upcoming: upcomingState,
            reference: { element: selectedElement },
        }
    }));

    //
    console.log(`[Editor] Indent down element: @${selectedElement.dataset.uwId}`);

    // Request the document tree refresh
    window.dispatchEvent(new CustomEvent('document:tree'));
}

(() => {
    // For each edit mode button
    document.querySelectorAll('.main-tool__edit').forEach(button => {
        // Register edit mode change event listeners
        button.addEventListener('change', onButtonClick);
    });

    // Register the window message event listener
    window.addEventListener('element:select', onElementSelect);
    window.addEventListener('element:hover', onElementHover);
    window.addEventListener('element:cut', onElementCut);
    window.addEventListener('element:copy', onElementCopy);
    window.addEventListener('element:paste', onElementPaste);
    window.addEventListener('element:delete', onElementDelete);
    window.addEventListener('element:duplicate', onElementDuplicate);
    window.addEventListener('element:clone', onElementClone);
    window.addEventListener('element:wrap', onElementWrap);
    window.addEventListener('element:unwrap', onElementUnwrap);
    window.addEventListener('insert-before', onElementInsertBefore)
    window.addEventListener('insert-after', onElementInsertAfter)
    window.addEventListener('insert-first-child', onElementInsertFirstChild)
    window.addEventListener('insert-last-child', onElementInsertLastChild)
    window.addEventListener('element:move-up', onElementMoveUp);
    window.addEventListener('element:move-down', onElementMoveDown);
    window.addEventListener('element:outdent-up', onElementOutdentUp);
    window.addEventListener('element:outdent-down', onElementOutdentDown);
    window.addEventListener('element:indent-up', onElementIndentUp);
    window.addEventListener('element:indent-down', onElementIndentDown);
})()