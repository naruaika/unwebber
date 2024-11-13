'use strict';

import {
    selectedNode,
    hasCutNode,
    nodeToPaste,
    setSelectedNode,
    setHoveredNode,
    setHasCutNode,
    setNodeToPaste,
    apiSchema,
    metadata,
    setMetadata,
} from '../globals.js';
import { setupDocument, styleElement } from '../helpers.js';

const mainFrame = document.getElementById('main-iframe');

const onElementSelect = (event) => {
    // Set the selected element to null if there is no event detail
    if (
        ! event?.detail.uwId &&
        ! event?.detail.uwPosition &&
        ! event?.detail.uwParentId
    ) {
        setSelectedNode(null);
        window.dispatchEvent(new CustomEvent('outline:refresh'));
        window.dispatchEvent(new CustomEvent('attribute:refresh'));
        window.dispatchEvent(new CustomEvent('canvas:refresh', { detail: { transform: true } }));
        return;
    }

    // Update the selected element
    const element = event.detail.uwId
        ? mainFrame.contentDocument.querySelector(`[data-uw-id="${event.detail.uwId}"]`)
        : mainFrame.contentDocument.querySelector(`[data-uw-id="${event.detail.uwParentId}"]`).childNodes[event.detail.uwPosition]
    setSelectedNode(element, event.detail.uwPosition, element.parentElement);

    //
    const elementId = event.detail.uwId || `${event.detail.uwParentId}[${event.detail.uwPosition}]`;
    console.log(`[Editor] Select element: @${elementId}`);

    // Request panel updates
    setTimeout(() => {
        window.dispatchEvent(new CustomEvent('outline:refresh'));
        window.dispatchEvent(new CustomEvent('attribute:refresh'));
        window.dispatchEvent(new CustomEvent('canvas:refresh'));
    }, 0);
}

const onElementHover = (event) => {
    // Set the hovered element to null if there is no event detail
    if (
        ! event?.detail.uwId &&
        ! event?.detail.uwPosition &&
        ! event?.detail.uwParentId
    ) {
        setHoveredNode(null);
        window.dispatchEvent(new CustomEvent('outline:hover'));
        window.dispatchEvent(new CustomEvent('canvas:refresh', { detail: { transform: true } }));
        return;
    }

    // Update the hovered element
    const element = event.detail.uwId
        ? mainFrame.contentDocument.querySelector(`[data-uw-id="${event.detail.uwId}"]`)
        : mainFrame.contentDocument.querySelector(`[data-uw-id="${event.detail.uwParentId}"]`).childNodes[event.detail.uwPosition]
    setHoveredNode(element, event.detail.uwPosition, element.parentElement);

    //
    const elementId = event.detail.uwId || `${event.detail.uwParentId}[${event.detail.uwPosition}]`;
    console.log(`[Editor] Hover element: @${elementId}`);

    // Request panel updates
    setTimeout(() => {
        window.dispatchEvent(new CustomEvent('outline:hover'));
        window.dispatchEvent(new CustomEvent('canvas:refresh'));
    }, 0);
}

const onElementCut = () => {
    // Skip if focusing on an input/textarea element or editing contenteditable
    if (
        ['input', 'textarea'].includes(document.activeElement.tagName?.toLowerCase()) ||
        document.activeElement.isContentEditable
    ) {
        return;
    }

    // Return if there is no selected element
    if (! selectedNode.node) {
        console.log('[Editor] Cannot cut element: no element selected');
        return;
    }

    // Prevent cutting the HTML, head, or body elements
    if (['html', 'head', 'body'].includes(selectedNode.node.tagName?.toLowerCase())) {
        console.log('[Editor] Cannot cut element: the element is not allowed to be cut');
        return;
    }

    // Save the current action state
    const previousState = {
        container: selectedNode.parent,
        position: selectedNode.position,
    };
    const actionContext = { element: selectedNode.node };

    // Remove the selected element from the document
    selectedNode.node.remove();

    // Set the element to paste and the cut element flag
    setHasCutNode(true);
    setNodeToPaste(
        selectedNode.node,
        selectedNode.position,
        selectedNode.parent,
    );

    // Clear the selected element
    onElementSelect({ detail: {} });

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
    const elementId = actionContext.element.dataset?.uwId || `${previousState.container.dataset.uwId}[${previousState.position}]`;
    console.log(`[Editor] Cut element: @${elementId}`);
}

const onElementCopy = () => {
    // Skip if focusing on an input/textarea element or editing contenteditable
    if (
        ['input', 'textarea'].includes(document.activeElement.tagName?.toLowerCase()) ||
        document.activeElement.isContentEditable
    ) {
        return;
    }

    // Return if there is no selected element
    if (! selectedNode.node) {
        console.log('[Editor] Cannot cut element: no element selected');
        return;
    }

    // Prevent copying the HTML, head, or body elements
    if (['html', 'head', 'body'].includes(selectedNode.node.tagName?.toLowerCase())) {
        console.log('[Editor] Cannot copy element: the element is not allowed to be copied');
        return;
    }

    // Set the element to paste
    setNodeToPaste(
        selectedNode.node,
        selectedNode.position,
        selectedNode.parent,
    );

    //
    const elementId = selectedNode.node.dataset?.uwId || `${selectedNode.parent.dataset.uwId}[${selectedNode.position}]`;
    console.log(`[Editor] Copy element: @${elementId}`);
}

