'use strict';

import {
    selectedNode,
    hoveredNode,
    setHoveredNode,
} from '../globals.js';
import { hexToRgba } from '../helpers.js';

const rootContainer = document.querySelector('.main-canvas__container');
const topRuler = rootContainer.querySelector('.top-ruler');
const leftRuler = rootContainer.querySelector('.left-ruler');
const canvasContainer = rootContainer.querySelector('.main-container');
const canvasOverlay = rootContainer.querySelector('.main-canvas__overlay');
const mainFrame = rootContainer.querySelector('.main-iframe');

let documentComputedStyle = getComputedStyle(document.documentElement);
let mainFrameBoundingRect = null;

const defaultBreakpoints = {
    desktop: 1200,
    tablet: 810,
    mobile: 390,
};

const rulerHeight = 20;
const scrollFactor = 0.25;
const zoomFactor = 0.0005;
const rotateFactor = 15;

let currentScale = 1;
let currentRotate = 0;
let currentTranslateX = 0;
let currentTranslateY = 0;

let selectedBox = null;
let hoveredBox = null;

let previousSelectedNode = null;
let selectedNodeBoundingRect = null;
let hoveredNodeBoundingRect = null;

let isPanning = false;
let panningTimeout = null;

let isPanelReady = false;

const initializeRulers = () => {
    const containerBoundingRect = mainFrame.parentElement.getBoundingClientRect();
    topRuler.width = containerBoundingRect.width - rulerHeight;
    topRuler.height = rulerHeight;
    leftRuler.width = rulerHeight;
    leftRuler.height = containerBoundingRect.height - rulerHeight;
}

const refreshRulers = () => {
    if (! isPanelReady) {
        initializeRulers();
    }

    // Get the current transform values
    const canvasWidth = parseInt(mainFrame.style.width, 10);
    const canvasHeight = parseInt(mainFrame.style.height, 10);

    // Prepare the top ruler
    let ctx = topRuler.getContext('2d', { alpha: false });
    ctx.clearRect(0, 0, topRuler.width + rulerHeight, topRuler.height);
    ctx.fillStyle = hexToRgba(documentComputedStyle.getPropertyValue('--color-gray-700'));
    ctx.fillRect(0, 0, topRuler.width + rulerHeight, topRuler.height);

    // Prepare the left ruler
    ctx = leftRuler.getContext('2d', { alpha: false });
    ctx.clearRect(0, 0, leftRuler.width, leftRuler.height);
    ctx.fillStyle = hexToRgba(documentComputedStyle.getPropertyValue('--color-gray-700'));
    ctx.fillRect(0, 0, leftRuler.width, leftRuler.height);

    // Define the ruler tick steps
    const rulerTickSmallHeight = 5;
    const rulerTickMediumHeight = 8;
    const rulerTickLargeHeight = 15;
    let rulerStepSmall = 5;
    let rulerStepMedium = rulerStepSmall * 5;
    let rulerStepLarge = rulerStepMedium * 2;
    // redefine the ruler step if the distance between two ticks is too small
    if (rulerStepSmall * currentScale < 5) {
        rulerStepSmall = rulerStepSmall * Math.ceil(5 / (rulerStepSmall * currentScale));
        rulerStepMedium = rulerStepSmall * 5;
        rulerStepLarge = rulerStepMedium * 2;
    }
    // redefine the ruler step if the distance between two ticks is too large
    if (rulerStepSmall * currentScale > 10) {
        rulerStepSmall = rulerStepSmall / Math.ceil((rulerStepSmall * currentScale) / 10);
        rulerStepSmall = rulerStepSmall < 2 ? 1 : rulerStepSmall; // Prevent from being less than 1
        rulerStepMedium = rulerStepSmall * 5;
        rulerStepLarge = rulerStepMedium * 2;
    }

    // Draw the ruler ticks for the top ruler
    ctx = topRuler.getContext('2d', { alpha: false });
    ctx.fillStyle = hexToRgba(documentComputedStyle.getPropertyValue('--color-base'));
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    let startTickNumber = Math.floor(Math.max(-currentTranslateX / currentScale, 0) / rulerStepSmall) * rulerStepSmall;
    let endTickNumber = Math.min((topRuler.width - currentTranslateX) / currentScale + rulerHeight, canvasWidth);
    for (let i = startTickNumber; i <= endTickNumber; i += rulerStepSmall) {
        const tickHeight = i % rulerStepLarge === 0
            ? rulerTickLargeHeight
            : i % rulerStepMedium === 0
                ? rulerTickMediumHeight
                : rulerTickSmallHeight;
        ctx.fillRect(currentTranslateX + i * currentScale - rulerHeight, 0, 1, tickHeight);
        if (i % rulerStepLarge === 0) {
            ctx.fillText(i, currentTranslateX + i * currentScale - rulerHeight + 4, 16);
        }
    }

    // Draw the ruler ticks for the left ruler
    ctx = leftRuler.getContext('2d', { alpha: false });
    ctx.fillStyle = hexToRgba(documentComputedStyle.getPropertyValue('--color-base'));
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    startTickNumber = Math.floor(Math.max(-currentTranslateY / currentScale, 0) / rulerStepSmall) * rulerStepSmall;
    endTickNumber = Math.min((leftRuler.height - currentTranslateY) / currentScale + rulerHeight, canvasHeight);
    for (let i = startTickNumber; i <= endTickNumber; i += rulerStepSmall) {
        const tickHeight = i % rulerStepLarge === 0
            ? rulerTickLargeHeight
            : i % rulerStepMedium === 0
                ? rulerTickMediumHeight
                : rulerTickSmallHeight;
        ctx.fillRect(0, currentTranslateY + i * currentScale - rulerHeight, tickHeight, 1);
        if (i % rulerStepLarge === 0) {
            ctx.save();
            ctx.translate(16, currentTranslateY + i * currentScale - rulerHeight + 4);
            ctx.rotate(-Math.PI / 2);
            ctx.fillText(i, 0, 0);
            ctx.restore();
        }
    }

    // Fill the area to show the selected node position on the canvas
    if (selectedNodeBoundingRect) {
        ctx = topRuler.getContext('2d', { alpha: false });
        ctx.fillStyle = hexToRgba(documentComputedStyle.getPropertyValue('--color-blue') + '55');
        ctx.fillRect(currentTranslateX + selectedNodeBoundingRect.left * currentScale - rulerHeight, 0, selectedNodeBoundingRect.width * currentScale, topRuler.height);
        ctx = leftRuler.getContext('2d', { alpha: false });
        ctx.fillStyle = hexToRgba(documentComputedStyle.getPropertyValue('--color-blue') + '55');
        ctx.fillRect(0, currentTranslateY + selectedNodeBoundingRect.top * currentScale - rulerHeight, leftRuler.width, selectedNodeBoundingRect.height * currentScale);
    }
}

