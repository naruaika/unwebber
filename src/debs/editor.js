var appConfig = {};
var apiSchema = {};

var actionHistory = [];
var actionHistoryIndex = -1;
var isActionBeingWatched = false;
var isActionInterrupted = false;

var isDocumentReady = false;

var hoveredElement = null;
var selectedElement = null;

var elementUnderMouse = null;
var elementIndexUnderMouse = 0;
var isElementSelectedWithAltKey = false;
var isElementMoving = false;

var elementOnCopy = null;
var elementOnCut = null;
var elementSkeleton = null;
var elementToInsert = null;

var elementHover = null;
var elementParentHover = null;
var elementHighlight = null;
var elementParentHighlight = null;

var horizontalRulerLine = null;
var verticalRulerLine = null;

var mousePosition = { x: 0, y: 0, offsetX: 0, offsetY: 0 };

const camelToKebab = (camel) => {
    return camel.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

const generateUniqueId = (type = 'element') => {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < 10; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return `${type}-${result}`;
}

const debounce = (func, timeout = 1000 / 60 / 2) => {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => func.apply(this, args), timeout);
    };
}

const isElementTextable = (element) => {
    if (! element) {
        return false;
    }

    // Check if the element has no text node
    if (! Array.from(element.childNodes).some(
        child => child.nodeType === Node.TEXT_NODE && child.textContent.trim() !== ''
    )) {
        return false;
    }

    const tagName = element.tagName.toLowerCase();
    const tagSpecs = apiSchema.htmlElements?.find(htmlElement => htmlElement.tag === tagName);

    //
    if (
        tagName !== 'html' &&
        tagName !== 'body' &&
        ! tagSpecs?.categories.includes('void') &&
        ! tagSpecs?.categories.includes('embedded') &&
        ! element.classList.contains('uw-helper')
    ) {
        return true;
    }

    return false;
}

const isElementVoid = (element) => {
    if (! element) {
        return false;
    }

    // Check if the element is a text node
    if (element.nodeType === Node.TEXT_NODE) {
        return true;
    }

    const tagName = element.tagName.toLowerCase();
    const tagSpecs = apiSchema.htmlElements?.find(htmlElement => htmlElement.tag === tagName);

    if (tagSpecs?.categories.includes('void')) {
        return true;
    }

    return false;
}

const enableWhitespaceInsertionOnButton = (event) => {
    if (event.key === ' ') {
        event.preventDefault();

        // Add whitespace character at the caret position
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);
        const textNode = range.startContainer;
        const text = textNode.textContent;
        const startOffset = range.startOffset;
        const endOffset = range.endOffset;
        const newText = text.slice(0, startOffset) + '\u00A0' + text.slice(endOffset);
        textNode.textContent = newText;
        range.setStart(textNode, startOffset + 1);
        range.setEnd(textNode, startOffset + 1);
        selection.removeAllRanges();
        selection.addRange(range);
    }
}

const rememberAction = (name, previousState, upcomingState, objectReference = null) => {
    if (isActionBeingWatched) {
        return;
    }

    // TODO: Prevent the "same" action state from being pushed to the action history

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
        name,
        previous: previousState,
        upcoming: upcomingState,
        reference: objectReference,
    });

    // Update the action history index
    actionHistoryIndex = actionHistory.length - 1;

}

const undoAction = () => {
    if (actionHistoryIndex <= -1) {
        return; // do nothing
    }

    isActionBeingWatched = true;

    const actionState = actionHistory[actionHistoryIndex];

    switch (actionState.name) {
        // case 'element:select':
        //     // Find the element by the id
        //     const reselectedElement = document.querySelector(`[data-uw-id="${actionState.previous.id}"]`);

        //     // If the element is found
        //     if (reselectedElement) {
        //         // Update the current selection
        //         selectElement(reselectedElement);
        //     }

        //     break;

        case 'element:move':
            // Find the element by the id
            const movedElement = document.querySelector(`[data-uw-id="${actionState.previous.elementId}"]`);

            // If the element is found
            if (movedElement) {
                // Remove the moved element from the document
                movedElement.remove();

                // Move the element to the previous position
                const movedParentElement = document.querySelector(`[data-uw-id="${actionState.previous.containerId}"]`);
                movedParentElement.insertBefore(movedElement, movedParentElement.childNodes[actionState.previous.positionIndex]);

                // Refresh the hover element
                refreshElementHover();

                // Create the highlight element
                createElementHighlights();

                // Send the document tree to the parent window
                sendDocumentTree();

                // Send the selected element to the parent window
                sendSelectedElement();
            }

            break;

        case 'element:insert':
            // Retrieve the inserted element
            const insertedElement = document.querySelector(`[data-uw-id="${actionState.upcoming.elementId}"]`);

            // If the element is found
            if (insertedElement) {
                // Remove the inserted element from the document
                insertedElement.remove();
                selectedElement = null;

                // Refresh the hover element
                refreshElementHover();

                // Delete the highlight element
                deleteElementHighlights();

                // Send the document tree to the parent window
                sendDocumentTree();

                // Send the selected element to the parent window
                sendSelectedElement();
            }

            break;

        case 'element:delete':
            // Retrieve the deleted element
            const deletedElement = actionState.reference.cloneNode(true);
            const deletedParentElement = document.querySelector(`[data-uw-id="${actionState.previous.containerId}"]`);
            const deletedPositionIndex = actionState.previous.positionIndex;

            // If the element is found
            if (deletedElement && deletedParentElement) {
                // Insert the deleted element to the previous position
                deletedParentElement.insertBefore(deletedElement, deletedParentElement.childNodes[deletedPositionIndex]);

                //
                selectElement(deletedElement);

                // Refresh the hover element
                refreshElementHover();

                // Create the highlight element
                createElementHighlights();

                // Send the document tree to the parent window
                sendDocumentTree();

                // Send the selected element to the parent window
                sendSelectedElement();
            }

            break;

        case 'element:style':
            // Find the element by the id
            const styledElement = document.querySelector(`[data-uw-id="${actionState.previous.elementId}"]`);

            // If the element is found
            if (styledElement) {
                // Style the element with the previous property
                const styledElementProperties = JSON.parse(actionState.previous.propertyList || '{}');
                const styledElementPropertyChecked = styledElementProperties[actionState.previous.propertyName]?.checked;
                styleElement(styledElement, actionState.previous.propertyName, styledElementPropertyChecked ? actionState.previous.propertyValue : false);
                styledElement.dataset.uwProperties = actionState.previous.propertyList || '{}';

                // Refresh the hover element
                refreshElementHover();

                // Create the highlight element
                createElementHighlights();

                // Send the document tree to the parent window
                sendDocumentTree();

                // Send the selected element to the parent window
                sendSelectedElement();
            }

            break;
    }

    actionHistoryIndex -= 1;

    isActionBeingWatched = false;
}

const redoAction = () => {
    if (actionHistoryIndex >= actionHistory.length - 1) {
        return; // do nothing
    }

    isActionBeingWatched = true;

    actionHistoryIndex += 1;

    const actionState = actionHistory[actionHistoryIndex];

    switch (actionState.name) {
        // case 'element:select':
        //     // Find the element by the id
        //     const reselectedElement = document.querySelector(`[data-uw-id="${actionState.upcoming.id}"]`);

        //     // If the element is found
        //     if (reselectedElement) {
        //         // Update the current selection
        //         selectElement(reselectedElement);
        //     }

        //     break;

        case 'element:move':
            // Find the element by the id
            const movedElement = document.querySelector(`[data-uw-id="${actionState.upcoming.elementId}"]`);

            // If the element is found
            if (movedElement) {
                // Remove the moved element from the document
                movedElement.remove();

                // Move the element to the upcoming position
                const movedParentElement = document.querySelector(`[data-uw-id="${actionState.upcoming.containerId}"]`);
                movedParentElement.insertBefore(movedElement, movedParentElement.childNodes[actionState.upcoming.positionIndex]);

                // Refresh the hover element
                refreshElementHover();

                // Create the highlight element
                createElementHighlights();

                // Send the document tree to the parent window
                sendDocumentTree();

                // Send the selected element to the parent window
                sendSelectedElement();
            }

            break;

        case 'element:insert':
            // Retrieve the inserted element
            const insertedElement = actionState.reference.cloneNode(true);
            const insertedParentElement = document.querySelector(`[data-uw-id="${actionState.upcoming.containerId}"]`);
            const insertedPositionIndex = actionState.upcoming.positionIndex;

            // If the element is found
            if (insertedElement && insertedParentElement) {
                // Insert the inserted element to the upcoming position
                insertedParentElement.insertBefore(insertedElement, insertedParentElement.childNodes[insertedPositionIndex]);

                //
                selectElement(insertedElement);

                // Refresh the hover element
                refreshElementHover();

                // Create the highlight element
                createElementHighlights();

                // Send the document tree to the parent window
                sendDocumentTree();

                // Send the selected element to the parent window
                sendSelectedElement();
            }

            break;

        case 'element:delete':
            // Retrieve the deleted element
            const deletedElement = document.querySelector(`[data-uw-id="${actionState.previous.elementId}"]`);

            // If the element is found
            if (deletedElement) {
                // Remove the deleted element from the document
                deletedElement.remove();
                selectedElement = null;

                // Refresh the hover element
                refreshElementHover();

                // Delete the highlight element
                deleteElementHighlights();

                // Send the document tree to the parent window
                sendDocumentTree();

                // Send the selected element to the parent window
                sendSelectedElement();
            }

            break;

        case 'element:style':
            // Find the element by the id
            const styledElement = document.querySelector(`[data-uw-id="${actionState.upcoming.elementId}"]`);

            // If the element is found
            if (styledElement) {
                // Style the element with the upcoming property
                const styledElementProperties = JSON.parse(actionState.upcoming.propertyList || '{}');
                const styledElementPropertyChecked = styledElementProperties[actionState.upcoming.propertyName]?.checked;
                styleElement(styledElement, actionState.upcoming.propertyName, styledElementPropertyChecked ? actionState.upcoming.propertyValue : false);
                styledElement.dataset.uwProperties = actionState.upcoming.propertyList || '{}';

                // Refresh the hover element
                refreshElementHover();

                // Create the highlight element
                createElementHighlights();

                // Send the document tree to the parent window
                sendDocumentTree();

                // Send the selected element to the parent window
                sendSelectedElement();
            }

            break;
    }

    isActionBeingWatched = false;
}