const onElementPaste = () => {
    // Skip if focusing on an input/textarea element or editing contenteditable
    if (
        ['input', 'textarea'].includes(document.activeElement.tagName?.toLowerCase()) ||
        document.activeElement.isContentEditable
    ) {
        return;
    }

    // Return if there is no element-to-paste
    if (! nodeToPaste.node) {
        console.log('[Editor] Cannot paste element: no element to paste');
        return;
    }

    // Clone the element-to-paste if it is not a cut element
    if (! hasCutNode) {
        setNodeToPaste(
            nodeToPaste.node.cloneNode(true),
            nodeToPaste.position,
            nodeToPaste.parent,
        );
    }

    // Save the current action state
    const actionContext = { element: nodeToPaste.node };

    // Paste the element to the document if there is no selected element
    // or insert it relative to the selected element
    if (selectedNode.node) {
        // Insert the element after the selected element if they have the same tag name
        if (selectedNode.node?.tagName === nodeToPaste.node?.tagName) {
            selectedNode.parent.insertBefore(nodeToPaste.node, selectedNode.node.nextSibling);
        } else {
            // Append the element to the selected element if the selected element has child nodes
            // or insert it after the selected element
            if (selectedNode.node.hasChildNodes()) {
                // Insert the element after the selected element if the selected element only contains empty text
                // or append the element to the selected element
                if (
                    Array.from(selectedNode.node.childNodes).every(node => node.nodeType !== Node.ELEMENT_NODE) &&
                    nodeToPaste.node.nodeType === Node.ELEMENT_NODE
                ) {
                    selectedNode.parent.insertBefore(nodeToPaste.node, selectedNode.node.nextSibling);
                } else {
                    selectedNode.node.appendChild(nodeToPaste.node);
                }
            } else {
                // Insert the element after the selected element if the selected element is a void element
                // or append the element to the selected element
                if (apiSchema.htmlElements.find(element => element.tag === selectedNode.node.tagName.toLowerCase()).categories.includes('void')) {
                    selectedNode.parent.insertBefore(nodeToPaste.node, selectedNode.node.nextSibling);
                } else {
                    selectedNode.node.appendChild(nodeToPaste.node);
                }
            }
        }
    } else {
        mainFrame.contentDocument.body.appendChild(nodeToPaste.node);
    }

    // TODO: reposition the element-to-paste if it is a positioned element;
    // it should be repositioned if the cursor is within the main frame,
    // otherwise no change is needed

    // Save the upcoming action state
    const upcomingState = {
        container: nodeToPaste.node.parentElement,
        position: Array.prototype.indexOf.call(nodeToPaste.node.parentElement.childNodes, nodeToPaste.node),
    };

    if (nodeToPaste.node.dataset?.uwId) {
        // Cache the element-to-paste
        setupDocument(nodeToPaste.node, ! hasCutNode);

        // Flag the element-to-paste and its children as a new element
        nodeToPaste.node.dataset.uwNew = true;
        Array.from(nodeToPaste.node.querySelectorAll('[data-uw-id]')).forEach(element => {
            element.dataset.uwNew = true;
        });
    }

    // Clear the element-to-paste and the cut element flag
    if (hasCutNode) {
        setHasCutNode(false);
        if (nodeToPaste.node.dataset?.uwId) {
            nodeToPaste.node.removeAttribute('id');
        }
    }

    // Select the element-to-paste
    onElementSelect({ detail: {
        uwId: nodeToPaste.node.dataset?.uwId,
        uwPosition: Array.prototype.indexOf.call(nodeToPaste.node.parentElement.childNodes, nodeToPaste.node),
        uwParentId: nodeToPaste.node.parentElement.dataset.uwId,
    } });

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
    const elementId = actionContext.element.dataset?.uwId || `${upcomingState.container.dataset.uwId}[${upcomingState.position}]`;
    console.log(`[Editor] Paste element: @${elementId}`);
}

const onElementDelete = () => {
    // Skip if focusing on an input/textarea element or editing contenteditable
    if (
        ['input', 'textarea'].includes(document.activeElement.tagName.toLowerCase()) ||
        document.activeElement.isContentEditable
    ) {
        return;
    }

    // Return if there is no selected element
    if (! selectedNode.node) {
        console.log('[Editor] Cannot delete element: no element selected');
        return;
    }

    // Prevent deleting the HTML, head, or body elements
    if (['html', 'head', 'body'].includes(selectedNode.node.tagName?.toLowerCase())) {
        console.log('[Editor] Cannot delete element: the element is not allowed to be deleted');
        return;
    }

    const previousState = {
        container: selectedNode.parent,
        position: selectedNode.position,
    };
    const actionContext = { element: selectedNode.node };

    // Remove the selected element from the document
    selectedNode.node.remove();

    // Clear the selected element
    onElementSelect({ detail: {} });

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
    const elementId = actionContext.element.dataset?.uwId || `${previousState.container.dataset.uwId}[${previousState.position}]`;
    console.log(`[Editor] Delete element: @${elementId}`);
}

const onElementDuplicate = () => {
    // Skip if focusing on an input/textarea element or editing contenteditable
    if (
        ['input', 'textarea'].includes(document.activeElement.tagName.toLowerCase()) ||
        document.activeElement.isContentEditable
    ) {
        return;
    }

    // Return if there is no selected element
    if (! selectedNode.node) {
        console.log('[Editor] Cannot duplicate element: no element selected');
        return;
    }

    // Prevent duplicating the HTML, head, or body elements
    if (['html', 'head', 'body'].includes(selectedNode.node.tagName?.toLowerCase())) {
        console.log('[Editor] Cannot duplicate element: the element is not allowed to be duplicated');
        return;
    }

    // Duplicate the selected element
    const duplicatedElement = selectedNode.node.cloneNode(true);
    selectedNode.parent.insertBefore(duplicatedElement, selectedNode.node.nextSibling);

    if (duplicatedElement.dataset?.uwId) {
        // Cache the duplicated element
        setupDocument(duplicatedElement);

        // Flag the duplicated element and its children as a new element
        duplicatedElement.dataset.uwNew = true;
        Array.from(duplicatedElement.querySelectorAll('[data-uw-id]')).forEach(element => {
            element.dataset.uwNew = true;
        });
    }

    // Select the duplicated element
    onElementSelect({ detail: {
        uwId: duplicatedElement.dataset?.uwId,
        uwPosition: Array.prototype.indexOf.call(duplicatedElement.parentElement.childNodes, duplicatedElement),
        uwParentId: duplicatedElement.parentElement.dataset?.uwId,
    } });

    // Request to save the action
    const upcomingState = {
        container: selectedNode.parent,
        position: selectedNode.position,
    };
    const actionContext = { element: selectedNode.node };
    window.dispatchEvent(new CustomEvent('action:save', {
        detail: {
            title: 'element:duplicate',
            previous: {},
            upcoming: upcomingState,
            reference: actionContext,
        }
    }));

    //
    const elementId = actionContext.element.dataset?.uwId || `${upcomingState.container.dataset.uwId}[${upcomingState.position}]`;
    console.log(`[Editor] Duplicate element: @${elementId}`);
}