const initializeCanvas = () => {
    // Set the main iframe size
    const updateMainCanvasHeight = () => {
        mainFrame.style.width = defaultBreakpoints.desktop + 'px';
        mainFrame.style.height = `${mainFrame.contentDocument.body.scrollHeight}px`;
        mainFrameBoundingRect = mainFrame.getBoundingClientRect();
    };

    //
    let marginLeft = rulerHeight;
    mainFrame.style.transform = `translate(${marginLeft}px, ${marginLeft}px)`;
    currentTranslateX = marginLeft;
    currentTranslateY = marginLeft;
    mainFrame.style.transformOrigin = '0px 0px';

    // Set the initial height
    updateMainCanvasHeight();

    // Create a MutationObserver to watch for changes in the body height
    const documentTree = mainFrame.contentDocument.documentElement;
    const observer = new MutationObserver(updateMainCanvasHeight);

    // Start observing the document tree for changes
    observer.observe(documentTree, {
        attributes: true,
        childList: true,
        subtree: true
    });

    // // Ensure the observer is disconnected when the iframe is unloaded
    // mainFrame.contentWindow.addEventListener('unload', () => {
    //     observer.disconnect();
    // });
}

const refreshCanvas = () => {
    if (! isPanelReady) {
        initializeCanvas();
    }

    if (! hoveredBox) {
        // Initialize the hovered box
        hoveredBox = document.createElement('div');
        hoveredBox.classList.add('hovered-box', 'helper');
        hoveredBox.addEventListener('mouseup', (event) => {
            event.stopImmediatePropagation();
            // Request to update the selected node
            window.dispatchEvent(new CustomEvent('element:select', {
                detail: {
                    uwId: hoveredNode.node.dataset.uwId,
                    uwPosition: hoveredNode.position,
                    uwParentId: hoveredNode.parent?.dataset.uwId,
                    target: 'canvas',
                }
            }));
        });
        canvasOverlay.appendChild(hoveredBox);
    }

    if (! selectedBox) {
        // Initialize the selected box
        selectedBox = document.createElement('div');
        selectedBox.classList.add('selected-box', 'helper');
        canvasOverlay.appendChild(selectedBox);

        // Initialize the drag area points
        for (let index = 0; index < 8; index++) {
            const dragAreaElement = document.createElement('div');
            dragAreaElement.classList.add('drag-area');
            selectedBox.appendChild(dragAreaElement);
        }
    }

    // Get the bounding rect of the selected node
    if (
        selectedNode.node &&
        selectedNode.node.nodeType === Node.ELEMENT_NODE
    ) {
        if (selectedNode !== previousSelectedNode) {
            selectedNodeBoundingRect = selectedNode.node.getBoundingClientRect();
            previousSelectedNode = selectedNode;
        }
    } else {
        selectedNodeBoundingRect = null;
        previousSelectedNode = null;
    }

    refreshSelectedBox();
    refreshHoveredBox();
}