const selectElement = (element) => {
    // If there is a current selection
    if (selectedElement) {
        // clear current text selection
        window.getSelection().removeAllRanges();

        // and if the element is not a container
        if (isElementTextable(selectedElement)) {
            // remove the contentEditable attribute
            // from the previously selected element
            makeElementNotEditable(selectedElement);
        }

        // and if the element inside a container
        if (! isElementVoid(selectedElement.parentElement)) {
            // remove drag event listeners
            // from the previously selected element
            makeElementNotDraggable(selectedElement);
        }

        // delete the highlight elements
        deleteElementHighlights();
    }

    // If the clicked element is HTML
    if (element.tagName.toLowerCase() === 'html') {
        // replace the element to body
        element = document.body;
    }

    // Save the current action state
    // const previousState = { id: selectedElement?.dataset.uwId };

    // Update the current selection
    // TODO: add support for multiple selection
    selectedElement = element;

    // Ceate the highlight elements
    createElementHighlights();

    // If the element inside a container
    if (! isElementVoid(element.parentElement)) {
        // make the clicked element draggable
        makeElementDraggable(element);
    }

    // Send the selected element to the parent window
    sendSelectedElement();

    // Hide the hover element
    hideElementHover();

    // Push to the action history (for proof of concept purposes only)
    // const upcomingState = { id: selectedElement.dataset.uwId };
    // pushActionHistory('element:select', previousState, upcomingState);
}

const copyElement = () => {
    if (selectedElement.tagName.toLowerCase() === 'body') {
        return; // do nothing
    }

    // Copy the selected element to the clipboard
    elementOnCopy = selectedElement.cloneNode(true);
}

const cutElement = () => {
    if (selectedElement.tagName.toLowerCase() === 'body') {
        return; // do nothing
    }

    // Cut the selected element to the clipboard
    elementOnCut = selectedElement;

    // Save the current action state
    const previousState = {
        elementId: selectedElement.dataset.uwId,
        containerId: selectedElement.parentElement.dataset.uwId,
        positionIndex: Array.prototype.indexOf.call(selectedElement.parentElement.childNodes, selectedElement),
    };
    const objectReference = selectedElement.cloneNode(true);

    // Remove the selected element from the document
    selectedElement.remove();
    selectedElement = null;

    // Push to the action history
    const upcomingState = {};
    rememberAction('element:delete', previousState, upcomingState, objectReference);

    // Delete the highlight elements
    deleteElementHighlights();

    // Send the document tree to the parent window
    sendDocumentTree();

    // Send the selected element to the parent window
    sendSelectedElement();

    // Refresh the hover element
    refreshElementHover();
}

const pasteElement = () => {
    if (
        ! selectedElement ||
        (! elementOnCut && ! elementOnCopy) ||
        selectedElement.tagName.toLowerCase() === 'body'
    ) {
        return; // do nothing
    }

    const mode = elementOnCut ? 'cut' : 'copy';
    const elementToPaste = elementOnCut || elementOnCopy;

    if (mode === 'copy') {
        // Generate a new id for the copied element
        elementToPaste.dataset.uwId = generateUniqueId(elementToPaste.dataset.uwId.split('-').slice(0, -1).join('-'));
        if (elementToPaste.id) {
            elementToPaste.id = generateUniqueId(elementToPaste.id.split('-').slice(0, -1).join('-'));
        }

        // Loop through the copied element children recursively
        elementToPaste.querySelectorAll('*[data-uw-id]').forEach(child => {
            // generate a new id for the copied element
            child.dataset.uwId = generateUniqueId(child.dataset.uwId.split('-').slice(0, -1).join('-'));
            if (child.id) {
                child.id = generateUniqueId(child.id.split('-').slice(0, -1).join('-'));
            }
        });
    }

    // Save the current action state
    const previousState = {};

    // Paste the copied element from the clipboard
    selectedElement.parentNode.insertBefore(elementToPaste, selectedElement.nextSibling);

    // Push to the action history
    const upcomingState = {
        elementId: elementToPaste.dataset.uwId,
        containerId: elementToPaste.parentElement.dataset.uwId,
        positionIndex: Array.prototype.indexOf.call(elementToPaste.parentElement.childNodes, elementToPaste),
    };
    const objectReference = elementToPaste.cloneNode(true);
    rememberAction('element:insert', previousState, upcomingState, objectReference);

    // Clear current text selection
    window.getSelection().removeAllRanges();

    // Remove the contentEditable attribute
    // from the previously selected element
    makeElementNotEditable(selectedElement);

    // Make the previously selected element not draggable
    makeElementNotDraggable(selectedElement);

    // Send the document tree to the parent window
    sendDocumentTree();

    // Update the current selection
    selectElement(elementToPaste);

    // Clear the cut element from the clipboard
    elementOnCut = null;

    // Re-copy the selected element to the clipboard
    copyElement();

    // Make the newly pasted element draggable
    makeElementDraggable(selectedElement);

    // Refresh the hover element
    refreshElementHover();
}

const deleteElement = () => {
    if (selectedElement.tagName.toLowerCase() === 'body') {
        return; // do nothing
    }

    // Delete the highlight elements
    deleteElementHighlights();

    //
    if (selectedElement === hoveredElement) {
        // hide the hover element
        hideElementHover();
    }

    // Save the current action state
    const previousState = {
        elementId: selectedElement.dataset.uwId,
        containerId: selectedElement.parentElement.dataset.uwId,
        positionIndex: Array.prototype.indexOf.call(selectedElement.parentElement.childNodes, selectedElement),
    };
    const objectReference = selectedElement.cloneNode(true);

    // Remove the selected element from the document
    selectedElement.remove();
    selectedElement = null;

    // Push to the action history
    const upcomingState = {};
    rememberAction('element:delete', previousState, upcomingState, objectReference);

    // Refresh the hover element
    refreshElementHover();

    // Send the document tree to the parent window
    sendDocumentTree();

    // Send the selected element to the parent window
    sendSelectedElement();
}

const insertElement = () => {
    if (! elementToInsert) {
        return; // do nothing
    }

    if (! elementSkeleton) {
        return; // do nothing
    }

    // Generate a new id for the copied element
    elementToInsert.dataset.uwId = generateUniqueId(
        elementToInsert.dataset.uwId
            ? elementToInsert.id.split('-').slice(0, -1).join('-')
            : elementToInsert.tagName.toLowerCase()
    );

    // Loop through the copied element children recursively
    elementToInsert.querySelectorAll('*[id]').forEach(child => {
        // generate a new id for the copied element
        child.dataset.uwId = generateUniqueId(
            child.dataset.uwId
                ? child.id.split('-').slice(0, -1).join('-')
                : child.tagName.toLowerCase()
        );
    });

    // Save the current action state
    const previousState = {};

    // Insert the template element before the skeleton element
    elementSkeleton.parentElement.insertBefore(elementToInsert, elementSkeleton);

    // Push to the action history
    const upcomingState = {
        elementId: elementToInsert.dataset.uwId,
        containerId: elementToInsert.parentElement.dataset.uwId,
        positionIndex: Array.prototype.indexOf.call(elementToInsert.parentElement.childNodes, elementToInsert),
    };
    const objectReference = elementToInsert.cloneNode(true);
    rememberAction('element:insert', previousState, upcomingState, objectReference);

    // Remove the skeleton element
    deleteElementSkeleton();

    // Make the newly pasted element draggable
    makeElementDraggable(elementToInsert);

    // Refresh the hover element
    refreshElementHover();

    // Send the document tree to the parent window
    sendDocumentTree();

    // Update the current selection
    selectElement(elementToInsert);

    // Clear the template element
    elementToInsert = null;
}

const moveElement = (event) => {
    // Find the element over the mouse
    hoveredElement = document.elementFromPoint(event.clientX, event.clientY);

    // If the element over the mouse is not the target element
    if (hoveredElement !== selectedElement) {
        // save the current action state
        const previousState = {
            elementId: selectedElement.dataset.uwId,
            containerId: selectedElement.parentElement.dataset.uwId,
            positionIndex: Array.prototype.indexOf.call(selectedElement.parentElement.childNodes, selectedElement),
        };

        // move the target element before the skeleton element
        elementSkeleton.parentElement.insertBefore(selectedElement, elementSkeleton);

        // push to the action history
        const upcomingState = {
            elementId: selectedElement.dataset.uwId,
            containerId: selectedElement.parentElement.dataset.uwId,
            positionIndex: Array.prototype.indexOf.call(selectedElement.parentElement.childNodes, selectedElement),
        };
        rememberAction('element:move', previousState, upcomingState);

        // send the document tree to the parent window
        sendDocumentTree();

        // wait for the element bounding rect to be updated
        window.setTimeout(() => {
            // then send the selected element to the parent window
            sendSelectedElement();
        }, 50);
    }
}

const moveElementToUpTree = () => {
    // If the selected element has previous sibling
    let previousSibling = selectedElement.previousSibling;

    // If the previous sibling is an empty text node
    if (
        previousSibling &&
        previousSibling.nodeType === Node.TEXT_NODE &&
        previousSibling.textContent.trim() === ''
    ) {
        // find the closest previous sibling
        while (
            previousSibling &&
            previousSibling.nodeType === Node.TEXT_NODE &&
            previousSibling.textContent.trim() === '' &&
            previousSibling.previousSibling
        ) {
            previousSibling = previousSibling.previousSibling;
        }
        if (
            previousSibling.nodeType === Node.TEXT_NODE &&
            previousSibling.textContent.trim() === ''
        ) {
            previousSibling = null;
        }
    }

    if (previousSibling) {
        // and if the previous sibling is a container
        if (! isElementVoid(previousSibling)) {
            // save the current action state
            const previousState = {
                elementId: selectedElement.dataset.uwId,
                containerId: selectedElement.parentElement.dataset.uwId,
                positionIndex: Array.prototype.indexOf.call(selectedElement.parentElement.childNodes, selectedElement),
            };

            // move the selected element to the bottom of the container
            previousSibling.appendChild(selectedElement);

            // push to the action history
            const upcomingState = {
                elementId: selectedElement.dataset.uwId,
                containerId: selectedElement.parentElement.dataset.uwId,
                positionIndex: Array.prototype.indexOf.call(selectedElement.parentElement.childNodes, selectedElement),
            };
            rememberAction('element:move', previousState, upcomingState);

            // refresh the hover element
            refreshElementHover();

            // refresh the highlight element
            refreshElementHighlight();

            // scroll the window to the selected element
            scrollToElement(selectedElement);

            // send the document tree to the parent window
            sendDocumentTree();

            // send the selected element to the parent window
            sendSelectedElement();

            return;
        }

        // save the current action state
        const previousState = {
            elementId: selectedElement.dataset.uwId,
            containerId: selectedElement.parentElement.dataset.uwId,
            positionIndex: Array.prototype.indexOf.call(selectedElement.parentElement.childNodes, selectedElement),
        };

        // move the selected element up the tree
        selectedElement.parentElement.insertBefore(selectedElement, previousSibling);

        // push to the action history
        const upcomingState = {
            elementId: selectedElement.dataset.uwId,
            containerId: selectedElement.parentElement.dataset.uwId,
            positionIndex: Array.prototype.indexOf.call(selectedElement.parentElement.childNodes, selectedElement),
        };
        rememberAction('element:move', previousState, upcomingState);

        // refresh the hover element
        refreshElementHover();

        // refresh the highlight element
        refreshElementHighlight();

        // scroll the window to the selected element
        scrollToElement(selectedElement);

        // send the document tree to the parent window
        sendDocumentTree();

        // send the selected element to the parent window
        sendSelectedElement();

        return;
    }

    // If the parent element is the body
    if (selectedElement.parentElement.tagName.toLowerCase() === 'body') {
        return; // do nothing
    }

    // If the parent element is inside a container
    if (selectedElement.parentElement.parentElement) {
        // save the current action state
        const previousState = {
            elementId: selectedElement.dataset.uwId,
            containerId: selectedElement.parentElement.dataset.uwId,
            positionIndex: Array.prototype.indexOf.call(selectedElement.parentElement.childNodes, selectedElement),
        };

        // move the selected element up the tree
        selectedElement.parentElement.parentElement.insertBefore(selectedElement, selectedElement.parentElement);

        // push to the action history
        const upcomingState = {
            elementId: selectedElement.dataset.uwId,
            containerId: selectedElement.parentElement.dataset.uwId,
            positionIndex: Array.prototype.indexOf.call(selectedElement.parentElement.childNodes, selectedElement),
        };
        rememberAction('element:move', previousState, upcomingState);

        // refresh the hover element
        refreshElementHover();

        // refresh the highlight element
        refreshElementHighlight();

        // send the document tree to the parent window
        sendDocumentTree();

        // send the selected element to the parent window
        sendSelectedElement();
    }

    // Scroll the window to the selected element
    scrollToElement(selectedElement);
}

