var hoveredElement = null;
var selectedElement = null; // TODO: add support for multiple selection

var elementToPaste = null;
var elementSkeleton = null;

var elementHover = null;
var elementParentHover = null;
var elementHighlight = null;
var elementParentHighlight = null;

var mousePosition = { x: 0, y: 0, offsetX: 0, offsetY: 0, visible: true };

const generateUniqueId = (type = 'element') => {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < 10; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return `${type}-${result}`;
};

const debounce = (func, timeout = 1000 / 60 / 2) => {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => func.apply(this, args), timeout);
    };
};

const selectElement = (element) => {
    // If there is a current selection
    if (selectedElement) {
        // clear current text selection
        window.getSelection().removeAllRanges();

        // and if the element is not a container
        if (! selectedElement.classList.contains('container')) {
            // remove the contentEditable attribute
            // from the previously selected element
            makeElementNotEditable(selectedElement);
        }

        // and if the element inside a container
        if (selectedElement.parentElement?.classList.contains('container')) {
            // remove drag event listeners
            // from the previously selected element
            makeElementNotDraggable(selectedElement);
        }

        // remove selection class to the clicked elements
        deleteElementHighlights();
    }

    // If the clicked element is html
    if (element.tagName === 'HTML') {
        // change the element to body
        element = document.body;
    }

    // Update the current selection
    selectedElement = element;

    // Add selection class to the clicked element
    createElementHighlights();

    // If the element inside a container
    if (
        element.parentElement?.classList.contains('container') &&
        // TODO: add support for absolute and fixed position
        element.style.position !== 'absolute' &&
        element.style.position !== 'fixed'
    ) {
        // make the clicked element draggable
        makeElementDraggable(element);
    }

    // Send the selected element to the parent window
    sendSelectedElement();

    // Hide the hover element
    hideElementHover();
};

const copyElement = () => {
    if (selectedElement.tagName === 'BODY') {
        return; // do nothing
    }

    // Copy the selected element to the clipboard
    elementToPaste = selectedElement.cloneNode(true);
}

const pasteElement = () => {
    if (selectedElement.tagName === 'BODY') {
        return; // do nothing
    }

    // Generate a new id for the copied element
    elementToPaste.id = generateUniqueId(elementToPaste.id.split('-').slice(0, -1).join('-'));

    // Loop through the copied element children recursively
    elementToPaste.querySelectorAll('*[id]').forEach(child => {
        // generate a new id for the copied element
        child.id = generateUniqueId(child.id.split('-').slice(0, -1).join('-'));
    });

    // Paste the copied element from the clipboard
    selectedElement.parentNode.insertBefore(elementToPaste, selectedElement.nextSibling);

    // Clear current text selection
    window.getSelection().removeAllRanges();

    // Remove the contentEditable attribute
    // from the previously selected element
    makeElementNotEditable(selectedElement);

    // Make the previously selected element not draggable
    makeElementNotDraggable(selectedElement);

    // Remove selection class to the clicked elements
    deleteElementHighlights();

    // Update the current selection
    selectElement(elementToPaste);

    // Make the newly pasted element draggable
    makeElementDraggable(selectedElement);

    // Refresh the hover element
    refreshElementHover();

    // Copy the selected element to the clipboard
    copyElement();

    // Send the document tree to the parent window
    sendDocumentTree();
}

const deleteElement = () => {
    if (selectedElement.tagName === 'BODY') {
        return; // do nothing
    }

    // Remove selection class to the clicked elements
    deleteElementHighlights();

    //
    if (selectedElement === hoveredElement) {
        // hide the hover element
        hideElementHover();
    }

    // Remove the selected element
    selectedElement.remove();
    selectedElement = null;

    // Refresh the hover element
    refreshElementHover();

    // Send the document tree to the parent window
    sendDocumentTree();
}

const makeElementDraggable = (element) => {
    element.draggable = true;

    element.addEventListener('dragstart', onElementDragStart);
    element.addEventListener('dragend', onElementDragEnd);
    element.addEventListener('dragover', onElementDragOver);
    element.addEventListener('drag', onElementDrag);
}

const makeElementNotDraggable = (element) => {
    selectedElement.draggable = false;

    element.removeEventListener('dragstart', onElementDragStart);
    element.removeEventListener('dragend', onElementDragEnd);
    element.removeEventListener('dragover', onElementDragOver);
    element.removeEventListener('drag', onElementDrag);
}

const makeElementEditable = (element) => {
    // If the element is not a text container
    if (! element.classList.contains('editable')) {
        return; // do nothing
    }

    // Make the element editable
    element.contentEditable = true;

    // Make the clicked element not draggable
    makeElementNotDraggable(element);

    if (element === selectedElement) {
        // Add a class to highlight the editable element
        elementHighlight?.classList.add('uw-element-highlight-editable');
    }
}