const transformCanvas = (event) => {
    // Zoom in or out
    if (event.ctrlKey) {
        // Get the pointer position relative to the canvas overlay
        mainFrameBoundingRect = mainFrame.getBoundingClientRect();
        const pointerX = (event.clientX - mainFrameBoundingRect.left) / currentScale;
        const pointerY = (event.clientY - mainFrameBoundingRect.top) / currentScale;

        // Calculate the new scale
        // TODO: snap to 100% zoom if close enough
        let newScale = currentScale - event.deltaY * zoomFactor * currentScale;
        newScale = Math.max(newScale, 0.01); // prevent scaling to too small
        newScale = Math.min(newScale, 10); // prevent scaling to too big

        // Calculate the new translate
        // FIXME: the translation is not correct when the canvas was rotated
        const newTranslateX = (currentTranslateX + pointerX * (currentScale - 1)) + pointerX * (1 - newScale);
        const newTranslateY = (currentTranslateY + pointerY * (currentScale - 1)) + pointerY * (1 - newScale);

        // Apply the new transform
        mainFrame.style.transform = `translate(${newTranslateX}px, ${newTranslateY}px) scale(${newScale}) rotate(${currentRotate}deg)`;
        currentScale = newScale;
        currentTranslateX = newTranslateX;
        currentTranslateY = newTranslateY;
    }

    // // Rotate
    // else if (event.altKey) {
    //     let newRotate = currentRotate + rotateFactor * Math.sign(event.deltaY);
    //     mainFrame.style.transform = `translate(${currentTranslateX}px, ${currentTranslateY}px) scale(${currentScale}) rotate(${newRotate}deg)`;
    //     currentRotate = newRotate;
    // }

    // Scroll horizontally
    else if (event.shiftKey) {
        let newTranslateX = currentTranslateX - event.deltaY * scrollFactor / (currentScale >= 1 ? currentScale ** 0.05 : currentScale ** 0.000005);
        mainFrame.style.transform = `translate(${newTranslateX}px, ${currentTranslateY}px) scale(${currentScale}) rotate(${currentRotate}deg)`;
        currentTranslateX = newTranslateX;
    }

    // Scroll vertically
    else {
        let newTranslateY = currentTranslateY - event.deltaY * scrollFactor / (currentScale >= 1 ? currentScale ** 0.05 : currentScale ** 0.000005);
        mainFrame.style.transform = `translate(${currentTranslateX}px, ${newTranslateY}px) scale(${currentScale}) rotate(${currentRotate}deg)`;
        currentTranslateY = newTranslateY;
    }

    clearTimeout(panningTimeout);
    panningTimeout = setTimeout(() => {
        panningTimeout = null;
        refreshSelectedBox();
        refreshHoveredBox();
    }, 250);

    refreshSelectedBox();
    refreshHoveredBox();
}

