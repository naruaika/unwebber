'use strict';

import {
    metadata,
    setSelectedNode,
    setHasCutNode,
    setNodeToPaste,
    setMetadata,
} from '../globals.js';
import { setupDocument, styleElement } from '../helpers.js';

const mainFrame = document.getElementById('main-iframe');

let actionHistory = [];

let actionHistoryIndex = -1;

const saveAction = (event) => {
    // Get the current timestamp
    const timestamp = Date.now();

    // Delete the action history after the current index
    if (actionHistoryIndex < actionHistory.length - 1) {
        actionHistory = actionHistory.slice(0, actionHistoryIndex + 1);
    }

    // Calculate the memory usage of the action history
    const memoryUsage = JSON.stringify(actionHistory).length;

    // Delete the action history until the memory usage less than 2048MB
    while (memoryUsage > 2048 * 1024 * 1024) {
        actionHistory.shift();
        memoryUsage = JSON.stringify(actionHistory).length;
    }

    // If the title, the reference, and the signature of the previous and upcoming action are equal
    // and the timestamp of the previous action is less than 500ms, update the previous action,
    // otherwise push the action state to the action history
    if (
        actionHistory[actionHistoryIndex]?.title === event.detail.title &&
        actionHistory[actionHistoryIndex]?.reference?.element === event.detail.reference.element &&
        event.detail.signature && actionHistory[actionHistoryIndex]?.signature &&
        event.detail.signature === actionHistory[actionHistoryIndex]?.signature &&
        timestamp - actionHistory[actionHistoryIndex]?.timestamp < 500
    ) {
        actionHistory[actionHistoryIndex] = {
            ...actionHistory[actionHistoryIndex],
            upcoming: event.detail.upcoming,
            timestamp,
        };
    } else {
        actionHistory.push({
            title: event.detail.title,
            previous: event.detail.previous,
            upcoming: event.detail.upcoming,
            reference: event.detail.reference,
            signature: event.detail.signature,
            timestamp,
        });
    }

    // Update the action history index
    actionHistoryIndex = actionHistory.length - 1;
}