const onElementUnwrap = () => {
    // Skip if focusing on an input/textarea element or editing contenteditable
    if (
        ['input', 'textarea'].includes(document.activeElement.tagName?.toLowerCase()) ||
        document.activeElement.isContentEditable
    ) {
        return;
    }

    // Return if there is no selected element
    if (! selectedNode.node) {
        console.log('[Editor] Cannot unwrap element: no element selected');
        return;
    }

    // Prevent unwrapping the HTML, head, or body elements
    if (['html', 'head', 'body'].includes(selectedNode.node.tagName?.toLowerCase())) {
        console.log('[Editor] Cannot unwrap element: the element is not allowed to be unwrapped');
        return;
    }

    // Remove empty text nodes from the parent of the selected element
    Array.from(selectedNode.parent.childNodes).forEach(node => {
        if (node.nodeType !== Node.ELEMENT_NODE && node.textContent.trim() === '') {
            node.remove();
        }
    });

    // Save the current action state
    const parentElement = selectedNode.parent;
    const previousState = {
        parentContainer: parentElement.parentElement,
        container: parentElement,
        position: Array.prototype.indexOf.call(parentElement.parentElement.childNodes, parentElement),
    };
    const actionContext = { elements: Array.from(parentElement.childNodes) };

    // Unwrap the selected element and all of its siblings
    Array.from(parentElement.childNodes).forEach(node => {
        parentElement.parentElement.insertBefore(node, parentElement);
    });

    // Remove the parent element of the selected element
    parentElement.remove();

    // Select the unwrapped element
    onElementSelect({ detail: {
        uwId: selectedNode.node.dataset?.uwId,
        uwPosition: Array.prototype.indexOf.call(selectedNode.node.parentElement.childNodes, selectedNode.node),
        uwParentId: selectedNode.node.parentElement.dataset.uwId,
    } });

    // Request to save the action
    window.dispatchEvent(new CustomEvent('action:save', {
        detail: {
            title: 'element:unwrap',
            previous: previousState,
            upcoming: {},
            reference: actionContext,
        }
    }));

    //
    console.log(`[Editor] Unwrap element in: @${previousState.container.dataset.uwId}`);
}

const onElementMoveToTopTree = () => {
    // Skip if focusing on an input/textarea element or editing contenteditable
    if (
        ['input', 'textarea'].includes(document.activeElement.tagName?.toLowerCase()) ||
        document.activeElement.isContentEditable
    ) {
        return;
    }

    // Return if there is no selected element
    if (! selectedNode.node) {
        console.log('[Editor] Cannot move to top element: no element selected');
        return;
    }

    // Prevent moving to top the HTML, head, or body elements
    if (['html', 'head', 'body'].includes(selectedNode.node.tagName?.toLowerCase())) {
        console.log('[Editor] Cannot move to top element: the element is not allowed to be moved to top');
        return;
    }

    // Save the current action state
    const previousState = {
        container: selectedNode.parent,
        position: selectedNode.position,
    };

    // Skip empty text nodes and ignored elements
    let previousSibling = selectedNode.node.previousSibling;
    while (
        previousSibling &&
        (
            (
                previousSibling.nodeType !== Node.ELEMENT_NODE &&
                previousSibling.textContent.trim() === ''
            ) ||
            'uwIgnore' in (previousSibling.dataset || [])
        )
    ) {
        previousSibling = previousSibling.previousSibling;
    }
    if (! previousSibling) {
        console.log('[Editor] Cannot move to top element: the element is already at the top');
        return;
    }

    // Move to top the selected element
    selectedNode.parent.insertBefore(selectedNode.node, selectedNode.parent.firstChild);

    // Select the moved-to-top element
    setSelectedNode(
        selectedNode.node,
        Array.prototype.indexOf.call(selectedNode.node.parentElement.childNodes, selectedNode.node),
        selectedNode.parent,
    );

    // Request to save the action
    const upcomingState = {
        container: selectedNode.parent,
        position: selectedNode.position,
    };
    window.dispatchEvent(new CustomEvent('action:save', {
        detail: {
            title: 'element:move-to-top',
            previous: previousState,
            upcoming: upcomingState,
            reference: { element: selectedNode.node },
        }
    }));

    //
    const elementId = selectedNode.node.dataset?.uwId || `${previousState.container.dataset.uwId}[${previousState.position}]`;
    console.log(`[Editor] Move to top element: @${elementId}`);

    // Request panel updates
    setTimeout(() => window.dispatchEvent(new CustomEvent('canvas:refresh')), 0);
}

const onElementMoveUpTree = () => {
    // Skip if focusing on an input/textarea element or editing contenteditable
    if (
        ['input', 'textarea'].includes(document.activeElement.tagName?.toLowerCase()) ||
        document.activeElement.isContentEditable
    ) {
        return;
    }

    // Return if there is no selected element
    if (! selectedNode.node) {
        console.log('[Editor] Cannot move up element: no element selected');
        return;
    }

    // Prevent moving up the HTML, head, or body elements
    if (
        ['html', 'head', 'body'].includes(selectedNode.node.tagName?.toLowerCase()) ||
        (
            ! selectedNode.node.previousSibling ||
            (
                ! selectedNode.node.previousElementSibling &&
                (
                    selectedNode.node.previousSibling.nodeType !== Node.ELEMENT_NODE &&
                    selectedNode.node.previousSibling.textContent.trim() === ''
                )
            )
        )
    ) {
        console.log('[Editor] Cannot move up element: the element is not allowed to be moved up');
        return;
    }

    // Save the current action state
    const previousState = {
        container: selectedNode.parent,
        position: selectedNode.position,
    };

    // Skip empty text nodes and ignored elements
    let previousSibling = selectedNode.node.previousSibling;
    while (
        previousSibling &&
        (
            (
                previousSibling.nodeType !== Node.ELEMENT_NODE &&
                previousSibling.textContent.trim() === ''
            ) ||
            'uwIgnore' in (previousSibling.dataset || [])
        )
    ) {
        previousSibling = previousSibling.previousSibling;
    }
    if (! previousSibling) {
        console.log('[Editor] Cannot move up element: the element is already at the top');
        return;
    }

    // Move up the selected element
    selectedNode.parent.insertBefore(selectedNode.node, previousSibling);

    // Select the moved-up element
    setSelectedNode(
        selectedNode.node,
        Array.prototype.indexOf.call(selectedNode.node.parentElement.childNodes, selectedNode.node),
        selectedNode.parent,
    );

    // Request to save the action
    const upcomingState = {
        container: selectedNode.parent,
        position: selectedNode.position,
    };
    window.dispatchEvent(new CustomEvent('action:save', {
        detail: {
            title: 'element:move-up',
            previous: previousState,
            upcoming: upcomingState,
            reference: { element: selectedNode.node },
        }
    }));

    //
    const elementId = selectedNode.node.dataset?.uwId || `${previousState.container.dataset.uwId}[${previousState.position}]`;
    console.log(`[Editor] Move up element: @${elementId}`);

    setTimeout(() => window.dispatchEvent(new CustomEvent('canvas:refresh')), 0);
}