const panCanvas = (dx, dy) => {
    const newTranslateX = currentTranslateX + dx / (currentScale >= 1 ? currentScale ** 0.05 : currentScale ** 0.000005);
    const newTranslateY = currentTranslateY + dy / (currentScale >= 1 ? currentScale ** 0.05 : currentScale ** 0.000005);
    mainFrame.style.transform = `translate(${newTranslateX}px, ${newTranslateY}px) scale(${currentScale}) rotate(${currentRotate}deg)`;
    currentTranslateX = newTranslateX;
    currentTranslateY = newTranslateY;

    clearTimeout(panningTimeout);
    panningTimeout = setTimeout(() => {
        panningTimeout = null;
        refreshSelectedBox();
        refreshHoveredBox();
    }, 250);

    refreshRulers();
    refreshSelectedBox();
    refreshHoveredBox();
};

const zoomCanvas = (event) => {
    let newScale = currentScale;
    switch (event.detail) {
        case 'in':
            newScale = currentScale + 100 * zoomFactor * currentScale;
            newScale = Math.max(newScale, 0.01); // prevent scaling to too small
            newScale = Math.min(newScale, 10); // prevent scaling to too big
            mainFrame.style.transform = `translate(${currentTranslateX}px, ${currentTranslateY}px) scale(${newScale}) rotate(${currentRotate}deg)`;
            currentScale = newScale;
            break;

        case 'out':
            newScale = currentScale - 100 * zoomFactor * currentScale;
            newScale = Math.max(newScale, 0.01); // prevent scaling to too small
            newScale = Math.min(newScale, 10); // prevent scaling to too big
            mainFrame.style.transform = `translate(${currentTranslateX}px, ${currentTranslateY}px) scale(${newScale}) rotate(${currentRotate}deg)`;
            currentScale = newScale;
            break;

        case 'fit':
            const containerBoundingRect = mainFrame.parentElement.getBoundingClientRect();
            if (defaultBreakpoints.desktop < (containerBoundingRect.width - rulerHeight)) {
                mainFrame.style.transform = `translate(${rulerHeight}px, ${rulerHeight}px)`;
            } else {
                const newScale = (containerBoundingRect.width - rulerHeight) / defaultBreakpoints.desktop;
                mainFrame.style.transform = `translate(${rulerHeight}px, ${rulerHeight}px) scale(${newScale})`;
                currentScale = newScale;
            }
            currentTranslateX = rulerHeight;
            currentTranslateY = rulerHeight;
            currentRotate = 0;
            break;

        default:
            newScale = event.detail.scale;
            mainFrame.style.transform = `translate(${currentTranslateX}px, ${currentTranslateY}px) scale(${newScale}) rotate(${currentRotate}deg)`;
            currentScale = newScale;
            break;
    }

    clearTimeout(panningTimeout);
    panningTimeout = setTimeout(() => {
        panningTimeout = null;
        refreshSelectedBox();
        refreshHoveredBox();
    }, 250);

    refreshSelectedBox();
    refreshHoveredBox();
    refreshRulers();
}

const viewCanvas = () => {
    // Reset the canvas transform
    currentScale = 1;
    currentTranslateX = rulerHeight;
    currentTranslateY = rulerHeight;
    currentRotate = 0;
    mainFrame.style.transform = `translate(${currentTranslateX}px, ${currentTranslateY}px) scale(${currentScale}) rotate(${currentRotate}deg)`;

    clearTimeout(panningTimeout);
    panningTimeout = setTimeout(() => {
        panningTimeout = null;
        refreshSelectedBox();
        refreshHoveredBox();
    }, 250);

    refreshSelectedBox();
    refreshHoveredBox();
    refreshRulers();
}