const moveElementToDownTree = () => {
    // If the selected element has next sibling
    let nextSibling = selectedElement.nextSibling;

    // If the previous sibling is an empty text node
    if (
        nextSibling &&
        nextSibling.nodeType === Node.TEXT_NODE &&
        nextSibling.textContent.trim() === ''
    ) {
        // find the closest previous sibling
        while (
            nextSibling &&
            nextSibling.nodeType === Node.TEXT_NODE &&
            nextSibling.textContent.trim() === '' &&
            nextSibling.nextSibling
        ) {
            nextSibling = nextSibling.nextSibling;
        }
        if (
            nextSibling.nodeType === Node.TEXT_NODE &&
            nextSibling.textContent.trim() === ''
        ) {
            nextSibling = null;
        }
    }
    if (nextSibling) {
        // and if the next sibling is the helper/script element
        if (
            nextSibling.classList?.contains('uw-helper') ||
            nextSibling.tagName?.toLowerCase() === 'script'
        ) {
            return; // do nothing
        }

        // and if the next sibling is a container
        if (! isElementVoid(nextSibling)) {
            // save the current action state
            const previousState = {
                elementId: selectedElement.dataset.uwId,
                containerId: selectedElement.parentElement.dataset.uwId,
                positionIndex: Array.prototype.indexOf.call(selectedElement.parentElement.childNodes, selectedElement),
            };

            // move the selected element to the top of the container
            nextSibling.insertBefore(selectedElement, nextSibling.firstChild);

            // push to the action history
            const upcomingState = {
                elementId: selectedElement.dataset.uwId,
                containerId: selectedElement.parentElement.dataset.uwId,
                positionIndex: Array.prototype.indexOf.call(selectedElement.parentElement.childNodes, selectedElement),
            };
            rememberAction('element:move', previousState, upcomingState);

            // refresh the hover element
            refreshElementHover();

            // refresh the highlight element
            refreshElementHighlight();

            // scroll the window to the selected element
            scrollToElement(selectedElement);

            // send the document tree to the parent window
            sendDocumentTree();

            // send the selected element to the parent window
            sendSelectedElement();

            return;
        }

        // save the current action state
        const previousState = {
            elementId: selectedElement.dataset.uwId,
            containerId: selectedElement.parentElement.dataset.uwId,
            positionIndex: Array.prototype.indexOf.call(selectedElement.parentElement.childNodes, selectedElement),
        };

        // move the selected element down the tree
        selectedElement.parentElement.insertBefore(nextSibling, selectedElement);

        // push to the action history
        const upcomingState = {
            elementId: selectedElement.dataset.uwId,
            containerId: selectedElement.parentElement.dataset.uwId,
            positionIndex: Array.prototype.indexOf.call(selectedElement.parentElement.childNodes, selectedElement),
        };
        rememberAction('element:move', previousState, upcomingState);

        // refresh the hover element
        refreshElementHover();

        // refresh the highlight element
        refreshElementHighlight();

        // scroll the window to the selected element
        scrollToElement(selectedElement);

        // send the document tree to the parent window
        sendDocumentTree();

        // send the selected element to the parent window
        sendSelectedElement();

        return;
    }

    // If the parent element is the body
    if (selectedElement.parentElement.tagName.toLowerCase() === 'body') {
        return; // do nothing
    }

    // If the parent element is inside a container
    if (selectedElement.parentElement.parentElement) {
        // save the current action state
        const previousState = {
            elementId: selectedElement.dataset.uwId,
            containerId: selectedElement.parentElement.dataset.uwId,
            positionIndex: Array.prototype.indexOf.call(selectedElement.parentElement.childNodes, selectedElement),
        };

        // move the selected element down the tree
        selectedElement.parentElement.parentElement.insertBefore(selectedElement, selectedElement.parentElement.nextSibling);

        // push to the action history
        const upcomingState = {
            elementId: selectedElement.dataset.uwId,
            containerId: selectedElement.parentElement.dataset.uwId,
            positionIndex: Array.prototype.indexOf.call(selectedElement.parentElement.childNodes, selectedElement),
        };
        rememberAction('element:move', previousState, upcomingState);

        // refresh the hover element
        refreshElementHover();

        // refresh the highlight element
        refreshElementHighlight();

        // send the document tree to the parent window
        sendDocumentTree();

        // send the selected element to the parent window
        sendSelectedElement();
    }

    // Scroll the window to the selected element
    scrollToElement(selectedElement);
}

const attributeElement = (element, attributeName, attributeValue = null) => {
    if (attributeValue) {
        element.setAttribute(attributeName, attributeValue);
    } else {
        element.removeAttribute(attributeName);
    }
}

const styleElement = (element, propertyName, propertyValue = null) => {
    // FIXME: what if the document has no or more than one stylesheet?
    const stylesheet = document.styleSheets[0];
    const selector = `[data-uw-id="${element.dataset.uwId}"]`;
    let rules = [...stylesheet.cssRules].find(r => r.selectorText === selector);
    if (! rules) {
        stylesheet.insertRule(selector + "{}", stylesheet.cssRules.length);
        rules = [...stylesheet.cssRules].find(r => r.selectorText === selector);
    }
    if (propertyValue) {
        // TODO: do not use !important
        rules.style.setProperty(propertyName, propertyValue, 'important');
    } else {
        rules.style.removeProperty(propertyName);
    }
}

const scrollToElement = (element) => {
    // If it is not already visible on the viewport
    if (
        element.offsetTop < window.scrollY
        || element.offsetTop + element.offsetHeight > window.scrollY + window.innerHeight
    ) {
        // scroll the window to the selected element
        window.scrollTo({
            top: element.offsetTop - window.innerHeight / 2,
            behavior: 'smooth'
        });
    }
}

const makeElementDraggable = (element) => {
    element.draggable = true;

    element.addEventListener('dragstart', onElementDragStart);
    element.addEventListener('dragend', onElementDragEnd);
    element.addEventListener('dragover', onElementDragOver);
    element.addEventListener('drag', onElementDrag);
}

const makeElementNotDraggable = (element) => {
    element.draggable = false;

    element.removeEventListener('dragstart', onElementDragStart);
    element.removeEventListener('dragend', onElementDragEnd);
    element.removeEventListener('dragover', onElementDragOver);
    element.removeEventListener('drag', onElementDrag);
}

const makeElementEditable = (element) => {
    // If the element is not a text container
    if (! isElementTextable(element)) {
        return; // do nothing
    }

    // Make the element editable
    element.contentEditable = true;

    // If the element is a button
    if (element.tagName.toLowerCase() === 'button') {
        // enable whitespace insertion by manually handling the space key
        element.addEventListener('keydown', enableWhitespaceInsertionOnButton);
    }

    // Make the clicked element not draggable
    makeElementNotDraggable(element);

    if (element === selectedElement) {
        // Add a class to highlight the editable element
        elementHighlight?.classList.add('uw-element-highlight-editable');

        // Hide drag area points from the selected elements
        document.querySelectorAll('.uw-element-drag-area')?.forEach(element => {
            element.classList.add('uw-hidden');
        });
    }
}

const makeElementNotEditable = (element) => {
    // If the element is not a text container
    if (! isElementTextable(element)) {
        return; // do nothing
    }

    // Make the element not editable
    element.contentEditable = false;

    // If the element is a button
    if (element.tagName.toLowerCase() === 'button') {
        // remove the event listener to enable whitespace insertion
        element.removeEventListener('keydown', enableWhitespaceInsertionOnButton);
    }

    // Enable click event triggered by the space key for button only
    if (element.tagName.toLowerCase() === 'button') {
        element.removeEventListener('keyup', event => {
            if (event.key === ' ') {
                event.preventDefault();
            }
        });
    }

    if (element === selectedElement) {
        // Remove the class to highlight the editable element
        elementHighlight?.classList.remove('uw-element-highlight-editable');

        // Show back drag area points from the selected elements
        document.querySelectorAll('.uw-element-drag-area')?.forEach(element => {
            element.classList.remove('uw-hidden');
        });
    }
}

const refreshElementHover = (element = null) => {
    // If the hovered element is not defined
    if (! element) {
        // find the element over the mouse
        element = document.elementFromPoint(mousePosition.x, mousePosition.y);

        // and if the element over the mouse is null
        if (! element) {
            // hide the hover element
            hideElementHover();
            return;
        }
    }

    // If the element over the mouse is the helper element
    if (element.classList.contains('uw-helper')) {
        // hide the hover element
        hideElementHover();
        return;
    }

    // If the hovered element is HTML
    if (element.tagName.toLowerCase() === 'html') {
        // replace the element to body
        element = document.body;
    }

    // Update the hovered element
    hoveredElement = element;

    // If the element over the mouse is the selected element
    if (hoveredElement === selectedElement) {
        // hide the hover element
        hideElementHover();
        return;
    }

    // Create element hover if not exist
    if (! elementHover) {
        elementHover = document.createElement('div');
        elementHover.classList.add('uw-helper');
        elementHover.classList.add('uw-element-hover');
        document.body.appendChild(elementHover);
    }

    // Show the hover element
    // FIXME: since offsetWidth() sometimes return a wrong value for an auto-sized
    // element in Chromium, so we have to use getBoundingClientRect() instead.
    // See https://issues.chromium.org/issues/40332719 for more details
    const boundingRect = hoveredElement.getBoundingClientRect();
    elementHover.style.top = `${boundingRect.top + window.scrollY}px`;
    elementHover.style.left = `${boundingRect.left + window.scrollX}px`;
    elementHover.style.width = `${boundingRect.width}px`;
    elementHover.style.height = `${boundingRect.height}px`;
    elementHover.classList.remove('uw-hidden');

    if (! isElementVoid(hoveredElement)) {
        // Add a container class to the hover element
        elementHover.classList.add('uw-element-container-highlight');
    } else {
        // Remove a container class from the hover element
        elementHover.classList.remove('uw-element-container-highlight');
    }

    // Add a title to the hover element
    elementHover.dataset.title = hoveredElement.tagName.toLowerCase();
    elementHover.dataset.title += ` ${hoveredElement.id ? '#' + hoveredElement.id : hoveredElement.dataset.uwId ? '@' + hoveredElement.dataset.uwId : ''}`;

    // Send the hovered element to the parent window
    sendHoveredElement(hoveredElement);
}