const undoAction = () => {
    if (actionHistoryIndex <= -1) {
        return; // do nothing
    }

    const actionState = actionHistory[actionHistoryIndex];

    switch (actionState.title) {
        case 'element:label':
            // Find the element by the id
            const labeledElement = actionState.reference.element.dataset?.uwId
                ? mainFrame.contentDocument.querySelector(`[data-uw-id="${actionState.reference.element.dataset.uwId}"]`)
                : mainFrame.contentDocument.querySelector(`[data-uw-id="${actionState.previous.container.dataset.uwId}"]`).childNodes[actionState.previous.position];

            // Label the element with the previous label
            if (actionState.reference.element.dataset?.uwId) {
                metadata[actionState.reference.element.dataset.uwId].label = actionState.previous.label;
            } else {
                labeledElement.textContent = actionState.previous.label;
            }

            // Request panel updates
            window.dispatchEvent(new CustomEvent('outline:refresh'));

            break;

        case 'element:color-tag':
            // TODO: implement the action
            break;

        case 'element:cut':
            // Get the element to paste
            const cutElement = actionState.reference.element;

            // Put the cut element back to the previous position
            const cutParentElement = actionState.previous.container;
            const cutPositionIndex = actionState.previous.position;
            cutParentElement.insertBefore(cutElement, cutParentElement.childNodes[cutPositionIndex]);

            // Set the element to paste and the cut element flag
            setHasCutNode(false);
            setNodeToPaste(null);

            // TODO: update the metadata cache

            // Set the selected element to the cut element
            setSelectedNode(cutElement, cutPositionIndex, cutParentElement);

            // Request panel updates
            window.dispatchEvent(new CustomEvent('outline:refresh'));
            window.dispatchEvent(new CustomEvent('attribute:refresh'));
            window.dispatchEvent(new CustomEvent('canvas:refresh'));

            break;

        case 'element:paste':
            // Find the element by the id
            const pastedElement = actionState.reference.element.dataset?.uwId
                ? mainFrame.contentDocument.querySelector(`[data-uw-id="${actionState.reference.element.dataset.uwId}"]`)
                : mainFrame.contentDocument.querySelector(`[data-uw-id="${actionState.upcoming.container.dataset.uwId}"]`).childNodes[actionState.upcoming.position];

            // Remove the pasted element from the document
            pastedElement.remove();

            // TODO: update the metadata cache

            // Set the selected element to the pasted element
            setSelectedNode(null);

            // Request panel updates
            window.dispatchEvent(new CustomEvent('outline:refresh'));
            window.dispatchEvent(new CustomEvent('attribute:refresh'));
            window.dispatchEvent(new CustomEvent('canvas:refresh', { detail: { existence: true } }));

            break;

        case 'element:delete':
            // Get the deleted element
            const deletedElement = actionState.reference.element;

            // Put the deleted element back to the previous position
            const deletedParentElement = actionState.previous.container;
            const deletedPositionIndex = actionState.previous.position;
            deletedParentElement.insertBefore(deletedElement, deletedParentElement.childNodes[deletedPositionIndex]);

            // TODO: update the metadata cache

            // Set the selected element to the deleted element
            setSelectedNode(deletedElement, deletedPositionIndex, deletedParentElement);

            // Request panel updates
            window.dispatchEvent(new CustomEvent('outline:refresh'));
            window.dispatchEvent(new CustomEvent('attribute:refresh'));
            window.dispatchEvent(new CustomEvent('canvas:refresh'));

            break;

        case 'element:duplicate':
            // Find the element by the id
            const duplicatedElement = actionState.reference.element.dataset?.uwId
                ? mainFrame.contentDocument.querySelector(`[data-uw-id="${actionState.reference.element.dataset.uwId}"]`)
                : mainFrame.contentDocument.querySelector(`[data-uw-id="${actionState.upcoming.container.dataset.uwId}"]`).childNodes[actionState.upcoming.position];

            // Remove the duplicated element from the document
            duplicatedElement.remove();

            // Set the selected element to the duplicated element
            setSelectedNode(null);

            if (actionState.reference.element.dataset?.uwId) {
                // Clear the element data cache
                setMetadata(duplicatedElement.dataset.uwId, null);
            }

            // Request panel updates
            window.dispatchEvent(new CustomEvent('outline:refresh'));
            window.dispatchEvent(new CustomEvent('attribute:refresh'));
            window.dispatchEvent(new CustomEvent('canvas:refresh'));

            break;

        case 'element:unwrap':
            // Get the parent container
            const unwrappedParentContainer = mainFrame.contentDocument.querySelector(`[data-uw-id="${actionState.previous.parentContainer.dataset.uwId}"]`);

            // Get the unwrapped element
            const unwrappedElements = actionState.reference.elements;

            // Wrap the unwrapped elements back to the previous container
            const unwrappedContainer = actionState.previous.container;
            unwrappedElements.forEach(node => unwrappedContainer.appendChild(node));

            // TODO: update the metadata cache

            // Add the container back to the parent container
            const unwrappedPositionIndex = actionState.previous.position;
            unwrappedParentContainer.insertBefore(unwrappedContainer, unwrappedParentContainer.childNodes[unwrappedPositionIndex]);

            // Set the selected element to the first unwrapped element
            setSelectedNode(unwrappedElements[0], unwrappedPositionIndex, unwrappedContainer);

            // Request panel updates
            window.dispatchEvent(new CustomEvent('outline:refresh'));
            window.dispatchEvent(new CustomEvent('attribute:refresh'));
            window.dispatchEvent(new CustomEvent('canvas:refresh', { detail: { existence: true } }));

            break;

        case 'element:move':
        case 'element:move-to-top':
        case 'element:move-up':
        case 'element:move-down':
        case 'element:move-to-bottom':
        case 'element:outdent-up':
        case 'element:outdent-down':
        case 'element:indent-up':
        case 'element:indent-down':
            // Find the element by the id
            const movedElement = actionState.reference.element.dataset?.uwId
                ? mainFrame.contentDocument.querySelector(`[data-uw-id="${actionState.reference.element.dataset.uwId}"]`)
                : mainFrame.contentDocument.querySelector(`[data-uw-id="${actionState.previous.container.dataset.uwId}"]`).childNodes[actionState.previous.position];

            // Put the moved element back to the previous position
            const movedParentElement = actionState.previous.container;
            const movedPositionIndex = actionState.previous.position;
            movedParentElement.insertBefore(movedElement, movedParentElement.childNodes[movedPositionIndex]);

            // Set the selected element to the moved element
            setSelectedNode(movedElement, movedPositionIndex, movedParentElement);

            // Request panel updates
            window.dispatchEvent(new CustomEvent('outline:refresh'));
            window.dispatchEvent(new CustomEvent('attribute:refresh'));
            window.dispatchEvent(new CustomEvent('canvas:refresh', { detail: { transform: true } }));

            break;

        case 'element:transform':
            // Find the element by the id
            const transformedElement = mainFrame.contentDocument.querySelector(`[data-uw-id="${actionState.reference.element.dataset.uwId}"]`)

            // Apply the transformation of the element
            // TODO: should we restore the previous checked state?
            styleElement(transformedElement, 'transform', actionState.previous.style.transform, true);

            // Save the property value
            const _metadata = metadata[transformedElement.dataset.uwId];
            _metadata.properties['transform'] = { value: actionState.previous.style.transform, checked: true };
            setMetadata(transformedElement.dataset.uwId, _metadata);

            // Request panel updates
            window.dispatchEvent(new CustomEvent('canvas:refresh', { detail: { transform: true } }));

            break;
    }

    actionHistoryIndex -= 1;

    //
    console.log(`[Editor] Undo action: ${actionState.title}`);
}