const refreshSelectedBox = () => {
    if (selectedNodeBoundingRect) {
        if (panningTimeout) {
            selectedBox.classList.add('hidden');
            return;
        }

        // Update the selected box position and size
        let { left, top, width, height } = selectedNodeBoundingRect;
        left = currentTranslateX + left * currentScale;
        top = currentTranslateY + top * currentScale;
        width = width * currentScale;
        height = height * currentScale;
        selectedBox.style.left = `${left}px`;
        selectedBox.style.top = `${top}px`;
        selectedBox.style.width = `${width}px`;
        selectedBox.style.height = `${height}px`;

        //
        const dragAreaPoints = selectedBox.querySelectorAll('.drag-area');
        const dragAreaPositions = [
            { x: -5 - 0.5, y: -5 - 0.5, title: 'top-left', },
            { x: width / 2 - 5 - 1, y: -5 - 0.5, title: 'middle-top', },
            { x: width - 5 - 1.5, y: -5 - 0.5, title: 'top-right', },
            { x: -5 - 0.5, y: height / 2 - 5 - 1, title: 'middle-left', },
            { x: width - 5 - 1.5, y: height / 2 - 5 - 1, title: 'middle-right', },
            { x: -5 - 0.5, y: height - 5 - 1.5, title: 'bottom-left', },
            { x: width / 2 - 5 - 1, y: height - 5 - 1.5, title: 'middle-bottom', },
            { x: width - 5 - 1.5, y: height - 5 - 1.5, title: 'bottom-right', },
        ]
        dragAreaPoints.forEach((dragAreaPoint, index) => {
            dragAreaPoint.style.top = `${dragAreaPositions[index].y}px`;
            dragAreaPoint.style.left = `${dragAreaPositions[index].x}px`;
            dragAreaPoint.dataset.title = dragAreaPositions[index].title;

            // Set the cursor style for the drag area points
            switch (dragAreaPositions[index].title) {
                case 'top-left':
                case 'bottom-right':
                    dragAreaPoint.style.cursor = 'nwse-resize';
                    break;
                case 'top-right':
                case 'bottom-left':
                    dragAreaPoint.style.cursor = 'nesw-resize';
                    break;
                case 'middle-top':
                case 'middle-bottom':
                    dragAreaPoint.style.cursor = 'ns-resize';
                    break;
                case 'middle-left':
                case 'middle-right':
                    dragAreaPoint.style.cursor = 'ew-resize';
                    break;
            }

            // Unhide the drag area point
            dragAreaPoint.classList.remove('hidden');

            // Hide some drag area points if the selected element is too small either in width
            if (selectedNodeBoundingRect.width * currentScale <= 5) {
                if (
                    dragAreaPositions[index].title.startsWith('top') ||
                    dragAreaPositions[index].title.startsWith('bottom') ||
                    dragAreaPositions[index].title.endsWith('left') ||
                    dragAreaPositions[index].title.endsWith('right')
                ) {
                    dragAreaPoint.classList.add('hidden');
                }
            } else if (selectedNodeBoundingRect.width * currentScale <= 10) {
                if (
                    dragAreaPositions[index].title === 'middle-top' ||
                    dragAreaPositions[index].title === 'middle-bottom'
                ) {
                    dragAreaPoint.classList.add('hidden');
                }
            }

            // Hide some drag area points if the selected element is too small either in height
            if (selectedNodeBoundingRect.height * currentScale <= 5) {
                if (
                    dragAreaPositions[index].title.startsWith('top') ||
                    dragAreaPositions[index].title.startsWith('bottom') ||
                    dragAreaPositions[index].title.endsWith('top') ||
                    dragAreaPositions[index].title.endsWith('bottom')
                ) {
                    dragAreaPoint.classList.add('hidden');
                }
            } else if (selectedNodeBoundingRect.height * currentScale <= 10) {
                if (
                    dragAreaPositions[index].title === 'middle-left' ||
                    dragAreaPositions[index].title === 'middle-right'
                ) {
                    dragAreaPoint.classList.add('hidden');
                }
            }
        });

        // Show the selected box
        selectedBox.classList.remove('hidden');
    } else {
        // Hide the selected box
        selectedBox.classList.add('hidden');
    }
}

const refreshHoveredBox = () => {
    if (
        hoveredNodeBoundingRect &&
        hoveredNode.node !== selectedNode.node
    ) {
        if (panningTimeout) {
            hoveredBox.classList.add('hidden');
            return;
        }

        // Update the hovered box position and size
        let { left, top, width, height } = hoveredNodeBoundingRect;
        left = currentTranslateX + left * currentScale;
        top = currentTranslateY + top * currentScale;
        width = width * currentScale;
        height = height * currentScale;
        hoveredBox.style.left = `${left}px`;
        hoveredBox.style.top = `${top}px`;
        hoveredBox.style.width = `${width}px`;
        hoveredBox.style.height = `${height}px`;

        // Show the hovered box
        hoveredBox.classList.remove('hidden');
    } else {
        // Hide the hovered box
        hoveredBox.classList.add('hidden');
    }
}