const hideElementHover = () => {
    // Hide the hover element
    elementHover?.classList.add('uw-hidden');

    // Send the hovered element to the parent window
    sendHoveredElement(null);
}

const createElementHighlights = () => {
    if (! selectedElement) {
        return; // do nothing
    }

    // Sometimes when resizing the window,
    // the window:resize event is not triggered
    // so the highlight elements are not removed
    deleteElementHighlights();

    // Create a new element to highlight the selection
    elementHighlight = document.createElement('div');
    elementHighlight.classList.add('uw-helper');
    elementHighlight.classList.add('uw-element-highlight');

    // Add a container class to the element
    if (! isElementVoid(selectedElement)) {
        elementHighlight.classList.add('uw-element-container-highlight');
    }

    // Append the highlight element to the body
    document.body.appendChild(elementHighlight);

    // Create drag area points on each corner and center of the selected element
    for (let index = 0; index < 8; index++) {
        const dragAreaElement = document.createElement('div');
        dragAreaElement.classList.add('uw-helper');
        dragAreaElement.classList.add('uw-element-drag-area');
        document.body.appendChild(dragAreaElement);
    }

    // If the selected element has no parent
    if (! selectedElement.parentElement) {
        // refresh the highlight elements
        refreshElementHighlight();
        return;
    }

    // Create a new element to highlight the parent of the selection
    elementParentHighlight = document.createElement('div');
    elementParentHighlight.classList.add('uw-helper');
    elementParentHighlight.classList.add('uw-element-parent-highlight');

    // Append the highlight element to the body
    document.body.appendChild(elementParentHighlight);

    // Refresh the highlight elements
    refreshElementHighlight();
}

const deleteElementHighlights = () => {
    // Remove highlights from the selected elements
    document.querySelectorAll('.uw-element-highlight, .uw-element-parent-highlight, .uw-element-drag-area')?.forEach(element => {
        element.remove();
    });
    elementHighlight = null;
    elementParentHighlight = null;
}

const refreshElementHighlight = () => {
    if (elementHighlight) {
        // Update the position of the highlight element
        elementHighlight.style.top = `${selectedElement.offsetTop}px`;
        elementHighlight.style.left = `${selectedElement.offsetLeft}px`;
        elementHighlight.style.width = `${selectedElement.offsetWidth}px`;
        elementHighlight.style.height = `${selectedElement.offsetHeight}px`;

        // Add a title to the highlight element
        elementHighlight.dataset.title = selectedElement.tagName.toLowerCase();
        if (selectedElement.id) {
            elementHighlight.dataset.title += ` #${selectedElement.id}`;
        }

        // Update the position of the drag area points
        const boundingRect = selectedElement.getBoundingClientRect();
        const dragAreaPoints = document.querySelectorAll('.uw-element-drag-area');
        const dragAreaPointsPosition = [
            { x: boundingRect.left, y: boundingRect.top - 1, title: 'top-left', },
            { x: boundingRect.left + boundingRect.width / 2 - 1 / 2, y: boundingRect.top - 1, title: 'top-center', },
            { x: boundingRect.left + boundingRect.width - 2, y: boundingRect.top - 1, title: 'top-right', },
            { x: boundingRect.left, y: boundingRect.top + boundingRect.height / 2 - 1, title: 'middle-left', },
            { x: boundingRect.left + boundingRect.width - 2, y: boundingRect.top + boundingRect.height / 2 - 1, title: 'middle-right', },
            { x: boundingRect.left, y: boundingRect.top + boundingRect.height - 1, title: 'bottom-left', },
            { x: boundingRect.left + boundingRect.width / 2 - 1 / 2, y: boundingRect.top + boundingRect.height - 1, title: 'bottom-center', },
            { x: boundingRect.left + boundingRect.width - 2, y: boundingRect.top + boundingRect.height - 1, title: 'bottom-right', },
        ]
        dragAreaPoints.forEach((dragAreaPoint, index) => {
            dragAreaPoint.style.top = `${dragAreaPointsPosition[index].y + window.scrollY - 3}px`;
            dragAreaPoint.style.left = `${dragAreaPointsPosition[index].x + window.scrollX - 3}px`;
            dragAreaPoint.dataset.title = dragAreaPointsPosition[index].title;

            // Set the cursor style for the drag area points
            switch (dragAreaPointsPosition[index].title) {
                case 'top-left':
                case 'bottom-right':
                    dragAreaPoint.style.cursor = 'nwse-resize';
                    break;
                case 'top-right':
                case 'bottom-left':
                    dragAreaPoint.style.cursor = 'nesw-resize';
                    break;
                case 'top-center':
                case 'bottom-center':
                    dragAreaPoint.style.cursor = 'ns-resize';
                    break;
                case 'middle-left':
                case 'middle-right':
                    dragAreaPoint.style.cursor = 'ew-resize';
                    break;
            }

            // Hide some drag area points if the selected element is too small
            if (selectedElement.offsetHeight < 10) {
                if (['top-left', 'top-right', 'bottom-left', 'bottom-right'].includes(dragAreaPointsPosition[index].title)) {
                    dragAreaPoint.style.display = 'none';
                }
            } else if (selectedElement.offsetHeight < 20) {
                if (['middle-left', 'middle-right'].includes(dragAreaPointsPosition[index].title)) {
                    dragAreaPoint.style.display = 'none';
                }
            }
            if (selectedElement.offsetWidth < 10) {
                if (['top-left', 'top-right', 'bottom-left', 'bottom-right'].includes(dragAreaPointsPosition[index].title)) {
                    dragAreaPoint.style.display = 'none';
                }
            } else if (selectedElement.offsetWidth < 20) {
                if (['top-center', 'bottom-center'].includes(dragAreaPointsPosition[index].title)) {
                    dragAreaPoint.style.display = 'none';
                }
            }

            if (isElementMoving) {
                dragAreaPoint.classList.add('uw-hidden');
            }
        });
    }

    if (elementParentHighlight) {
        // Update the position of the highlight element
        const boundingRect = selectedElement.parentElement.getBoundingClientRect();
        elementParentHighlight.style.top = `${boundingRect.top + window.scrollY}px`;
        elementParentHighlight.style.left = `${boundingRect.left + window.scrollX}px`;
        elementParentHighlight.style.width = `${boundingRect.width}px`;
        elementParentHighlight.style.height = `${boundingRect.height}px`;

        // Add a title to the highlight element
        const selectedElementParent = selectedElement.parentElement;
        elementParentHighlight.dataset.title = selectedElementParent.tagName.toLowerCase();
        if (selectedElementParent.id) {
            elementParentHighlight.dataset.title += ` #${selectedElementParent.id}`;
        }
    }
}

const createElementSkeleton = (element) => {
    // Create a skeleton element to visualize the element being moved
    elementSkeleton = element.cloneNode(true);
    elementSkeleton.style.position = 'relative';
    elementSkeleton.classList.add('uw-helper');
    element.parentElement.insertBefore(elementSkeleton, element.nextSibling);

    // Create a new element to highlight the skeleton element
    const elementSkeletonHighlight = document.createElement('div');
    elementSkeletonHighlight.style.position = 'absolute';
    elementSkeletonHighlight.style.top = 0;
    elementSkeletonHighlight.style.left = 0;
    elementSkeletonHighlight.style.bottom = 0;
    elementSkeletonHighlight.style.right = 0;
    elementSkeletonHighlight.classList.add('uw-helper');
    elementSkeletonHighlight.classList.add('uw-element-skeleton');
    elementSkeleton.appendChild(elementSkeletonHighlight);

    // If the element is a container
    if (! isElementVoid(elementSkeleton)) {
        // add a container class to the skeleton element
        elementSkeletonHighlight.classList.add('uw-element-container-highlight');
    }

    // Add a title to the highlight element
    elementSkeletonHighlight.dataset.title = elementSkeleton.tagName.toLowerCase();
    if (elementSkeleton.id) {
        elementSkeletonHighlight.dataset.title += ` #${elementSkeleton.id}`;
    }

    // Create a new element to highlight the parent of the selection
    const elementParent = element.parentElement;
    elementParentHover = document.createElement('div');
    elementParentHover.style.top = `${elementParent.offsetTop}px`;
    elementParentHover.style.left = `${elementParent.offsetLeft}px`;
    elementParentHover.style.width = `${elementParent.offsetWidth}px`;
    elementParentHover.style.height = `${elementParent.offsetHeight}px`;
    elementParentHover.classList.add('uw-helper');
    elementParentHover.classList.add('uw-element-parent-hover');
    document.body.appendChild(elementParentHover);

    // Add a title to the highlight element
    elementParentHover.dataset.title = elementParent.tagName.toLowerCase();
    if (elementParent.id) {
        elementParentHover.dataset.title += ` #${elementParent.id}`;
    }
}