const redoAction = () => {
    if (actionHistoryIndex >= actionHistory.length - 1) {
        return; // do nothing
    }

    actionHistoryIndex += 1;

    const actionState = actionHistory[actionHistoryIndex];

    switch (actionState.title) {
        case 'element:label':
            // Find the element by the id
            const labeledElement = actionState.reference.element.dataset?.uwId
                ? mainFrame.contentDocument.querySelector(`[data-uw-id="${actionState.reference.element.dataset.uwId}"]`)
                : mainFrame.contentDocument.querySelector(`[data-uw-id="${actionState.previous.container.dataset.uwId}"]`).childNodes[actionState.previous.position];

            // Label the element with the upcoming label
            if (actionState.reference.element.dataset?.uwId) {
                metadata[actionState.reference.element.dataset.uwId].label = actionState.upcoming.label;
            } else {
                labeledElement.textContent = actionState.upcoming.label;
            }

            // Request panel updates
            window.dispatchEvent(new CustomEvent('outline:refresh'));

            break;

        case 'element:color-tag':
            // TODO: implement the action
            break;

        case 'element:cut':
            // Find the element by the id
            const cutElement = actionState.reference.element.dataset?.uwId
                ? mainFrame.contentDocument.querySelector(`[data-uw-id="${actionState.reference.element.dataset.uwId}"]`)
                : mainFrame.contentDocument.querySelector(`[data-uw-id="${actionState.previous.container.dataset.uwId}"]`).childNodes[actionState.previous.position];

            // Remove the cut element from the document
            cutElement.remove();

            // Set the element to paste and the cut element flag
            setHasCutNode(true);
            setNodeToPaste(cutElement);

            // TODO: update the metadata cache

            // Clear the selected element
            setSelectedNode(null);

            // Request panel updates
            window.dispatchEvent(new CustomEvent('outline:refresh'));
            window.dispatchEvent(new CustomEvent('attribute:refresh'));
            window.dispatchEvent(new CustomEvent('canvas:refresh'));

            break;

        case 'element:paste':
            // Get the element to paste
            const pastedElement = actionState.reference.element;

            // Put the pasted element back to the upcoming position
            const pastedParentElement = actionState.upcoming.container;
            const pastedPositionIndex = actionState.upcoming.position;
            pastedParentElement.insertBefore(pastedElement, pastedParentElement.childNodes[pastedPositionIndex]);

            if (actionState.reference.element.dataset?.uwId) {
                // Cache the element-to-paste
                setupDocument(pastedElement, ! actionState.upcoming.hasCutNode);
                // Flag the element-to-paste as a new element
                pastedElement.dataset.uwNew = true;
            }

            // TODO: update the metadata cache

            // Set the selected element to the pasted element
            setSelectedNode(pastedElement, pastedPositionIndex, pastedParentElement);

            // Request panel updates
            window.dispatchEvent(new CustomEvent('outline:refresh'));
            window.dispatchEvent(new CustomEvent('attribute:refresh'));
            window.dispatchEvent(new CustomEvent('canvas:refresh', { detail: { existence: true } }));

            break;

        case 'element:delete':
            // Find the element by the id
            const deletedElement = actionState.reference.element.dataset?.uwId
                ? mainFrame.contentDocument.querySelector(`[data-uw-id="${actionState.reference.element.dataset.uwId}"]`)
                : mainFrame.contentDocument.querySelector(`[data-uw-id="${actionState.previous.container.dataset.uwId}"]`).childNodes[actionState.previous.position];

            // Remove the deleted element from the document
            deletedElement.remove();

            // TODO: update the metadata cache

            // Set the selected element to the deleted element
            setSelectedNode(null);

            // Request panel updates
            window.dispatchEvent(new CustomEvent('outline:refresh'));
            window.dispatchEvent(new CustomEvent('attribute:refresh'));
            window.dispatchEvent(new CustomEvent('canvas:refresh'));

            break;

        case 'element:duplicate':
            // Get the element to duplicate
            const duplicatedElement = actionState.reference.element;

            // Put the duplicated element back to the upcoming position
            const duplicatedParentElement = actionState.upcoming.container;
            const duplicatedPositionIndex = actionState.upcoming.position;
            duplicatedParentElement.insertBefore(duplicatedElement, duplicatedParentElement.childNodes[duplicatedPositionIndex]);

            if (actionState.reference.element.dataset?.uwId) {
                // Cache the duplicated element
                setupDocument(duplicatedElement, ! actionState.upcoming.hasCutNode);
                // Flag the duplicated element as a new element
                duplicatedElement.dataset.uwNew = true;
            }

            // Set the selected element to the duplicated element
            setSelectedNode(duplicatedElement, duplicatedPositionIndex, duplicatedParentElement);

            // Request panel updates
            window.dispatchEvent(new CustomEvent('outline:refresh'));
            window.dispatchEvent(new CustomEvent('attribute:refresh'));
            window.dispatchEvent(new CustomEvent('canvas:refresh'));

            break;

        case 'element:unwrap':
            // Get the container
            const unwrappedContainer = mainFrame.contentDocument.querySelector(`[data-uw-id="${actionState.previous.container.dataset.uwId}"]`);

            // Unwrap all child elements
            Array.from(unwrappedContainer.childNodes).forEach(node => {
                unwrappedContainer.parentElement.insertBefore(node, unwrappedContainer);
            });

            // Remove the container
            unwrappedContainer.remove();

            // TODO: update the metadata cache

            // Request panel updates
            window.dispatchEvent(new CustomEvent('outline:refresh'));
            window.dispatchEvent(new CustomEvent('attribute:refresh'));
            window.dispatchEvent(new CustomEvent('canvas:refresh', { detail: { existence: true } }));

            break;

        case 'element:move':
        case 'element:move-to-top':
        case 'element:move-up':
        case 'element:move-down':
        case 'element:move-to-bottom':
        case 'element:outdent-up':
        case 'element:outdent-down':
        case 'element:indent-up':
        case 'element:indent-down':
            // Find the element by the id
            const movedElement = actionState.reference.element.dataset?.uwId
                ? mainFrame.contentDocument.querySelector(`[data-uw-id="${actionState.reference.element.dataset.uwId}"]`)
                : mainFrame.contentDocument.querySelector(`[data-uw-id="${actionState.upcoming.container.dataset.uwId}"]`).childNodes[actionState.upcoming.position];

            // Put the moved element back to the upcoming position
            const movedParentElement = actionState.upcoming.container;
            const movedPositionIndex = actionState.upcoming.position;
            movedParentElement.insertBefore(movedElement, movedParentElement.childNodes[movedPositionIndex]);

            // Set the selected element to the moved element
            setSelectedNode(movedElement, movedPositionIndex, movedParentElement);

            // Request panel updates
            window.dispatchEvent(new CustomEvent('outline:refresh'));
            window.dispatchEvent(new CustomEvent('attribute:refresh'));
            window.dispatchEvent(new CustomEvent('canvas:refresh', { detail: { transform: true } }));

            break;

        case 'element:transform':
            // Find the element by the id
            const transformedElement = mainFrame.contentDocument.querySelector(`[data-uw-id="${actionState.reference.element.dataset.uwId}"]`)

            // Apply the transformation of the element
            styleElement(transformedElement, 'transform', actionState.upcoming.style.transform, true);

            // Save the property value
            const _metadata = metadata[transformedElement.dataset.uwId];
            _metadata.properties['transform'] = { value: actionState.upcoming.style.transform, checked: true };
            setMetadata(transformedElement.dataset.uwId, _metadata);

            // Request panel updates
            window.dispatchEvent(new CustomEvent('canvas:refresh', { detail: { transform: true } }));

            break;
    }

    //
    console.log(`[Editor] Redo action: ${actionState.title}`);
}

(() => {
    // Register the window message event listener
    window.addEventListener('action:save', saveAction);
    window.addEventListener('action:undo', undoAction);
    window.addEventListener('action:redo', redoAction);
})()