const onElementMoveDownTree = () => {
    // Skip if focusing on an input/textarea element or editing contenteditable
    if (
        ['input', 'textarea'].includes(document.activeElement.tagName?.toLowerCase()) ||
        document.activeElement.isContentEditable
    ) {
        return;
    }

    // Return if there is no selected element
    if (! selectedNode.node) {
        console.log('[Editor] Cannot move down element: no element selected');
        return;
    }

    // Prevent moving down the HTML, head, or body elements
    if (
        ['html', 'head', 'body'].includes(selectedNode.node.tagName?.toLowerCase()) ||
        (
            ! selectedNode.node.nextSibling ||
            (
                ! selectedNode.node.nextElementSibling &&
                (
                    selectedNode.node.nextSibling.nodeType !== Node.ELEMENT_NODE &&
                    selectedNode.node.nextSibling.textContent.trim() === ''
                )
            )
        )
    ) {
        console.log('[Editor] Cannot move down element: the element is not allowed to be moved down');
        return;
    }

    // Save the current action state
    const previousState = {
        container: selectedNode.parent,
        position: selectedNode.position,
    };

    // Skip empty text nodes and ignored elements
    let nextSibling = selectedNode.node.nextSibling;
    while (
        nextSibling &&
        (
            (
                nextSibling.nodeType !== Node.ELEMENT_NODE &&
                nextSibling.textContent.trim() === ''
            ) ||
            'uwIgnore' in nextSibling.dataset
        )
    ) {
        nextSibling = nextSibling.nextSibling;
    }
    if (! nextSibling) {
        console.log('[Editor] Cannot move down element: the element is already at the bottom');
        return;
    }

    // Move down the selected element
    selectedNode.parent.insertBefore(selectedNode.node, nextSibling.nextSibling);

    // Select the moved-down element
    setSelectedNode(
        selectedNode.node,
        Array.prototype.indexOf.call(selectedNode.node.parentElement.childNodes, selectedNode.node),
        selectedNode.parent,
    );

    // Request to save the action
    const upcomingState = {
        container: selectedNode.parent,
        position: selectedNode.position,
    };
    window.dispatchEvent(new CustomEvent('action:save', {
        detail: {
            title: 'element:move-down',
            previous: previousState,
            upcoming: upcomingState,
            reference: { element: selectedNode.node },
        }
    }));

    //
    const elementId = selectedNode.node.dataset?.uwId || `${previousState.container.dataset.uwId}[${previousState.position}]`;
    console.log(`[Editor] Move down element: @${elementId}`);

    setTimeout(() => window.dispatchEvent(new CustomEvent('canvas:refresh')), 0);
}

const onElementMoveToBottomTree = () => {
    // Skip if focusing on an input/textarea element or editing contenteditable
    if (
        ['input', 'textarea'].includes(document.activeElement.tagName?.toLowerCase()) ||
        document.activeElement.isContentEditable
    ) {
        return;
    }

    // Return if there is no selected element
    if (! selectedNode.node) {
        console.log('[Editor] Cannot move to bottom element: no element selected');
        return;
    }

    // Prevent moving to bottom the HTML, head, or body elements
    if (['html', 'head', 'body'].includes(selectedNode.node.tagName?.toLowerCase())) {
        console.log('[Editor] Cannot move to bottom element: the element is not allowed to be moved to bottom');
        return;
    }

    // Save the current action state
    const previousState = {
        container: selectedNode.parent,
        position: selectedNode.position,
    };

    // Skip empty text nodes and ignored elements
    let nextSibling = selectedNode.node.nextSibling;
    while (
        nextSibling &&
        (
            (
                nextSibling.nodeType !== Node.ELEMENT_NODE &&
                nextSibling.textContent.trim() === ''
            ) ||
            'uwIgnore' in nextSibling.dataset
        )
    ) {
        nextSibling = nextSibling.nextSibling;
    }
    if (! nextSibling) {
        console.log('[Editor] Cannot move to bottom element: the element is already at the bottom');
        return;
    }

    // Move to bottom the selected element
    selectedNode.parent.appendChild(selectedNode.node);

    // Select the moved-to-bottom element
    setSelectedNode(
        selectedNode.node,
        Array.prototype.indexOf.call(selectedNode.node.parentElement.childNodes, selectedNode.node),
        selectedNode.parent,
    );

    // Request to save the action
    const upcomingState = {
        container: selectedNode.parent,
        position: selectedNode.position,
    };
    window.dispatchEvent(new CustomEvent('action:save', {
        detail: {
            title: 'element:move-to-bottom',
            previous: previousState,
            upcoming: upcomingState,
            reference: { element: selectedNode.node },
        }
    }));

    //
    const elementId = selectedNode.node.dataset?.uwId || `${previousState.container.dataset.uwId}[${previousState.position}]`;
    console.log(`[Editor] Move to bottom element: @${elementId}`);

    setTimeout(() => window.dispatchEvent(new CustomEvent('canvas:refresh')), 0);
}