// TODO: do testing to see if there is any performance issues
const findHoveredElements = (event) => {
    // Get the hovered elements
    let hoveredElements = document.elementsFromPoint(event.clientX, event.clientY);

    // Get elements that are in the canvas container
    hoveredElements = hoveredElements.filter(element => {
        return (
            ! element.classList.contains('helper') &&
            canvasContainer.contains(element)
        );
    });

    // Get the first hovered element if any
    let topMostHoveredElement = hoveredElements[0];

    // Skip if the current hovered element is not changing
    if (hoveredNode.node === topMostHoveredElement) {
        return;
    }

    if (! topMostHoveredElement) {
        // Set the hovered element
        setHoveredNode(null);

        //
        hoveredNodeBoundingRect = null;
        refreshHoveredBox();

        // Request panel updates
        window.dispatchEvent(new CustomEvent('outline:hover'));

        return;
    }

    if (topMostHoveredElement === mainFrame) {
        // Get the pointer position relative to the iframe
        mainFrameBoundingRect = mainFrame.getBoundingClientRect();
        const pointerX = (event.clientX - mainFrameBoundingRect.left) / currentScale;
        const pointerY = (event.clientY - mainFrameBoundingRect.top) / currentScale;

        // Replace the hovered elements with the iframe content if any
        topMostHoveredElement = topMostHoveredElement.contentDocument.elementFromPoint(pointerX, pointerY);

        // Skip if the current hovered element is not changing
        if (hoveredNode.node === topMostHoveredElement) {
            return;
        }

        if (! topMostHoveredElement) {
            // Set the hovered element
            setHoveredNode(null);

            //
            hoveredNodeBoundingRect = null;
            refreshHoveredBox();

            // Request panel updates
            window.dispatchEvent(new CustomEvent('outline:hover'));

            return;
        }

        // Set the hovered element
        // TODO: move to action-center?
        setHoveredNode(
            topMostHoveredElement,
            topMostHoveredElement.parentElement
                ? Array.prototype.indexOf.call(topMostHoveredElement.parentElement.children, topMostHoveredElement)
                : null,
            topMostHoveredElement.parentElement,
        );

        //
        hoveredNodeBoundingRect = topMostHoveredElement.getBoundingClientRect();
        refreshHoveredBox();

        // if (event.altKey) {
        //     // Request panel updates
        //     window.dispatchEvent(new CustomEvent('outline:hover'));
        // }

        return;
    }

    // TODO: if () {}
}

const refreshPanel = () => {
    refreshCanvas();
    refreshRulers();

    if (! isPanelReady) {
        isPanelReady = true;
    }
}

const onWindowResize = () => {
    // To force the selection box to be recalculated
    previousSelectedNode = null;

    initializeRulers();
    refreshPanel();
}

(() => {
    // Register the mouse event listeners for the canvas overlay
    canvasOverlay.addEventListener('mousedown', (event) => {
        if (! isPanelReady) {
            return;
        }
        if (event.which === 2) { // middle mouse button
            isPanning = true;
            event.preventDefault();
        }
    });
    canvasOverlay.addEventListener('mousedown', (event) => {
        if (! isPanelReady) {
            return;
        }
        if (event.which === 2) { // middle mouse button
            isPanning = true;
            canvasOverlay.requestPointerLock();
            event.preventDefault();
        }
    });
    canvasOverlay.addEventListener('mousemove', (event) => {
        if (! isPanelReady) {
            return;
        }
        if (isPanning) {
            const dx = event.movementX;
            const dy = event.movementY;
            panCanvas(dx, dy);
            return;
        }
        // Find the hovered elements
        findHoveredElements(event);
    });
    canvasOverlay.addEventListener('mouseleave', () => {
        if (! isPanelReady) {
            return;
        }
        // Set the hovered element
        setHoveredNode(null);
        //
        hoveredNodeBoundingRect = null;
        refreshHoveredBox();
        // Request panel updates
        window.dispatchEvent(new CustomEvent('outline:hover'));
    });
    canvasOverlay.addEventListener('mouseup', (event) => {
        if (! isPanelReady) {
            return;
        }
        if (event.which === 2) { // middle mouse button
            isPanning = false;
            document.exitPointerLock();
        }
    });
    canvasOverlay.addEventListener('wheel', (event) => {
        if (! isPanelReady) {
            return;
        }
        transformCanvas(event);
        refreshRulers();
    }, { passive: true });

    // Register event listeners on the window
    window.addEventListener('canvas:refresh', refreshPanel);
    window.addEventListener('canvas:zoom', zoomCanvas);
    window.addEventListener('canvas:view', viewCanvas);
    window.addEventListener('resize', onWindowResize);
})()