const moveElementSkeleton = () => {
    // If the element over the mouse is the HTML
    if (hoveredElement.tagName.toLowerCase() === 'html') {
        // return; // do nothing
        hoveredElement = document.body;
    }

    // If the element over the mouse is not a container
    if (
        isElementVoid(hoveredElement) &&
        ! isElementVoid(hoveredElement.parentElement)
    ) {
        // find out the layout direction of the container
        const containerStyle = window.getComputedStyle(hoveredElement.parentElement);
        const containerLayoutDirection = containerStyle.flexDirection || container.gridAutoFlow || 'column';

        // and if the container layout direction is left-to-right
        if (containerLayoutDirection.startsWith('row')) {
            // and if the mouse position 1/3 of the width from the left of the element over the mouse
            if (mousePosition.offsetX < hoveredElement.offsetLeft + hoveredElement.offsetWidth / 3) {
                // move the skeleton element before the element over the mouse
                hoveredElement.parentElement.insertBefore(elementSkeleton, hoveredElement);
                return;
            }

            // and if the mouse position 1/3 of the width from the right of the element over the mouse
            if (mousePosition.offsetX > hoveredElement.offsetLeft + hoveredElement.offsetWidth * 2 / 3) {
                // move the skeleton element after the element over the mouse
                hoveredElement.parentElement.insertBefore(elementSkeleton, hoveredElement.nextSibling);
                return;
            }
        }

        // and if the container layout direction is top-to-bottom
        if (containerLayoutDirection.startsWith('column')) {
            // and if the mouse position 1/3 of the height from the top of the element over the mouse
            if (mousePosition.offsetY < hoveredElement.offsetTop + hoveredElement.offsetHeight / 3) {
                // move the skeleton element before the element over the mouse
                hoveredElement.parentElement.insertBefore(elementSkeleton, hoveredElement);
                return;
            }

            // and if the mouse position 1/3 of the height from the bottom of the element over the mouse
            if (mousePosition.offsetY > hoveredElement.offsetTop + hoveredElement.offsetHeight * 2 / 3) {
                // move the skeleton element after the element over the mouse
                hoveredElement.parentElement.insertBefore(elementSkeleton, hoveredElement.nextSibling);
                return;
            }
        }
    }

    // If the element over the mouse is a container
    if (! isElementVoid(hoveredElement)) {
        // and if the container inside another container
        if (hoveredElement.parentElement) {
            const containerStyle = window.getComputedStyle(hoveredElement.parentElement);
            const containerLayoutDirection = containerStyle.flexDirection || containerStyle.gridAutoFlow || 'column';

            // and if the container layout direction is left-to-right
            if (containerLayoutDirection.startsWith('row')) {
                // and if the mouse position 10px from the left of the element over the mouse
                // or maximum 1/3 of the left padding width from the left if the element has padding
                if (
                    mousePosition.offsetX < hoveredElement.offsetLeft + 10 ||
                    mousePosition.offsetX < hoveredElement.offsetLeft + parseInt(window.getComputedStyle(hoveredElement).paddingLeft) * 1 / 3
                ) {
                    // move the skeleton element outside before the container
                    hoveredElement.parentElement.insertBefore(elementSkeleton, hoveredElement);
                    return;
                }

                // and if the mouse position 10px from the right of the element over the mouse
                // or maximum 1/3 of the right padding width from the right if the element has padding
                if (
                    mousePosition.offsetX > hoveredElement.offsetLeft + hoveredElement.offsetWidth - 10 ||
                    mousePosition.offsetX > hoveredElement.offsetLeft + hoveredElement.offsetWidth - parseInt(window.getComputedStyle(hoveredElement).paddingRight) * 1 / 3
                ) {
                    // move the skeleton element outside after the container
                    hoveredElement.parentElement.insertBefore(elementSkeleton, hoveredElement.nextSibling);
                    return;
                }
            }

            // and if the container layout direction is top-to-bottom
            if (containerLayoutDirection.startsWith('column')) {
                // and if the mouse position 10px from the top of the element over the mouse
                // or maximum 1/3 of the top padding height from the top if the element has padding
                if (
                    mousePosition.offsetY < hoveredElement.offsetTop + 10 ||
                    mousePosition.offsetY < hoveredElement.offsetTop + parseInt(window.getComputedStyle(hoveredElement).paddingTop) * 1 / 3
                ) {
                    // move the skeleton element outside before the container
                    hoveredElement.parentElement.insertBefore(elementSkeleton, hoveredElement);
                    return;
                }

                // and if the mouse position 10px from the bottom of the element over the mouse
                // or maximum 1/3 of the bottom padding height from the bottom if the element has padding
                if (
                    mousePosition.offsetY > hoveredElement.offsetTop + hoveredElement.offsetHeight - 10 ||
                    mousePosition.offsetY > hoveredElement.offsetTop + hoveredElement.offsetHeight - parseInt(window.getComputedStyle(hoveredElement).paddingBottom) * 1 / 3
                ) {
                    // move the skeleton element outside after the container
                    hoveredElement.parentElement.insertBefore(elementSkeleton, hoveredElement.nextSibling);
                    return;
                }
            }
        }

        // and if the container has no child elements
        if (hoveredElement.children.length === 0) {
            // move the skeleton element to the container
            hoveredElement.appendChild(elementSkeleton);
            return;
        }

        // find out the layout direction of the container
        const containerStyle = window.getComputedStyle(hoveredElement);
        const containerLayoutDirection = containerStyle.flexDirection || containerStyle.gridAutoFlow || 'column';

        // and if the container layout direction is left-to-right
        if (containerLayoutDirection.startsWith('row')) {
            // find the center of the element positioned right before the mouse position
            let elementBeforeMouse = null;
            Array
                .from(hoveredElement.children)
                .filter(child =>
                    ! child.classList.contains('uw-hidden') &&
                    ! child.classList.contains('uw-helper') &&
                    child.tagName.toLowerCase() !== 'script'
                )
                .forEach(child => {
                    if (child.offsetLeft + child.offsetWidth / 2 < mousePosition.offsetX) {
                        elementBeforeMouse = child;
                    }
                });

            // and if the element before the mouse is not found
            if (! elementBeforeMouse) {
                // move the skeleton element to the container
                hoveredElement.insertBefore(elementSkeleton, hoveredElement.firstChild);
                return;
            }

            // move the skeleton element after the element before the mouse
            hoveredElement.insertBefore(elementSkeleton, elementBeforeMouse.nextSibling);
        }

        // and if the container layout direction is top-to-bottom
        if (containerLayoutDirection.startsWith('column')) {
            // find the center of the element positioned right before the mouse position
            let elementBeforeMouse = null;
            Array
                .from(hoveredElement.children)
                .filter(child =>
                    ! child.classList.contains('uw-hidden') &&
                    ! child.classList.contains('uw-helper') &&
                    child.tagName.toLowerCase() !== 'script'
                )
                .forEach(child => {
                    if (child.offsetTop + child.offsetHeight / 2 < mousePosition.offsetY) {
                        elementBeforeMouse = child;
                    }
                });

            // and if the element before the mouse is not found
            if (! elementBeforeMouse) {
                // move the skeleton element to the container
                hoveredElement.insertBefore(elementSkeleton, hoveredElement.firstChild);
                return;
            }

            // move the skeleton element after the element before the mouse
            hoveredElement.insertBefore(elementSkeleton, elementBeforeMouse.nextSibling);
        }
    }
}

const refreshSkeletonParentHoverElement = () => {
    // Find the parent of the skeleton element
    const skeletonParent = elementSkeleton.parentElement;

    // Create a new element to highlight the parent of the selection
    const boundingRect = skeletonParent.getBoundingClientRect();
    elementParentHover.style.top = `${boundingRect.top + window.scrollY}px`;
    elementParentHover.style.left = `${boundingRect.left + window.scrollX}px`;
    elementParentHover.style.width = `${boundingRect.width}px`;
    elementParentHover.style.height = `${boundingRect.height}px`;
}

const deleteElementSkeleton = () => {
    // Remove the skeleton element
    elementSkeleton?.remove();
    elementSkeleton = null;

    // Remove highlight from the parent of the selected elements
    elementParentHover?.remove();
    elementParentHover = null;
}

const createElementBoxModel = () => {
    if (! selectedElement) {
        return; // do nothing
    }

    const boundingRect = selectedElement.getBoundingClientRect();

    // Create helper elements positioned at the selected element
    // to visualize its top alignment on the body
    const alignmentTopElement = document.createElement('div');
    alignmentTopElement.style.top = `${boundingRect.top + window.scrollY}px`;
    alignmentTopElement.style.left = '0';
    alignmentTopElement.style.right = '0';
    alignmentTopElement.style.border = 'revert-layer';
    alignmentTopElement.classList.add('uw-helper');
    alignmentTopElement.classList.add('uw-element-alignment');
    alignmentTopElement.classList.add('uw-element-alignment-top');
    document.body.appendChild(alignmentTopElement);
    // and bottom alignment
    const alignmentBottomElement = document.createElement('div');
    alignmentBottomElement.style.top = `${boundingRect.height + boundingRect.top + window.scrollY - 1}px`;
    alignmentBottomElement.style.left = '0';
    alignmentBottomElement.style.right = '0';
    alignmentBottomElement.style.border = 'revert-layer';
    alignmentBottomElement.classList.add('uw-helper');
    alignmentBottomElement.classList.add('uw-element-alignment');
    alignmentBottomElement.classList.add('uw-element-alignment-bottom');
    document.body.appendChild(alignmentBottomElement);
    // and left alignment
    const alignmentLeftElement = document.createElement('div');
    alignmentLeftElement.style.top = '0';
    alignmentLeftElement.style.bottom = '0';
    alignmentLeftElement.style.left = `${boundingRect.left + window.scrollX}px`;
    alignmentLeftElement.style.border = 'revert-layer';
    alignmentLeftElement.classList.add('uw-helper');
    alignmentLeftElement.classList.add('uw-element-alignment');
    alignmentLeftElement.classList.add('uw-element-alignment-left');
    document.body.appendChild(alignmentLeftElement);
    // and right alignment
    const alignmentRightElement = document.createElement('div');
    alignmentRightElement.style.top = '0';
    alignmentRightElement.style.bottom = '0';
    alignmentRightElement.style.left = `${boundingRect.left + boundingRect.width + window.scrollX - 1}px`;
    alignmentRightElement.style.border = 'revert-layer';
    alignmentRightElement.classList.add('uw-helper');
    alignmentRightElement.classList.add('uw-element-alignment');
    alignmentRightElement.classList.add('uw-element-alignment-right');
    document.body.appendChild(alignmentRightElement);

    // Create a helper element positioned at the selected element
    // to visualize its paddings
    const paddings = {
        top: parseInt(window.getComputedStyle(selectedElement).paddingTop),
        right: parseInt(window.getComputedStyle(selectedElement).paddingRight),
        bottom: parseInt(window.getComputedStyle(selectedElement).paddingBottom),
        left: parseInt(window.getComputedStyle(selectedElement).paddingLeft),
    };
    const paddingsElement = document.createElement('div');
    paddingsElement.style.top = `${boundingRect.top + window.scrollY}px`;
    paddingsElement.style.left = `${boundingRect.left + window.scrollX}px`;
    paddingsElement.style.width = `${boundingRect.width}px`;
    paddingsElement.style.height = `${boundingRect.height}px`;
    paddingsElement.style.borderTop = `${paddings.top}px`;
    paddingsElement.style.borderRight = `${paddings.right}px`;
    paddingsElement.style.borderBottom = `${paddings.bottom}px`;
    paddingsElement.style.borderLeft = `${paddings.left}px`;
    paddingsElement.style.borderStyle = 'revert-layer';
    paddingsElement.style.borderColor = 'revert-layer';
    paddingsElement.classList.add('uw-helper');
    paddingsElement.classList.add('uw-element-paddings');
    document.body.appendChild(paddingsElement);
    // and margins
    const margins = {
        top: parseInt(window.getComputedStyle(selectedElement).marginTop),
        right: parseInt(window.getComputedStyle(selectedElement).marginRight),
        bottom: parseInt(window.getComputedStyle(selectedElement).marginBottom),
        left: parseInt(window.getComputedStyle(selectedElement).marginLeft),
    };
    if (
        margins.top !== 0 ||
        margins.right !== 0 ||
        margins.bottom !== 0 ||
        margins.left !== 0
    ) {
        // FIXME: handle the case when the element has a negative margin
        const marginsElement = document.createElement('div');
        marginsElement.style.top = `${boundingRect.top - margins.top + window.scrollY}px`;
        marginsElement.style.left = `${boundingRect.left - margins.left+ window.scrollX}px`;
        marginsElement.style.width = `${boundingRect.width + margins.left + margins.right}px`;
        marginsElement.style.height = `${boundingRect.height + margins.top + margins.bottom}px`;
        marginsElement.style.borderTop = `${margins.top}px`;
        marginsElement.style.borderRight = `${margins.right}px`;
        marginsElement.style.borderBottom = `${margins.bottom}px`;
        marginsElement.style.borderLeft = `${margins.left}px`;
        marginsElement.style.borderStyle = 'revert-layer';
        marginsElement.style.borderColor = 'revert-layer';
        marginsElement.classList.add('uw-helper');
        marginsElement.classList.add('uw-element-margins');
        document.body.appendChild(marginsElement);
    }
}