const onElementOutdentUp = () => {
    // Skip if focusing on an input/textarea element or editing contenteditable
    if (
        ['input', 'textarea'].includes(document.activeElement.tagName?.toLowerCase()) ||
        document.activeElement.isContentEditable
    ) {
        return;
    }

    // Return if there is no selected element
    if (! selectedNode.node) {
        console.log('[Editor] Cannot outdent up element: no element selected');
        return;
    }

    // Prevent outdenting up the HTML, head, body, meta, title, link, or base elements,
    // or the child of the head or body element
    if (
        ['html', 'head', 'body', 'meta', 'title', 'link', 'base'].includes(selectedNode.node.tagName?.toLowerCase()) ||
        ['head', 'body'].includes(selectedNode.parent.tagName.toLowerCase())
    ) {
        console.log('[Editor] Cannot outdent up element: the element is not allowed to be moved out up');
        return;
    }

    // Save the current action state
    const previousState = {
        container: selectedNode.parent,
        position: selectedNode.position,
    };

    // Move out up the selected element
    selectedNode.parent.parentElement.insertBefore(selectedNode.node, selectedNode.parent);

    // Select the moved-out-up element
    setSelectedNode(
        selectedNode.node,
        Array.prototype.indexOf.call(selectedNode.node.parentElement.childNodes, selectedNode.node),
        selectedNode.node.parentElement,
    );

    // Request to save the action
    const upcomingState = {
        container: selectedNode.parent,
        position: selectedNode.position,
    };
    const actionContext = { element: selectedNode.node };
    window.dispatchEvent(new CustomEvent('action:save', {
        detail: {
            title: 'element:outdent-up',
            previous: previousState,
            upcoming: upcomingState,
            reference: actionContext,
        }
    }));

    //
    const elementId = actionContext.element.dataset?.uwId || `${previousState.container.dataset.uwId}[${previousState.position}]`;
    console.log(`[Editor] Move out up element: @${elementId}`);

    setTimeout(() => window.dispatchEvent(new CustomEvent('canvas:refresh')), 0);
}

const onElementOutdentDown = () => {
    // Skip if focusing on an input/textarea element or editing contenteditable
    if (
        ['input', 'textarea'].includes(document.activeElement.tagName?.toLowerCase()) ||
        document.activeElement.isContentEditable
    ) {
        return;
    }

    // Return if there is no selected element
    if (! selectedNode.node) {
        console.log('[Editor] Cannot outdent down element: no element selected');
        return;
    }

    // Prevent outdenting down the HTML, head, body, meta, title, link, or base elements,
    // or the child of the head or body element
    if (
        ['html', 'head', 'body', 'meta', 'title', 'link', 'base'].includes(selectedNode.node.tagName?.toLowerCase()) ||
        ['head', 'body'].includes(selectedNode.parent.tagName.toLowerCase())
    ) {
        console.log('[Editor] Cannot outdent down element: the element is not allowed to be moved out down');
        return;
    }

    // Save the current action state
    const previousState = {
        container: selectedNode.parent,
        position: selectedNode.position,
    };

    // Move out down the selected element
    selectedNode.parent.parentElement.insertBefore(selectedNode.node, selectedNode.parent.nextSibling);

    // Select the moved-out-down element
    setSelectedNode(
        selectedNode.node,
        Array.prototype.indexOf.call(selectedNode.node.parentElement.childNodes, selectedNode.node),
        selectedNode.node.parentElement,
    );

    // Request to save the action
    const upcomingState = {
        container: selectedNode.parent,
        position: selectedNode.position,
    };
    const actionContext = { element: selectedNode.node };
    window.dispatchEvent(new CustomEvent('action:save', {
        detail: {
            title: 'element:outdent-up',
            previous: previousState,
            upcoming: upcomingState,
            reference: actionContext,
        }
    }));

    //
    const elementId = actionContext.element.dataset?.uwId || `${previousState.container.dataset.uwId}[${previousState.position}]`;
    console.log(`[Editor] Move out up element: @${elementId}`);

    setTimeout(() => window.dispatchEvent(new CustomEvent('canvas:refresh')), 0);
}

const onElementIndentUp = () => {
    // Skip if focusing on an input/textarea element or editing contenteditable
    if (
        ['input', 'textarea'].includes(document.activeElement.tagName?.toLowerCase()) ||
        document.activeElement.isContentEditable
    ) {
        return;
    }

    // Return if there is no selected element
    if (! selectedNode.node) {
        console.log('[Editor] Cannot indent up element: no element selected');
        return;
    }

    // Prevent indenting up the HTML, head, body, meta, title, link, or base elements
    // or when there is no previous element
    // or when the previous element is a void element
    if (
        ['html', 'head', 'body', 'meta', 'title', 'link', 'base'].includes(selectedNode.node.tagName) ||
        ! selectedNode.node.previousElementSibling ||
        (
            selectedNode.node.previousElementSibling &&
            apiSchema.htmlElements.find(element => element.tag === selectedNode.node.previousElementSibling.tagName.toLowerCase()).categories.includes('void')
        )
    ) {
        console.log('[Editor] Cannot indent up element: the element is not allowed to be indented up');
        return;
    }

    // Save the current action state
    const previousState = {
        container: selectedNode.parent,
        position: selectedNode.position,
    };

    // Indent up the selected element
    selectedNode.node.previousElementSibling.appendChild(selectedNode.node);

    // Select the indented-up element
    setSelectedNode(
        selectedNode.node,
        Array.prototype.indexOf.call(selectedNode.node.parentElement.childNodes, selectedNode.node),
        selectedNode.node.parentElement,
    );

    // Request to save the action
    const upcomingState = {
        container: selectedNode.parent,
        position: selectedNode.position,
    };
    const actionContext = { element: selectedNode.node };
    window.dispatchEvent(new CustomEvent('action:save', {
        detail: {
            title: 'element:indent-up',
            previous: previousState,
            upcoming: upcomingState,
            reference: actionContext,
        }
    }));

    //
    const elementId = actionContext.element.dataset.uwId || `${previousState.container.dataset.uwId}[${previousState.position}]`;
    console.log(`[Editor] Indent up element: @${elementId}`);

    setTimeout(() => window.dispatchEvent(new CustomEvent('canvas:refresh')), 0);
}