const makeElementNotEditable = (element) => {
    // If the element is not a text container
    if (! element.classList.contains('editable')) {
        return; // do nothing
    }

    // Make the element not editable
    element.contentEditable = false;

    if (element === selectedElement) {
        // Remove the class to highlight the editable element
        elementHighlight?.classList.remove('uw-element-highlight-editable');
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

    // Update the hovered element
    hoveredElement = element;

    // If the element over the mouse is the selected element
    if (hoveredElement === selectedElement) {
        // hide the hover element
        hideElementHover();
        return;
    }

    // Create element hover is not exist
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
    elementHover.classList.remove('hidden');

    if (hoveredElement.classList.contains('container')) {
        // Add a container class to the hover element
        elementHover.classList.add('uw-element-container-highlight');
    } else {
        // Remove a container class from the hover element
        elementHover.classList.remove('uw-element-container-highlight');
    }

    // Add a title to the hover element
    elementHover.dataset.title = hoveredElement.tagName.toLowerCase();
    if (hoveredElement.id) {
        elementHover.dataset.title += ` #${hoveredElement.id}`;
    }

    // Send the hovered element to the parent window
    sendHoveredElement(hoveredElement);
}

const hideElementHover = () => {
    // Hide the hover element
    elementHover?.classList.add('hidden');

    // Send the hovered element to the parent window
    sendHoveredElement(null);
}

const createElementHighlights = () => {
    // Create a new element to highlight the selection
    const boundingRect = selectedElement.getBoundingClientRect();
    elementHighlight = document.createElement('div');
    elementHighlight.style.top = `${boundingRect.top + window.scrollY}px`;
    elementHighlight.style.left = `${boundingRect.left + window.scrollX}px`;
    elementHighlight.style.width = `${boundingRect.width}px`;
    elementHighlight.style.height = `${boundingRect.height}px`;
    elementHighlight.classList.add('uw-helper');
    elementHighlight.classList.add('uw-element-highlight');

    // Add a container class to the element
    if (selectedElement.classList.contains('container')) {
        elementHighlight.classList.add('uw-element-container-highlight');
    }

    // Add a title to the highlight element
    elementHighlight.dataset.title = selectedElement.tagName.toLowerCase();
    if (selectedElement.id) {
        elementHighlight.dataset.title += ` #${selectedElement.id}`;
    }

    // Append the highlight element to the body
    document.body.appendChild(elementHighlight);

    // If the selected element has no parent
    if (! selectedElement.parentElement) {
        return; // do nothing
    }

    // Create a new element to highlight the parent of the selection
    const selectedElementParent = selectedElement.parentElement;
    const parentBoundingRect = selectedElementParent.getBoundingClientRect();
    elementParentHighlight = document.createElement('div');
    elementParentHighlight.style.top = `${parentBoundingRect.top + window.scrollY}px`;
    elementParentHighlight.style.left = `${parentBoundingRect.left + window.scrollX}px`;
    elementParentHighlight.style.width = `${parentBoundingRect.width}px`;
    elementParentHighlight.style.height = `${parentBoundingRect.height}px`;
    elementParentHighlight.classList.add('uw-helper');
    elementParentHighlight.classList.add('uw-element-parent-highlight');

    // Add a title to the highlight element
    elementParentHighlight.dataset.title = selectedElementParent.tagName.toLowerCase();
    if (selectedElementParent.id) {
        elementParentHighlight.dataset.title += ` #${selectedElementParent.id}`;
    }

    // Append the highlight element to the body
    document.body.appendChild(elementParentHighlight);
};

const deleteElementHighlights = () => {
    // Remove highlight from the selected elements
    elementHighlight?.remove();
    elementHighlight = null;

    // Remove highlight from the parent of the selected elements
    elementParentHighlight?.remove();
    elementParentHighlight = null;
};

const refreshElementHighlight = () => {
    if (elementHighlight) {
        // Update the position of the highlight element
        elementHighlight.style.top = `${selectedElement.offsetTop}px`;
        elementHighlight.style.left = `${selectedElement.offsetLeft}px`;
        elementHighlight.style.width = `${selectedElement.offsetWidth}px`;
        elementHighlight.style.height = `${selectedElement.offsetHeight}px`;
    }

    if (elementParentHighlight) {
        // Update the position of the highlight element
        elementParentHighlight.style.top = `${selectedElement.parentElement.offsetTop}px`;
        elementParentHighlight.style.left = `${selectedElement.parentElement.offsetLeft}px`;
        elementParentHighlight.style.width = `${selectedElement.parentElement.offsetWidth}px`;
        elementParentHighlight.style.height = `${selectedElement.parentElement.offsetHeight}px`;
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
    if (elementSkeleton.classList.contains('container')) {
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
    // If the element over the mouse is not a container
    if (
        ! hoveredElement.classList.contains('container') &&
        hoveredElement.parentElement?.classList.contains('container')
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

    // If the element over the mouse is the container
    if (hoveredElement.classList.contains('container')) {
        // and if the container inside another container
        if (hoveredElement.parentElement?.classList.contains('container')) {
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
                    ! child.classList.contains('hidden') &&
                    ! child.classList.contains('uw-helper') &&
                    child.tagName !== 'SCRIPT'
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
                    ! child.classList.contains('hidden') &&
                    ! child.classList.contains('uw-helper') &&
                    child.tagName !== 'SCRIPT'
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

const moveElementToUpTree = (element) => {
    // If the element has previous sibling
    if (element.previousElementSibling) {
        // and if the previous sibling is a container
        if (element.previousElementSibling.classList.contains('container')) {
            // move the selected element to the bottom of the container
            element.previousElementSibling.appendChild(element);

            // refresh the hover element
            refreshElementHover();

            // refresh the highlight element
            refreshElementHighlight();

            // scroll the window to the selected element
            scrollToElement(element);

            // send the document tree to the parent window
            sendDocumentTree();

            return;
        }

        // move the selected element up the tree
        element.parentElement.insertBefore(element, element.previousElementSibling);

        // refresh the hover element
        refreshElementHover();

        // refresh the highlight element
        refreshElementHighlight();

        // scroll the window to the selected element
        scrollToElement(element);

        // send the document tree to the parent window
        sendDocumentTree();

        return;
    }

    // If the parent element is inside a container
    if (element.parentElement.parentElement?.classList.contains('container')) {
        // move the selected element up the tree
        element.parentElement.parentElement.insertBefore(element, element.parentElement);

        // refresh the hover element
        refreshElementHover();

        // refresh the highlight element
        refreshElementHighlight();

        // send the document tree to the parent window
        sendDocumentTree();
    }

    // Scroll the window to the selected element
    scrollToElement(element);
}

const moveElementToDownTree = (element) => {
    // If the element has next sibling
    if (element.nextElementSibling) {
        // and if the next sibling is the helper/script element
        if (
            element.nextElementSibling.classList.contains('uw-helper') ||
            element.nextElementSibling.tagName === 'SCRIPT'
        ) {
            return; // do nothing
        }

        // and if the next sibling is a container
        if (element.nextElementSibling.classList.contains('container')) {
            // move the selected element to the top of the container
            element.nextElementSibling.insertBefore(element, element.nextElementSibling.firstChild);

            // refresh the hover element
            refreshElementHover();

            // refresh the highlight element
            refreshElementHighlight();

            // scroll the window to the selected element
            scrollToElement(element);

            // send the document tree to the parent window
            sendDocumentTree();

            return;
        }

        // move the selected element down the tree
        element.parentElement.insertBefore(element.nextElementSibling, element);

        // refresh the hover element
        refreshElementHover();

        // refresh the highlight element
        refreshElementHighlight();

        // scroll the window to the selected element
        scrollToElement(element);

        // send the document tree to the parent window
        sendDocumentTree();

        return;
    }

    // If the parent element is inside a container
    if (element.parentElement.parentElement?.classList.contains('container')) {
        // move the selected element down the tree
        element.parentElement.parentElement.insertBefore(element, element.parentElement.nextSibling);

        // refresh the hover element
        refreshElementHover();

        // refresh the highlight element
        refreshElementHighlight();

        // send the document tree to the parent window
        sendDocumentTree();
    }

    // Scroll the window to the selected element
    scrollToElement(element);
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

const sendSelectedElement = () => {
    // Send the selected element to the parent window
    window.parent.postMessage({
        type: 'element:select',
        payload: {
            tagName: selectedElement.tagName,
            id: selectedElement.id,
            classList: Array.from(selectedElement.classList).filter(className => ! className.startsWith('uw-')),
            innerHTML: selectedElement.innerHTML,
            innerText: selectedElement.innerText,
            outerHTML: selectedElement.outerHTML,
            style: selectedElement.style.cssText,
            boundingRect: selectedElement.getBoundingClientRect(),
            paddings: {
                top: parseInt(window.getComputedStyle(selectedElement).paddingTop),
                right: parseInt(window.getComputedStyle(selectedElement).paddingRight),
                bottom: parseInt(window.getComputedStyle(selectedElement).paddingBottom),
                left: parseInt(window.getComputedStyle(selectedElement).paddingLeft),
            },
            margins: {
                top: parseInt(window.getComputedStyle(selectedElement).marginTop),
                right: parseInt(window.getComputedStyle(selectedElement).marginRight),
                bottom: parseInt(window.getComputedStyle(selectedElement).marginBottom),
                left: parseInt(window.getComputedStyle(selectedElement).marginLeft),
            },
            dataset: Object.assign({}, selectedElement.dataset),
        },
    }, '*');
}

const sendHoveredElement = (element = null) => {
    // Send the hovered element to the parent window
    window.parent.postMessage({
        type: 'element:hover',
        payload: {
            id: element?.id,
        },
    }, '*');
}

const sendDocumentTree = () => {
    // Read the document tree
    const readDocumentTree = (node) => {
        return {
            tagName: node.tagName,
            id: node.id,
            label: node.dataset.label || null,
            children: Array
                .from(node.children)
                .filter(child =>
                    ! child.classList.contains('uw-helper') &&
                    child.tagName !== 'SCRIPT'
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
}

const onElementDragEnd = (event) => {
    event.preventDefault();

    // Find the element over the mouse
    hoveredElement = document.elementFromPoint(event.clientX, event.clientY);

    // If the element over the mouse is not the target element
    if (hoveredElement !== event.target) {
        // move the target element before the skeleton element
        elementSkeleton.parentElement.insertBefore(event.target, elementSkeleton);

        // send the document tree to the parent window
        sendDocumentTree();
    }

    // Show the target element
    event.target.classList.remove('hidden');

    // Remove the skeleton element
    deleteElementSkeleton();

    // Add selection class to the clicked element
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
    if (! event.target.classList.contains('hidden')) {
        // create a skeleton element to visualize the element being moved
        createElementSkeleton(event.target);

        // hide the target element
        event.target.classList.add('hidden')

        // remove selection class to the clicked elements
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

    // If the element over the mouse is the skeleton element
    if (hoveredElement.classList.contains('uw-element-skeleton')) {
        return; // do nothing
    }

    // Move the skeleton element relative to the element over the mouse
    moveElementSkeleton();

    // Refresh the skeleton parent hover element
    refreshSkeletonParentHoverElement();
};

// Handler for mouse move events
document.addEventListener('mousemove', event => {
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

// Handler for click mouse events
document.addEventListener('mousedown', event => {
    // If the current selection is editable
    if (
        selectedElement === event.target &&
        selectedElement.contentEditable === 'true'
    ) {
        return; // do nothing
    }

    // If double click is detected
    if (event.detail == 2) {
        // and if the clicked element is the current selection
        // and is not html/body and is not a container
        if (
            selectedElement === event.target &&
            selectedElement.tagName !== 'HTML' &&
            selectedElement.tagName !== 'BODY' &&
            ! selectedElement.classList.contains('container')
        ) {
            // make the clicked element editable
            makeElementEditable(selectedElement);
            return;
        }
    }

    // Select the clicked element
    selectElement(event.target);
});

// Handler for mouse enter events
document.addEventListener('mouseenter', () => {
    // Update the mouse visibility
    mousePosition.visible = true;

    // Refresh the hover element
    refreshElementHover();
});

// Handler for mouse leave events
document.addEventListener('mouseleave', () => {
    // Update the mouse visibility
    mousePosition.visible = false;

    // Hide the hover element
    hideElementHover();
});

// Handler for key press events
document.addEventListener('keydown', event => {
    if (selectedElement?.contentEditable === 'true') {
        if (event.key === 'Escape') {
            // Make the selected element not editable
            makeElementNotEditable(selectedElement);
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

    if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
        // If there is an element with contentEditable="true"
        if (selectedElement?.contentEditable === 'true') {
            return; // do not move the selected element
        }

        event.preventDefault();

        if (
            selectedElement &&
            selectedElement.tagName !== 'HTML' &&
            selectedElement.tagName !== 'BODY'
        ) {
            // Move the selected element up the tree
            moveElementToUpTree(selectedElement);
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
            selectedElement.tagName !== 'HTML' &&
            selectedElement.tagName !== 'BODY'
        ) {
            // Move the selected element down the tree
            moveElementToDownTree(selectedElement);
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

document.addEventListener('DOMContentLoaded', () => {
    // Send the document tree to the parent window
    sendDocumentTree();
});

// Handler for receiving messages from the main window
window.addEventListener('message', event => {
    if (event.origin !== window.location.origin) {
        return; // do nothing
    }

    if (event.data.type === 'element:copy') {
        // Find the element by id
        const element = document.getElementById(event.data.payload.id);

        // If the element is found
        if (element) {
            // copy the selected element
            copyElement();
        }
        return;
    }

    if (event.data.type === 'element:paste') {
        // Find the element by id
        const element = document.getElementById(event.data.payload.id);

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
        const element = document.getElementById(event.data.payload.id);

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
        const element = document.getElementById(event.data.payload.id);

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
        const element = document.getElementById(event.data.payload.id);

        // If the element is found
        if (element) {
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
});