const removeElementBoxModel = () => {
    // Remove the box model helper elements
    document.querySelectorAll('.uw-element-margins, .uw-element-paddings, .uw-element-alignment')?.forEach(element => {
        element.remove();
    });
}

const createElementLayoutIdentifiers = () => {
    // Get the parent element of the selected element
    const parentElement = selectedElement.parentElement;

    // Loop through the parent element children
    let elementIndex = 0;
    Array.from(parentElement.children).forEach(child => {
        // If the child is positioned absolute or fixed
        if (
            window.getComputedStyle(child).position === 'absolute' ||
            window.getComputedStyle(child).position === 'fixed'
        ) {
            return; // skip the child
        }

        // Skip the unnecessary elements
        if (
            ['head', 'script'].includes(child.tagName.toLowerCase()) ||
            child.classList.contains('uw-helper')
        ) {
            return; // skip the child
        }

        // Create a helper element positioned at the child element
        const boundingRect = child.getBoundingClientRect();
        const identifierElement = document.createElement('div');
        identifierElement.style.top = `${boundingRect.top + window.scrollY}px`;
        identifierElement.style.left = `${boundingRect.left + window.scrollX}px`;
        identifierElement.style.width = `${boundingRect.width}px`;
        identifierElement.style.height = `${boundingRect.height}px`;
        identifierElement.dataset.title = child === selectedElement ? 'E' : `S${++elementIndex}`;
        identifierElement.classList.add('uw-helper');
        identifierElement.classList.add('uw-element-layout-identifier');
        document.body.appendChild(identifierElement);
    });

    // Loop through the selected element children
    elementIndex = 0;
    Array.from(selectedElement.children).forEach(grandChild => {
        // If the child is positioned absolute or fixed
        if (
            window.getComputedStyle(grandChild).position === 'absolute' ||
            window.getComputedStyle(grandChild).position === 'fixed'
        ) {
            return; // skip the child
        }

        // Skip the unnecessary elements
        if (
            ['head', 'script'].includes(grandChild.tagName.toLowerCase()) ||
            grandChild.classList.contains('uw-helper')
        ) {
            return; // skip the child
        }

        // Create a helper element positioned at the grandchild element
        const boundingRect = grandChild.getBoundingClientRect();
        const identifierElement = document.createElement('div');
        identifierElement.style.top = `${boundingRect.top + window.scrollY}px`;
        identifierElement.style.left = `${boundingRect.left + window.scrollX}px`;
        identifierElement.style.width = `${boundingRect.width}px`;
        identifierElement.style.height = `${boundingRect.height}px`;
        identifierElement.dataset.title = grandChild === selectedElement ? 'E' : `C${++elementIndex}`;
        identifierElement.classList.add('uw-helper');
        identifierElement.classList.add('uw-element-layout-identifier');
        document.body.appendChild(identifierElement);
    });
}

const removeElementLayoutIdentifiers = () => {
    // Remove the layout identifier helper elements
    document.querySelectorAll('.uw-element-layout-identifier')?.forEach(element => {
        element.remove();
    });
}

const refreshRulerLines = (x = null, y = null) => {
    if (x) {
        if (! verticalRulerLine) {
            verticalRulerLine = document.createElement('div');
            verticalRulerLine.style.top = '0';
            verticalRulerLine.style.bottom = '0';
            verticalRulerLine.style.width = '1px';
            verticalRulerLine.style.height = '100%';
            verticalRulerLine.classList.add('uw-helper');
            verticalRulerLine.classList.add('uw-ruler-line');
            document.body.appendChild(verticalRulerLine);
        }
        verticalRulerLine.style.left = `${x - 1}px`;
        verticalRulerLine.classList.remove('uw-hidden');
    }

    if (y) {
        if (! horizontalRulerLine) {
            horizontalRulerLine = document.createElement('div');
            horizontalRulerLine.style.left = '0';
            horizontalRulerLine.style.right = '0';
            horizontalRulerLine.style.height = '1px';
            horizontalRulerLine.style.width = '100%';
            horizontalRulerLine.classList.add('uw-helper');
            horizontalRulerLine.classList.add('uw-ruler-line');
            document.body.appendChild(horizontalRulerLine);
        }
        horizontalRulerLine.style.top = `${y - 1}px`;
        horizontalRulerLine.classList.remove('uw-hidden');
    }
}

const hideRulerLines = () => {
    horizontalRulerLine?.classList.add('uw-hidden');
    verticalRulerLine?.classList.add('uw-hidden');
};

const sendSelectedElement = () => {
    // If there is no selected element
    if (! selectedElement) {
        // send a null payload to the parent window
        window.parent.postMessage({
            type: 'element:select',
            payload: null,
        }, '*');
        return;
    }

    // Send the selected element to the parent window
    const layoutRelatedProperties = [
        'position',
        'display',
        'float',
        'columnCount',
        'columnFill',
        'columnSpan',
        'columns',
        'flex',
        'flexBasis',
        'flexDirection',
        'flexFlow',
        'flexGrow',
        'flexShrink',
        'flexWrap',
        'gridArea',
        'gridAutoColumns',
        'gridAutoFlow',
        'gridAutoRows',
        'gridColumn',
        'gridColumnEnd',
        'gridColumnStart',
        'gridRow',
        'gridRowEnd',
        'gridRowStart',
        'gridTemplate',
        'gridTemplateAreas',
        'gridTemplateColumns',
        'gridTemplateRows',
        'order',
        'alignItems',
        'alignContent',
        'alignSelf',
        'justifyContent',
        'justifyItems',
        'justifySelf',
        'placeContent',
        'placeItems',
        'placeSelf',
    ];
    window.parent.postMessage({
        type: 'element:select',
        payload: {
            tagName: selectedElement.tagName,
            id: selectedElement.dataset.uwId,
            elementId: selectedElement.id,
            classList: Array.from(selectedElement.classList).filter(className => ! className.startsWith('uw-')),
            innerHTML: selectedElement.innerHTML,
            innerText: selectedElement.innerText,
            outerHTML: selectedElement.outerHTML,
            style: selectedElement.style.cssText,
            computedStyle: Object.fromEntries(Object.entries(window.getComputedStyle(selectedElement)).filter(([key, _]) => isNaN(key))),
            boundingRect: selectedElement.getBoundingClientRect(),
            dataset: Object.assign({}, selectedElement.dataset),
            attributes: Array.from(selectedElement.attributes).map(attribute => ({ name: attribute.name, value: attribute.value })),
            children: Array.from(selectedElement.children).map(child => ({
                tagName: child.tagName,
                id: child.dataset.uwId,
                classList: Array.from(child.classList).filter(className => ! className.startsWith('uw-')),
                computedStyle: Object.fromEntries(Object.entries(window.getComputedStyle(child)).filter(([key, _]) => isNaN(key) && layoutRelatedProperties.some(prop => key === prop))),
            })),
            parent: {
                tagName: selectedElement.parentElement.tagName,
                id: selectedElement.parentElement.dataset.uwId,
                computedStyle: Object.fromEntries(Object.entries(window.getComputedStyle(selectedElement.parentElement)).filter(([key, _]) => isNaN(key) && layoutRelatedProperties.some(prop => key === prop))),
                children: Array.from(selectedElement.parentElement.children).map(child => ({
                    tagName: child.tagName,
                    id: child.dataset.uwId,
                    classList: Array.from(child.classList).filter(className => ! className.startsWith('uw-')),
                    computedStyle: Object.fromEntries(Object.entries(window.getComputedStyle(child)).filter(([key, _]) => isNaN(key) && layoutRelatedProperties.some(prop => key === prop))),
                })),
            },
        },
    }, '*');
}

const sendHoveredElement = (element = null) => {
    // Send the hovered element to the parent window
    window.parent.postMessage({
        type: 'element:hover',
        payload: {
            id: element?.dataset.uwId,
        },
    }, '*');
}

const sendDocumentTree = () => {
    // Read the document tree
    const readDocumentTree = (node) => {
        return {
            tagName: node.tagName,
            id: node.dataset.uwId,
            label: node.dataset.uwLabel,
            elementId: node.id,
            children: Array
                .from(node.children)
                .filter(child =>
                    ! child.classList.contains('uw-helper') &&
                    child.tagName.toLowerCase() !== 'script'
                )
                .map(child => readDocumentTree(child)),
        };
    };

    // Send the document tree to the parent window
    window.parent.postMessage({
        type: 'document:tree',
        payload: {
            tree: readDocumentTree(document.body),
        },
    }, '*');
}

const onElementDragStart = (event) => {
    event.stopImmediatePropagation();

    //
    event.dataTransfer.dropEffect = 'move';

    // Create a transparent canvas to set as drag image
    const transparentCanvas = document.createElement('canvas');
    event.dataTransfer.setDragImage(transparentCanvas, 0, 0);
    transparentCanvas.remove();

    // Check if the selected element is under the mouse
    const elements = document.elementsFromPoint(event.clientX, event.clientY).filter(element => ! element.classList.contains('uw-helper') && element.tagName.toLowerCase() !== 'html');
    if (elements.includes(selectedElement)) {
        return; // do nothing
    }

    isElementMoving = true;

    // Otherwise, select the element under the mouse
    selectElement(elementUnderMouse);
}

const onElementDragEnd = (event) => {
    event.preventDefault();

    isElementMoving = false;

    // If the element drag action is not interrupted
    if (event.dataTransfer.dropEffect !== 'none') {
        moveElement(event);
    }
    // Otherwise, set the interrupted flag
    else {
        isActionInterrupted = true;
    }

    // Show the target element
    event.target.classList.remove('uw-hidden');

    // Remove the skeleton element
    deleteElementSkeleton();

    // Create the highlight elements
    createElementHighlights();

    // Refresh the hover element
    refreshElementHover();
}

const onElementDragOver = (event) => {
    event.preventDefault();
}