const onElementIndentDown = () => {
    // Skip if focusing on an input/textarea element or editing contenteditable
    if (
        ['input', 'textarea'].includes(document.activeElement.tagName?.toLowerCase()) ||
        document.activeElement.isContentEditable
    ) {
        return;
    }

    // Return if there is no selected element
    if (! selectedNode.node) {
        console.log('[Editor] Cannot indent down element: no element selected');
        return;
    }

    // Prevent indenting down the HTML, head, body, meta, title, link, or base elements
    // or when there is no next element
    // or when the next element is a void element
    if (
        ['html', 'head', 'body', 'meta', 'title', 'link', 'base'].includes(selectedNode.node.tagName) ||
        ! selectedNode.node.nextElementSibling ||
        (
            selectedNode.node.nextElementSibling &&
            apiSchema.htmlElements.find(element => element.tag === selectedNode.node.nextElementSibling.tagName.toLowerCase()).categories.includes('void')
        )
    ) {
        console.log('[Editor] Cannot indent down element: the element is not allowed to be indented down');
        return;
    }

    // Save the current action state
    const previousState = {
        container: selectedNode.parent,
        position: selectedNode.position,
    };

    // Indent down the selected element
    selectedNode.node.nextElementSibling.appendChild(selectedNode.node);

    // Select the indented-down element
    setSelectedNode(
        selectedNode.node,
        Array.prototype.indexOf.call(selectedNode.node.parentElement.childNodes, selectedNode.node),
        selectedNode.node.parentElement,
    );

    // Request to save the action
    const upcomingState = {
        container: selectedNode.parent,
        position: selectedNode.position,
    };
    const actionContext = { element: selectedNode.node };
    window.dispatchEvent(new CustomEvent('action:save', {
        detail: {
            title: 'element:indent-down',
            previous: previousState,
            upcoming: upcomingState,
            reference: actionContext,
        }
    }));

    //
    const elementId = actionContext.element.dataset.uwId || `${previousState.container.dataset.uwId}[${previousState.position}]`;
    console.log(`[Editor] Indent down element: @${elementId}`);

    setTimeout(() => window.dispatchEvent(new CustomEvent('canvas:refresh')), 0);
}

const onElementFlipHorizontal = () => {
    // Skip if focusing on an input/textarea element or editing contenteditable
    if (
        ['input', 'textarea'].includes(document.activeElement.tagName.toLowerCase()) ||
        document.activeElement.isContentEditable
    ) {
        return;
    }

    // Skip if there is no selected element
    if (! selectedNode.node) {
        console.log('[Editor] Cannot flip element: no element selected');
        return;
    }

    // Skip if the selected node is non-element node
    if (selectedNode.node.nodeType !== Node.ELEMENT_NODE) {
        console.log('[Editor] Cannot flip element: not an element node');
        return;
    }

    // Get the properties of the selected element
    const _metadata = metadata[selectedNode.node.dataset.uwId];
    const matrix = new DOMMatrix(_metadata.properties.transform?.value || 'matrix(1, 0, 0, 1, 0, 0)');

    // Save the current action state
    const previousState = {
        container: selectedNode.parent,
        style: { transform: matrix.toString() },
    };

    // Apply the transformation of the element by flipping horizontally
    matrix.a *= -1;
    matrix.c *= -1;
    matrix.e *= -1;
    styleElement(selectedNode.node, 'transform', matrix.toString(), true);

    // Save the property value
    _metadata.properties['transform'] = { value: matrix.toString(), checked: true };
    setMetadata(selectedNode.node.dataset.uwId, _metadata);

    // Request to save the action
    const upcomingState = {
        container: selectedNode.parent,
        style: { transform: matrix.toString() },
    };
    const actionContext = { element: selectedNode.node };
    window.dispatchEvent(new CustomEvent('action:save', {
        detail: {
            title: 'element:transform',
            previous: previousState,
            upcoming: upcomingState,
            reference: actionContext,
        }
    }));

    //
    const elementId = actionContext.element.dataset.uwId || `${previousState.container.dataset.uwId}[${previousState.position}]`;
    console.log(`[Editor] Flip horizontal element: @${elementId}`);

    // Request panel updates
    setTimeout(() => window.dispatchEvent(new CustomEvent('canvas:refresh', { detail: { transform: true } })), 0);
}

const onElementFlipVertical = () => {
    // Skip if focusing on an input/textarea element or editing contenteditable
    if (
        ['input', 'textarea'].includes(document.activeElement.tagName.toLowerCase()) ||
        document.activeElement.isContentEditable
    ) {
        return;
    }

    // Skip if there is no selected element
    if (! selectedNode.node) {
        console.log('[Editor] Cannot flip element: no element selected');
        return;
    }

    // Skip if the selected node is non-element node
    if (selectedNode.node.nodeType !== Node.ELEMENT_NODE) {
        console.log('[Editor] Cannot flip element: not an element node');
        return;
    }

    // Get the properties of the selected element
    const _metadata = metadata[selectedNode.node.dataset.uwId];
    const matrix = new DOMMatrix(_metadata.properties.transform?.value || 'matrix(1, 0, 0, 1, 0, 0)');

    // Save the current action state
    const previousState = {
        container: selectedNode.parent,
        style: { transform: matrix.toString() },
    };

    // Apply the transformation of the element by flipping vertically
    matrix.b *= -1;
    matrix.d *= -1;
    matrix.f *= -1;
    styleElement(selectedNode.node, 'transform', matrix.toString(), true);

    // Save the property value
    _metadata.properties['transform'] = { value: matrix.toString(), checked: true };
    setMetadata(selectedNode.node.dataset.uwId, _metadata);

    // Request to save the action
    const upcomingState = {
        container: selectedNode.parent,
        style: { transform: matrix.toString() },
    };
    const actionContext = { element: selectedNode.node };
    window.dispatchEvent(new CustomEvent('action:save', {
        detail: {
            title: 'element:transform',
            previous: previousState,
            upcoming: upcomingState,
            reference: actionContext,
        }
    }));

    //
    const elementId = actionContext.element.dataset.uwId || `${previousState.container.dataset.uwId}[${previousState.position}]`;
    console.log(`[Editor] Flip vertical element: @${elementId}`);

    // Request panel updates
    setTimeout(() => window.dispatchEvent(new CustomEvent('canvas:refresh', { detail: { transform: true } })), 0);
}

