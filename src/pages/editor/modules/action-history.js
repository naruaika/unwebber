'use strict';

import {
    elementData,
    setSelectedElement,
    setHasCutElement,
    setElementToPaste,
    setElementData,
} from '../globals.js';
import { setupDocument } from '../helpers.js';

const mainFrame = document.getElementById('main-iframe');

let actionHistory = [];

let actionHistoryIndex = -1;

const saveAction = (event) => {

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

    // Push the action state to the action history
    actionHistory.push({
        title: event.detail.title,
        previous: event.detail.previous,
        upcoming: event.detail.upcoming,
        reference: event.detail.reference,
    });

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
            const labeledElement = mainFrame.contentDocument.querySelector(`[data-uw-id="${actionState.reference.uwId}"]`);

            // If the element is found
            if (labeledElement) {
                // Label the element with the previous label
                labeledElement.dataset.uwLabel = actionState.previous.label;
                elementData[actionState.reference.uwId].label = actionState.previous.label;

                // Request the document tree refresh
                window.dispatchEvent(new CustomEvent('document:tree'));
            }

            break;

        case 'element:cut':
            // Get the element to paste
            const cutElement = actionState.reference.element;

            // If the element is found
            if (cutElement) {
                // Put the cut element back to the previous position
                const cutParentElement = actionState.previous.container;
                const cutPositionIndex = actionState.previous.position;
                cutParentElement.insertBefore(cutElement, cutParentElement.childNodes[cutPositionIndex]);

                // Set the element to paste and the cut element flag
                setHasCutElement(false);
                setElementToPaste(null);

                // Set the selected element to the cut element
                setSelectedElement(cutElement);

                // Request the document tree refresh
                window.dispatchEvent(new CustomEvent('document:tree'));
            }

            break;

        case 'element:paste':
            // Find the element by the id
            const pastedElement = mainFrame.contentDocument.querySelector(`[data-uw-id="${actionState.reference.element.dataset.uwId}"]`);

            // If the element is found
            if (pastedElement) {
                // Remove the pasted element from the document
                pastedElement.remove();

                // Set the selected element to the pasted element
                setSelectedElement(null);

                // Clear the element data cache
                setElementData(pastedElement.dataset.uwId, null);

                // Request the document tree refresh
                window.dispatchEvent(new CustomEvent('document:tree'));
            }

            break;

        case 'element:delete':
            // Get the deleted element
            const deletedElement = actionState.reference.element;

            // If the element is found
            if (deletedElement) {
                // Put the deleted element back to the previous position
                const deletedParentElement = actionState.previous.container;
                const deletedPositionIndex = actionState.previous.position;
                deletedParentElement.insertBefore(deletedElement, deletedParentElement.childNodes[deletedPositionIndex]);

                // Set the selected element to the deleted element
                setSelectedElement(deletedElement);

                // Request the document tree refresh
                window.dispatchEvent(new CustomEvent('document:tree'));
            }

            break;

        case 'element:duplicate':
            // TODO: implement this
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
            const labeledElement = mainFrame.contentDocument.querySelector(`[data-uw-id="${actionState.reference.uwId}"]`);

            // If the element is found
            if (labeledElement) {
                // Label the element with the upcoming label
                labeledElement.dataset.uwLabel = actionState.upcoming.label;
                elementData[actionState.reference.uwId].label = actionState.upcoming.label;

                // Request the document tree refresh
                window.dispatchEvent(new CustomEvent('document:tree'));
            }

            break;

        case 'element:cut':
            // Find the element by the id
            const cutElement = mainFrame.contentDocument.querySelector(`[data-uw-id="${actionState.reference.element.dataset.uwId}"]`);

            // If the element is found
            if (cutElement) {
                // Remove the cut element from the document
                cutElement.remove();

                // Set the element to paste and the cut element flag
                setHasCutElement(true);
                setElementToPaste(cutElement);

                // Clear the selected element
                setSelectedElement(null);

                // Request the document tree refresh
                window.dispatchEvent(new CustomEvent('document:tree'));
            }

            break;

        case 'element:paste':
            // Get the element to paste
            const pastedElement = actionState.reference.element;

            // If the element is found
            if (pastedElement) {
                // Put the pasted element back to the upcoming position
                const pastedParentElement = actionState.upcoming.container;
                const pastedPositionIndex = actionState.upcoming.position;
                pastedParentElement.insertBefore(pastedElement, pastedParentElement.childNodes[pastedPositionIndex]);

                // Cache the pasted element
                setupDocument(pastedElement, ! actionState.upcoming.hasCutElement);

                // Set the selected element to the pasted element
                setSelectedElement(pastedElement);

                // Request the document tree refresh
                window.dispatchEvent(new CustomEvent('document:tree'));
            }

            break;

        case 'element:delete':
            // Find the element by the id
            const deletedElement = mainFrame.contentDocument.querySelector(`[data-uw-id="${actionState.reference.element.dataset.uwId}"]`);

            // If the element is found
            if (deletedElement) {
                // Remove the deleted element from the document
                deletedElement.remove();

                // Set the selected element to the deleted element
                setSelectedElement(null);

                // Request the document tree refresh
                window.dispatchEvent(new CustomEvent('document:tree'));
            }

            break;

        case 'element:duplicate':
            // TODO: implement this
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