const onElementDrag = (event) => {
    event.stopImmediatePropagation();

    // If the target element is not hidden
    if (! event.target.classList.contains('uw-hidden')) {
        // TODO: add support for dragging an element positioned absolute or fixed
        // create a skeleton element to visualize the element being moved
        createElementSkeleton(event.target);

        // hide the target element
        event.target.classList.add('uw-hidden')

        // delete the highlight elements
        deleteElementHighlights();

        // hide the hover element
        hideElementHover();
    }

    // // Check if the mouse has moved less than 5 pixels
    // // to prevent flickering when hovering over border elements
    // if (
    //     Math.abs(event.clientX - mousePosition.x) < 5 &&
    //     Math.abs(event.clientY - mousePosition.y) < 5
    // ) {
    //     return; // do nothing
    // }

    // Update the mouse position
    mousePosition.x = event.clientX;
    mousePosition.y = event.clientY;
    mousePosition.offsetX = event.clientX + window.scrollX;
    mousePosition.offsetY = event.clientY + window.scrollY;

    // Find the element over the mouse
    hoveredElement = document.elementFromPoint(event.clientX, event.clientY);

    // If the element over the mouse is null
    if (! hoveredElement) {
        return; // do nothing
    }

    // If the element over the mouse is a helper element
    if (hoveredElement.classList.contains('uw-helper')) {
        return; // do nothing
    }

    // Move the skeleton element relative to the element over the mouse
    moveElementSkeleton();

    // Refresh the skeleton parent hover element
    refreshSkeletonParentHoverElement();
}

// Handler for mouse events on the document
document.addEventListener('mousemove', (event) => {
    // If the document is not ready
    // FIXME: sometimes the document is not ready when the mouse move event is triggered
    if (! isDocumentReady) {
        return; // do nothing
    }

    // If the element over the mouse is not the target element
    if (hoveredElement !== event.target) {
        // update the mouse position
        mousePosition.x = event.clientX;
        mousePosition.y = event.clientY;
        mousePosition.offsetX = event.clientX + window.scrollX;
        mousePosition.offsetY = event.clientY + window.scrollY;

        // and if is not dragging
        if (! elementSkeleton) {
            // refresh the hover element
            refreshElementHover();
        }
    }
});
document.addEventListener('mousedown', (event) => {
    if (event.altKey) {
        return; // do nothing
    }
    if (elementUnderMouse) {
        makeElementNotDraggable(elementUnderMouse);
    }
    if (event.target.classList.contains('uw-helper')) {
        return; // do nothing
    }
    elementUnderMouse = event.target;
    makeElementDraggable(elementUnderMouse);
});
document.addEventListener('mouseup', (event) => {
    // If the event target of the mouseup event is not the same
    // as the event target of the mousedown event
    if (elementUnderMouse !== event.target) {
        return; // do nothing
    }

    // If the previous action was interrupted
    if (isActionInterrupted) {
        isActionInterrupted = false;
        return;
    }

    // If the clicked element is a helper element
    if (event.target.classList.contains('uw-helper')) {
        return; // do nothing
    }

    // If the current selection is editable
    if (
        selectedElement === event.target &&
        selectedElement.contentEditable === 'true'
    ) {
        return; // do nothing
    }

    let element = event.target;

    // If the alt key is being pressed
    if (event.altKey) {
        isElementSelectedWithAltKey = true;
        // get the elements under the mouse
        // TODO: sort the child elements so that the child elements appear before its parent element
        const elements = document.elementsFromPoint(event.clientX, event.clientY).filter(element => ! element.classList.contains('uw-helper') && element.tagName.toLowerCase() !== 'html');
        if (! elements.includes(selectedElement)) {
            elementIndexUnderMouse = 0;
        }
        element = elements[elementIndexUnderMouse];
        // if the selected element is the same as the element under the mouse
        // and there are more than one elements
        if (element === selectedElement && elements.length > 1) {
            // get the next element under the mouse
            if (event.shiftKey) {
                elementIndexUnderMouse -= 1;
                if (elementIndexUnderMouse < 0) {
                    elementIndexUnderMouse = elements.length - 1;
                }
            } else {
                elementIndexUnderMouse += 1;
                if (elementIndexUnderMouse >= elements.length) {
                    elementIndexUnderMouse = 0;
                }
            }
            // select the next element under the mouse
            element = elements[elementIndexUnderMouse];
        }
    }
    // Otherwise, reset the alt key flag
    else {
        isElementSelectedWithAltKey = false;
        elementIndexUnderMouse = 0;
    }

    // If double click is detected
    if (event.detail == 2) {
        // and if the clicked element is the current selection
        // and is not html/body and is not a container
        if (
            selectedElement === element &&
            selectedElement.tagName.toLowerCase() !== 'body' &&
            selectedElement.tagName.toLowerCase() !== 'html' &&
            isElementTextable(selectedElement)
        ) {
            // make the clicked element editable
            makeElementEditable(selectedElement);
            return;
        }
    }

    // Select the clicked element
    selectElement(element);
});

// Handler for mouse enter events
document.addEventListener('mouseenter', () => {
    // Refresh the hover element
    refreshElementHover();
});

// Handler for mouse leave events
document.addEventListener('mouseleave', () => {
    // Hide the hover element
    hideElementHover();
});

// Handler for key press events
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        if (selectedElement?.contentEditable === 'true') {
            // Make the selected element not editable
            makeElementNotEditable(selectedElement);

            // Refresh the element highlight
            refreshElementHighlight();

            // Refresh the hover element
            refreshElementHover();

            return;
        }
    }

    if (event.key === 'Delete') {
        if (
            selectedElement &&
            selectedElement.tagName !== 'HTML' &&
            selectedElement.tagName !== 'BODY'
        ) {
            // Delete the selected element
            deleteElement();
            return;
        }
    }

    if (event.key === 'c' && event.ctrlKey) {
        if (
            selectedElement &&
            selectedElement.tagName !== 'HTML' &&
            selectedElement.tagName !== 'BODY'
        ) {
            // Copy the selected element
            copyElement();
            return;
        }
    }

    if (event.key === 'x' && event.ctrlKey) {
        if (
            selectedElement &&
            selectedElement.tagName !== 'HTML' &&
            selectedElement.tagName !== 'BODY'
        ) {
            // Cut the selected element
            cutElement();
            return;
        }
    }

    if (event.key === 'v' && event.ctrlKey) {
        // If there is an element with contentEditable="true"
        if (
            selectedElement &&
            selectedElement.contentEditable === 'true'
        ) {
            return; // do not paste the copied element
        }

        // Paste the copied element
        pasteElement();

        return;
    }

    if (event.key === 'z' && event.ctrlKey) {
        // Undo the last action
        undoAction();
        return;
    }

    if (
        (event.key === 'y' && event.ctrlKey) ||
        (event.key === 'z' && event.ctrlKey && event.shiftKey)
    ) {
        // Redo the last action
        redoAction();
        return;
    }

    if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
        // If there is an element with contentEditable="true"
        if (selectedElement?.contentEditable === 'true') {
            return; // do not move the selected element
        }

        event.preventDefault();

        if (
            selectedElement &&
            selectedElement.tagName.toLowerCase() !== 'html' &&
            selectedElement.tagName.toLowerCase() !== 'body'
        ) {
            // Move the selected element up the tree
            moveElementToUpTree(selectedElement);

            // Refresh the element highlight
            refreshElementHighlight();

            return;
        }
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
        // If there is an element with contentEditable="true"
        if (selectedElement?.contentEditable === 'true') {
            return; // do not move the selected element
        }

        event.preventDefault();

        if (
            selectedElement &&
            selectedElement.tagName.toLowerCase() !== 'html' &&
            selectedElement.tagName.toLowerCase() !== 'body'
        ) {
            // Move the selected element down the tree
            moveElementToDownTree(selectedElement);

            // Refresh the element highlight
            refreshElementHighlight();

            return;
        }
    }
});
document.addEventListener('keyup', () => {
    if (selectedElement?.contentEditable === 'true') {
        // Refresh the element highlight
        refreshElementHighlight();

        // Refresh the hover element
        refreshElementHover();

        return;
    }
});

// To hide the not-allowed cursor while dragging
document.addEventListener('dragover', event => {
    event.preventDefault();
});
document.addEventListener('dragenter', event => {
    event.preventDefault();
});

// Handler for window scroll events
window.addEventListener('scroll', () => {
    refreshElementHighlight();
});

// Handler for mouse down event on the main window
window.addEventListener('mousedown', () => {
    // Send the mouse down event to the parent window
    window.parent.postMessage({
        type: 'canvas:focus',
        payload: {},
    }, '*');
}, { capture: true });

// Handler for document scroll events
document.addEventListener('scroll', () => {
    // Send the document scroll position to the parent window
    window.parent.postMessage({
        type: 'document:scroll',
        payload: {
            // scrollPosition: {
            //     x: window.scrollX,
            //     y: window.scrollY,
            // },
            selectedElement: {
                boundingRect: selectedElement?.getBoundingClientRect(),
            }
        },
    }, '*');
});