const onElementRotateLeft = () => {
    // Skip if focusing on an input/textarea element or editing contenteditable
    if (
        ['input', 'textarea'].includes(document.activeElement.tagName.toLowerCase()) ||
        document.activeElement.isContentEditable
    ) {
        return;
    }

    // Skip if there is no selected element
    if (! selectedNode.node) {
        console.log('[Editor] Cannot rotate element: no element selected');
        return;
    }

    // Skip if the selected node is non-element node
    if (selectedNode.node.nodeType !== Node.ELEMENT_NODE) {
        console.log('[Editor] Cannot rotate element: not an element node');
        return;
    }

    // Get the properties of the selected element
    const _metadata = metadata[selectedNode.node.dataset.uwId];
    const matrix = new DOMMatrix(_metadata.properties.transform?.value || 'matrix(1, 0, 0, 1, 0, 0)');

    // Save the current action state
    const previousState = {
        container: selectedNode.parent,
        style: { transform: matrix.toString() },
    };

    // Apply the transformation of the element
    const angle = -45 * Math.PI / 180;
    const sin = Math.sin(angle);
    const cos = Math.cos(angle);
    const a = matrix.a * cos - matrix.b * sin;
    const b = matrix.a * sin + matrix.b * cos;
    const c = matrix.c * cos - matrix.d * sin;
    const d = matrix.c * sin + matrix.d * cos;
    matrix.a = a;
    matrix.b = b;
    matrix.c = c;
    matrix.d = d;
    styleElement(selectedNode.node, 'transform', matrix.toString(), true);

    // Save the property value
    _metadata.properties['transform'] = { value: matrix.toString(), checked: true };
    setMetadata(selectedNode.node.dataset.uwId, _metadata);

    // Request to save the action
    const upcomingState = {
        container: selectedNode.parent,
        style: { transform: matrix.toString() },
    };
    const actionContext = { element: selectedNode.node };
    window.dispatchEvent(new CustomEvent('action:save', {
        detail: {
            title: 'element:transform',
            previous: previousState,
            upcoming: upcomingState,
            reference: actionContext,
        }
    }));

    //
    const elementId = actionContext.element.dataset.uwId || `${previousState.container.dataset.uwId}[${previousState.position}]`;
    console.log(`[Editor] Rotate left element: @${elementId}`);

    // Request panel updates
    setTimeout(() => window.dispatchEvent(new CustomEvent('canvas:refresh', { detail: { transform: true } })), 0);
}

const onElementRotateRight = () => {
    // Skip if focusing on an input/textarea element or editing contenteditable
    if (
        ['input', 'textarea'].includes(document.activeElement.tagName.toLowerCase()) ||
        document.activeElement.isContentEditable
    ) {
        return;
    }

    // Skip if there is no selected element
    if (! selectedNode.node) {
        console.log('[Editor] Cannot rotate element: no element selected');
        return;
    }

    // Skip if the selected node is non-element node
    if (selectedNode.node.nodeType !== Node.ELEMENT_NODE) {
        console.log('[Editor] Cannot rotate element: not an element node');
        return;
    }

    // Get the properties of the selected element
    const _metadata = metadata[selectedNode.node.dataset.uwId];
    const matrix = new DOMMatrix(_metadata.properties.transform?.value || 'matrix(1, 0, 0, 1, 0, 0)');

    // Save the current action state
    const previousState = {
        container: selectedNode.parent,
        style: { transform: matrix.toString() },
    };

    // Apply the transformation of the element
    const angle = 45 * Math.PI / 180;
    const sin = Math.sin(angle);
    const cos = Math.cos(angle);
    const a = matrix.a * cos - matrix.b * sin;
    const b = matrix.a * sin + matrix.b * cos;
    const c = matrix.c * cos - matrix.d * sin;
    const d = matrix.c * sin + matrix.d * cos;
    matrix.a = a;
    matrix.b = b;
    matrix.c = c;
    matrix.d = d;
    styleElement(selectedNode.node, 'transform', matrix.toString(), true);

    // Save the property value
    _metadata.properties['transform'] = { value: matrix.toString(), checked: true };
    setMetadata(selectedNode.node.dataset.uwId, _metadata);

    // Request to save the action
    const upcomingState = {
        container: selectedNode.parent,
        style: { transform: matrix.toString() },
    };
    const actionContext = { element: selectedNode.node };
    window.dispatchEvent(new CustomEvent('action:save', {
        detail: {
            title: 'element:transform',
            previous: previousState,
            upcoming: upcomingState,
            reference: actionContext,
        }
    }));

    //
    const elementId = actionContext.element.dataset.uwId || `${previousState.container.dataset.uwId}[${previousState.position}]`;
    console.log(`[Editor] Rotate right element: @${elementId}`);

    // Request panel updates
    setTimeout(() => window.dispatchEvent(new CustomEvent('canvas:refresh', { detail: { transform: true } })), 0);
}

const onElementTranslate = (event) => {
    // Skip if focusing on an input/textarea element or editing contenteditable
    if (
        ['input', 'textarea'].includes(document.activeElement.tagName.toLowerCase()) ||
        document.activeElement.isContentEditable
    ) {
        return;
    }

    // Skip if there is no selected element
    if (! selectedNode.node) {
        console.log('[Editor] Cannot translate element: no element selected');
        return;
    }

    // Skip if the selected node is non-element node
    if (selectedNode.node.nodeType !== Node.ELEMENT_NODE) {
        console.log('[Editor] Cannot translate element: not an element node');
        return;
    }

    // Get the properties of the selected element
    const _metadata = metadata[selectedNode.node.dataset.uwId];
    const matrix = new DOMMatrix(_metadata.properties.transform?.value || 'matrix(1, 0, 0, 1, 0, 0)');

    // Save the current action state
    const previousState = {
        container: selectedNode.parent,
        style: { transform: matrix.toString() },
    };

    // Apply the transformation of the element
    const distance = event.detail.withShiftKey ? 10 : 1;
    if (event.detail.direction.includes('up')) {
        matrix.f -= distance;
    }
    if (event.detail.direction.includes('down')) {
        matrix.f += distance;
    }
    if (event.detail.direction.includes('left')) {
        matrix.e -= distance;
    }
    if (event.detail.direction.includes('right')) {
        matrix.e += distance;
    }
    styleElement(selectedNode.node, 'transform', matrix.toString(), true);

    // Save the property value
    _metadata.properties['transform'] = { value: matrix.toString(), checked: true };
    setMetadata(selectedNode.node.dataset.uwId, _metadata);

    // Request to save the action
    const upcomingState = {
        container: selectedNode.parent,
        style: { transform: matrix.toString() },
    };
    const actionContext = { element: selectedNode.node };
    window.dispatchEvent(new CustomEvent('action:save', {
        detail: {
            title: 'element:transform',
            previous: previousState,
            upcoming: upcomingState,
            reference: actionContext,
            signature: event.detail.direction + distance,
        }
    }));

    //
    const elementId = actionContext.element.dataset.uwId || `${previousState.container.dataset.uwId}[${previousState.position}]`;
    console.log(`[Editor] Translate element: @${elementId}`);

    // Request panel updates
    setTimeout(() => window.dispatchEvent(new CustomEvent('canvas:refresh', { detail: { transform: true } })), 0);
}

(() => {
    // Register the window message event listener
    window.addEventListener('element:select', onElementSelect);
    window.addEventListener('element:hover', onElementHover);
    window.addEventListener('element:select-same-color', () => { /* TODO: implement this */ });
    window.addEventListener('element:select-same-bgcolor', () => { /* TODO: implement this */ });
    window.addEventListener('element:select-same-brcolor', () => { /* TODO: implement this */ });
    window.addEventListener('element:select-same-brstyle', () => { /* TODO: implement this */ });
    window.addEventListener('element:select-same-border', () => { /* TODO: implement this */ });
    window.addEventListener('element:select-same-olcolor', () => { /* TODO: implement this */ });
    window.addEventListener('element:select-same-olstyle', () => { /* TODO: implement this */ });
    window.addEventListener('element:select-same-outline', () => { /* TODO: implement this */ });
    window.addEventListener('element:select-same-elabel', () => { /* TODO: implement this */ });
    window.addEventListener('element:select-same-etag', () => { /* TODO: implement this */ });
    window.addEventListener('element:select-same-colortag', () => { /* TODO: implement this */ });
    window.addEventListener('element:cut', onElementCut);
    window.addEventListener('element:copy', onElementCopy);
    window.addEventListener('element:paste', onElementPaste);
    window.addEventListener('element:paste-text-content', () => { /* TODO: implement this */ });
    window.addEventListener('element:paste-inner-html', () => { /* TODO: implement this */ });
    window.addEventListener('element:paste-outer-html', () => { /* TODO: implement this */ });
    window.addEventListener('element:paste-style', () => { /* TODO: implement this */ });
    window.addEventListener('element:paste-size', () => { /* TODO: implement this */ });
    window.addEventListener('element:paste-width', () => { /* TODO: implement this */ });
    window.addEventListener('element:paste-height', () => { /* TODO: implement this */ });
    window.addEventListener('element:paste-size-separately', () => { /* TODO: implement this */ });
    window.addEventListener('element:paste-width-separately', () => { /* TODO: implement this */ });
    window.addEventListener('element:paste-height-separately', () => { /* TODO: implement this */ });
    window.addEventListener('element:paste-before', () => { /* TODO: implement this */ });
    window.addEventListener('element:paste-after', () => { /* TODO: implement this */ });
    window.addEventListener('element:paste-first-child', () => { /* TODO: implement this */ });
    window.addEventListener('element:paste-last-child', () => { /* TODO: implement this */ });
    window.addEventListener('element:delete', onElementDelete);
    window.addEventListener('element:duplicate', onElementDuplicate);
    window.addEventListener('element:create-clone', () => { /* TODO: implement this */ });
    window.addEventListener('element:unlink-clone', () => { /* TODO: implement this */ });
    window.addEventListener('element:select-original-clone', () => { /* TODO: implement this */ });
    window.addEventListener('element:wrap', () => { /* TODO: implement this */ });
    window.addEventListener('element:unwrap', onElementUnwrap);
    window.addEventListener('element:insert-before', () => { /* TODO: implement this */ });
    window.addEventListener('element:insert-after', () => { /* TODO: implement this */ });
    window.addEventListener('element:insert-first-child', () => { /* TODO: implement this */ });
    window.addEventListener('element:insert-last-child', () => { /* TODO: implement this */ });
    window.addEventListener('element:convert-to', () => { /* TODO: implement this */ });
    window.addEventListener('element:move-to-top-tree', onElementMoveToTopTree);
    window.addEventListener('element:move-up-tree', onElementMoveUpTree);
    window.addEventListener('element:move-down-tree', onElementMoveDownTree);
    window.addEventListener('element:move-to-bottom-tree', onElementMoveToBottomTree);
    window.addEventListener('element:outdent-up', onElementOutdentUp);
    window.addEventListener('element:outdent-down', onElementOutdentDown);
    window.addEventListener('element:indent-up', onElementIndentUp);
    window.addEventListener('element:indent-down', onElementIndentDown);
    window.addEventListener('element:align-left', () => { /* TODO: implement this */ });
    window.addEventListener('element:align-center', () => { /* TODO: implement this */ });
    window.addEventListener('element:align-right', () => { /* TODO: implement this */ });
    window.addEventListener('element:align-top', () => { /* TODO: implement this */ });
    window.addEventListener('element:align-middle', () => { /* TODO: implement this */ });
    window.addEventListener('element:align-bottom', () => { /* TODO: implement this */ });
    window.addEventListener('element:flip-horizontal', onElementFlipHorizontal);
    window.addEventListener('element:flip-vertical', onElementFlipVertical);
    window.addEventListener('element:rotate-left', onElementRotateLeft);
    window.addEventListener('element:rotate-right', onElementRotateRight);
    window.addEventListener('element:translate', onElementTranslate);
})()