// Handler for receiving messages from the main window
window.addEventListener('message', event => {
    if (event.origin !== window.location.origin) {
        return; // do nothing
    }

    if (event.data.type === 'element:beforeinsert') {
        if (event.data.payload.hasOwnProperty('position')) {
            // Update the mouse position
            mousePosition.x = event.data.payload.position.x;
            mousePosition.y = event.data.payload.position.y;
            mousePosition.offsetX = event.data.payload.position.x + window.scrollX;
            mousePosition.offsetY = event.data.payload.position.y + window.scrollY;

            // Find the element over the mouse
            hoveredElement = document.elementFromPoint(mousePosition.x, mousePosition.y);

            // If the element over the mouse is null
            if (! hoveredElement) {
                return; // do nothing
            }

            // Refresh the skeleton parent hover element
            refreshSkeletonParentHoverElement();

            // If the element over the mouse is a helper element
            if (hoveredElement.classList.contains('uw-helper')) {
                return;
            }

            // Show the skeleton element
            elementSkeleton.classList.remove('uw-hidden');

            // Move the skeleton element relative to the element over the mouse
            moveElementSkeleton();
        }

        if (event.data.payload.hasOwnProperty('template')) {
            // When the user cancels the insertion by dropping the template element
            // outside the main canvas
            if (! event.data.payload.template) {
                // Remove the skeleton element
                deleteElementSkeleton();

                // Refresh the hover element
                refreshElementHover();

                // Create the highlight elements
                createElementHighlights();

                // Clear the template element
                elementToInsert = null;

                return;
            }

            // Convert the HTML code of the template to an element
            const parsedTemplate = new DOMParser().parseFromString(event.data.payload.template, 'text/xml').documentElement;
            elementToInsert = document.createElement(parsedTemplate.tagName);
            elementToInsert.innerHTML = parsedTemplate.innerHTML;
            elementToInsert.style.cssText = parsedTemplate.style?.cssText || '';
            elementToInsert.classList.add(...parsedTemplate.classList);

            // Add the template element to the body
            document.body.appendChild(elementToInsert);

            // Create a skeleton element to visualize the element being inserted
            createElementSkeleton(elementToInsert);

            // Hide the skeleton element
            elementSkeleton.classList.add('uw-hidden');

            // Delete the template element
            elementToInsert?.remove();

            // Delete the highlight elements
            deleteElementHighlights();
        }

        return;
    }

    if (event.data.type === 'element:insert') {
        // Insert the newly element
        insertElement();
    }

    if (event.data.type === 'element:copy') {
        // Find the element by id
        const element = document.querySelector(`[data-uw-id="${event.data.payload.id}"]`);

        // If the element is found
        if (element) {
            // copy the selected element
            copyElement();
        }
        return;
    }

    if (event.data.type === 'element:cut') {
        // Find the element by id
        const element = document.querySelector(`[data-uw-id="${event.data.payload.id}"]`);

        // If the element is found
        if (element) {
            // cut the selected element
            cutElement();
        }
        return;
    }

    if (event.data.type === 'element:paste') {
        // Find the element by id
        const element = document.querySelector(`[data-uw-id="${event.data.payload.id}"]`);

        // If the element is found
        if (element) {
            // paste after the selected element
            pasteElement();

            // force to hide the hover element
            hideElementHover();
        }
        return;
    }

    if (event.data.type === 'element:delete') {
        // Find the element by id
        const element = document.querySelector(`[data-uw-id="${event.data.payload.id}"]`);

        // If the element is found
        if (element) {
            // delete the selected element
            deleteElement();

            // force to hide the hover element
            hideElementHover();
        }
        return;
    }

    if (event.data.type === 'element:select') {
        // Find the element by id
        const element = document.querySelector(`[data-uw-id="${event.data.payload.id}"]`);

        // If the element is found
        if (element) {
            // select the element
            selectElement(element);

            // scroll the window to the selected element
            scrollToElement(element);
        }
    }

    if (event.data.type === 'element:hover') {
        // Find the element by id
        const element = document.querySelector(`[data-uw-id="${event.data.payload.id}"]`);

        // If the element is found
        if (element) {
            // if the element is not changed
            if (element === hoveredElement) {
                return; // do nothing
            }

            // refresh the hover element
            refreshElementHover(element);

            // scroll the window to the selected element
            scrollToElement(element);
        }
    }

    if (event.data.type === 'element:unhover') {
        // Hide the hover element
        hideElementHover();
    }

    if (event.data.type === 'element:attribute') {
        // Find the element by id
        const element = document.querySelector(`[data-uw-id="${event.data.payload.id}"]`);

        // If the element is found
        if (element) {
            const attribute = event.data.payload.attribute;
            const value = event.data.payload.value;

            const checked = event.data.payload.checked === 'true';
            const attributes = element.dataset.uwAttributes ? JSON.parse(element.dataset.uwAttributes) : {};

            // Save the current action state
            const previousState = {
                elementId: element.dataset.uwId,
                attributeName: attribute,
                attributeValue: attributes[attribute]?.value,
                attributeList: element.dataset.uwAttributes,
            };

            attributes[attribute] = { value, checked };
            element.dataset.uwAttributes = JSON.stringify(attributes);
            attributeElement(element, attribute, checked ? value : null);

            // Push to the action history
            const upcomingState = {
                elementId: element.dataset.uwId,
                attributeName: attribute,
                attributeValue: value,
                attributeList: element.dataset.uwAttributes,
            };
            rememberAction('element:attribute', previousState, upcomingState);

            // refresh the element highlight
            refreshElementHighlight();

            // send the selected element to the parent window
            sendSelectedElement();

            // send the document tree to the parent window
            sendDocumentTree();
        }
    }

    if (event.data.type === 'element:style') {
        // Find the element by id
        const element = document.querySelector(`[data-uw-id="${event.data.payload.id}"]`);

        // If the element is found
        if (element) {
            const property = event.data.payload.property;
            const value = event.data.payload.value;

            const isPropertyValid = ((property, value) => {
                const dummyElement = document.createElement('div');
                dummyElement.style[property] = value;
                return dummyElement.style[property] !== '';
            })(property, value);

            const checked = event.data.payload.checked === 'true';
            const properties = element.dataset.uwProperties ? JSON.parse(element.dataset.uwProperties) : {};

            // Save the current action state
            const previousState = {
                elementId: element.dataset.uwId,
                propertyName: property,
                propertyValue: properties[property]?.value,
                propertyList: element.dataset.uwProperties,
            };

            properties[property] = { value, checked };
            element.dataset.uwProperties = JSON.stringify(properties);
            if (isPropertyValid) {
                if (value === '[empty]') {
                    value = '';
                }
                styleElement(element, property, checked ? value : null);
            }

            // Push to the action history
            const upcomingState = {
                elementId: element.dataset.uwId,
                propertyName: property,
                propertyValue: value,
                propertyList: element.dataset.uwProperties,
            };
            rememberAction('element:style', previousState, upcomingState);

            // refresh the element highlight
            refreshElementHighlight();

            // send the selected element to the parent window
            sendSelectedElement();

            // send the document tree to the parent window
            sendDocumentTree();
        }
    }

    if (event.data.type === 'element:move-up-or-left') {
        // Find the element by id
        const element = document.querySelector(`[data-uw-id="${event.data.payload.id}"]`);

        // If the element is found
        if (element) {
            // move the selected element up/left the tree
            moveElementToUpTree(selectedElement);
        }
    }

    if (event.data.type === 'element:move-down-or-right') {
        // Find the element by id
        const element = document.querySelector(`[data-uw-id="${event.data.payload.id}"]`);

        // If the element is found
        if (element) {
            // move the selected element down/right the tree
            moveElementToDownTree(selectedElement);
        }
    }

    if (event.data.type === 'element:scroll-to') {
        // Find the element by id
        const element = document.querySelector(`[data-uw-id="${event.data.payload.id}"]`);

        // If the element is found
        if (element) {
            // scroll the window to the selected element
            scrollToElement(element);
        }
    }

    if (event.data.type === 'element:show-box-model') {
        // Scroll the window to the selected element
        scrollToElement(selectedElement);

        // Create the box model element
        createElementBoxModel();
    }

    if (event.data.type === 'element:hide-box-model') {
        // Hide the box model element
        removeElementBoxModel();
    }

    if (event.data.type === 'element:show-layout-identifiers') {
        // Scroll the window to the selected element
        scrollToElement(selectedElement);

        // Create the layout identifier elements
        createElementLayoutIdentifiers();
    }

    if (event.data.type === 'element:hide-layout-identifiers') {
        // Hide the layout identifier elements
        removeElementLayoutIdentifiers();
    }

    if (event.data.type === 'document:init') {
        // Update global variables
        // TODO: find a better way to interact with the API
        // without exposing the API index to the client
        appConfig = event.data.payload.appConfig;
        apiSchema = event.data.payload.apiSchema;

        const getAppliedStyles = (element) => {
            var cssStyleRules = Array.from(document.styleSheets)
                .slice(0, -1)
                .flatMap(styleSheet => Array.from(styleSheet.cssRules))
                .filter(cssRule => element.matches(cssRule.selectorText));
            var rules = [];
            if (cssStyleRules.length) {
                for (i = 0; i < cssStyleRules.length; i++) {
                    const cssStyleRule = cssStyleRules[i];
                    rules.push({
                        order: i,
                        selector: cssStyleRule.selectorText,
                        stylesheet: cssStyleRule.parentStyleSheet.href,
                        styles: Object.entries(cssStyleRule.style)
                            .filter(([key, value]) => value !== '' && isNaN(key))
                            .reduce((style, [key, value]) => {
                                style[camelToKebab(key)] = value;
                                return style;
                            }, {}),
                    })
                }
            }
            if (element.getAttribute('style')) {
                rules.push({
                    order: cssStyleRules.length,
                    selector: 'inline',
                    stylesheet: 'inline',
                    styles: element.getAttribute('style')
                        .trim()
                        .replace(/\n/g, '')
                        .replace(/\s+/g, ' ')
                        .split(';')
                        .filter(rule => rule.trim() !== '')
                        .reduce((style, rule) => {
                            const [property, value] = rule.split(':').map(s => s.trim());
                            style[camelToKebab(property)] = value;
                            return style;
                        }, {}),
                });
            }
            return rules;
        }

        document.querySelectorAll('*').forEach(element => {
            if (['html', 'head', 'meta', 'title', 'link', 'script'].includes(element.tagName.toLowerCase())) {
                return; // skip the element
            }

            // Populate the dataset attribute helper
            const attributes = {};
            Array.from(element.attributes).forEach(attribute => {
                if (attribute.name === 'style') {
                    return; // skip the style attribute
                }
                attributes[attribute.name] = {
                    value: attribute.value.trim().replace(/\s+/g, ' '),
                    checked: true,
                };
            });
            element.dataset.uwAttributes = JSON.stringify(attributes);

            // Set unique ID
            element.dataset.uwId = generateUniqueId(element.tagName.toLocaleLowerCase());
            element.dataset.uwLabel = apiSchema.htmlElements.find(htmlElement => htmlElement.tag === element.tagName.toLowerCase())?.name || 'Element';

            // Disable click events on hyperlink
            if (element.tagName.toLowerCase() === 'a') {
                element.setAttribute('onclick', 'return false;');
            }

            // Populate the dataset property helper
            const rules = getAppliedStyles(element);
            const properties = {};
            rules.forEach(rule => {
                Object.entries(rule.styles).forEach(([property, value]) => {
                    properties[property] = {
                        value: value,
                        checked: true,
                    };
                });
            });
            element.dataset.uwProperties = JSON.stringify(properties);

            // Migrate inline styles to stylesheet
            // TODO: add support for HTML marketing emails
            if (element.hasAttribute('style')) {
                element.removeAttribute('style');
            }
            rules.filter(rule => rule.selector === 'inline').forEach(rule => {
                Object.entries(rule.styles).forEach(([property, value]) => {
                    styleElement(element, property, value);
                });
            });
        });

        // Send the document tree to the parent window
        sendDocumentTree();

        // Update the document ready status
        isDocumentReady = true;
    }

    if (event.data.type === 'document:undo') {
        // Undo the last action
        undoAction();
    }

    if (event.data.type === 'document:redo') {
        // Redo the last action
        redoAction();
    }

    if (event.data.type === 'document:show-ruler-lines') {
        const x = event.data.payload.x;
        const y = event.data.payload.y;

        // Refresh the ruler lines
        refreshRulerLines(x, y);
    }

    if (event.data.type === 'document:hide-ruler-lines') {
        // Hide the ruler lines
        hideRulerLines();
    }

    if (event.data.type === 'window:resize') {
        // Remove the highlight elements
        deleteElementHighlights();

        // Send the selected element to the parent window
        // so that the parent window can update the navigation section
        sendSelectedElement();
    }

    if (event.data.type === 'window:afterresize') {
        // Re-create the element highlight
        createElementHighlights();
    }
});

//
document.addEventListener('DOMContentLoaded', () => {
    // Send the ready message to the parent window
    window.parent.postMessage({
        type: 'window:ready',
        payload: {},
    }, '*');
});
