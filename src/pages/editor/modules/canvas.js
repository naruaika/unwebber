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

let previousSelectedNode = null;
let selectedNodeBoundingRect = null;
let selectedNodeParentBoundingRect = null;
let selectedBox = null;

let hoveredElements = [];
let hoveredNodeBoundingRect = null;
let hoveredBox = null;

let isPanning = false;
let panningTimeout = null;

let isSpacebarBeingPressed = false;
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
        // TODO: add support for viewport width and height,
        // in case of game or presentation slides development?
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
    new MutationObserver(updateMainCanvasHeight).observe(documentTree, {
        childList: true,
        subtree: true,
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
        hoveredBox.classList.add('hovered-box');
        hoveredBox.setAttribute('data-uw-ignore', '');
        hoveredBox.addEventListener('mouseup', onHoveredBoxMouseUp);
        canvasOverlay.appendChild(hoveredBox);
    }

    if (! selectedBox) {
        // Initialize the selected box
        selectedBox = document.createElement('div');
        selectedBox.classList.add('selected-box');
        selectedBox.setAttribute('data-uw-ignore', '');
        selectedBox.style.setProperty('--parent-top', '0px');
        selectedBox.style.setProperty('--parent-left', '0px');
        selectedBox.style.setProperty('--parent-width', '0px');
        selectedBox.style.setProperty('--parent-height', '0px');
        selectedBox.style.setProperty('--parent-visibility', 'hidden');
        canvasOverlay.appendChild(selectedBox);

        // Initialize the drag area points
        for (let index = 0; index < 8; index++) {
            const dragAreaElement = document.createElement('div');
            dragAreaElement.classList.add('drag-area');
            selectedBox.appendChild(dragAreaElement);
        }
    }

    // Get the bounding rect of the selected node
    // TODO: get the rects instead for non-element nodes?
    if (
        selectedNode.node &&
        selectedNode.node.nodeType === Node.ELEMENT_NODE
    ) {
        if (selectedNode !== previousSelectedNode) {
            selectedNodeBoundingRect = selectedNode.node.getBoundingClientRect();
            if (
                selectedNode.parent &&
                ! ('uwIgnore' in selectedNode.parent.dataset)
            ) {
                selectedNodeParentBoundingRect = selectedNode.parent?.getBoundingClientRect();
            } else {
                selectedNodeParentBoundingRect = null;
            }
            previousSelectedNode = selectedNode;
        }
    } else {
        selectedNodeBoundingRect = null;
        selectedNodeParentBoundingRect = null;
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
    let canvasOverlayBoundingRect = canvasOverlay.getBoundingClientRect();
    let pointerX;
    let pointerY;
    let newTranslateX;
    let newTranslateY;

    mainFrameBoundingRect = mainFrame.getBoundingClientRect();

    switch (event.detail) {
        case 'in':
            // Get the pointer position relative to center of the canvas overlay
            pointerX = (canvasOverlayBoundingRect.left + canvasOverlayBoundingRect.width / 2 - mainFrameBoundingRect.left) / currentScale;
            pointerY = (canvasOverlayBoundingRect.top + canvasOverlayBoundingRect.height / 2 - mainFrameBoundingRect.top) / currentScale;

            // Calculate the new scale
            newScale = currentScale + 100 * zoomFactor * currentScale;
            newScale = Math.max(newScale, 0.01); // prevent scaling to too small
            newScale = Math.min(newScale, 10); // prevent scaling to too big

            // Calculate the new translate
            // FIXME: the translation is not correct when the canvas was rotated
            newTranslateX = (currentTranslateX + pointerX * (currentScale - 1)) + pointerX * (1 - newScale);
            newTranslateY = (currentTranslateY + pointerY * (currentScale - 1)) + pointerY * (1 - newScale);

            // Apply the new transform
            mainFrame.style.transform = `translate(${newTranslateX}px, ${newTranslateY}px) scale(${newScale}) rotate(${currentRotate}deg)`;
            currentScale = newScale;
            currentTranslateX = newTranslateX;
            currentTranslateY = newTranslateY;

            break;

        case 'out':
            // Get the pointer position relative to center of the canvas overlay
            pointerX = (canvasOverlayBoundingRect.left + canvasOverlayBoundingRect.width / 2 - mainFrameBoundingRect.left) / currentScale;
            pointerY = (canvasOverlayBoundingRect.top + canvasOverlayBoundingRect.height / 2 - mainFrameBoundingRect.top) / currentScale;

            // Calculate the new scale
            newScale = currentScale - 100 * zoomFactor * currentScale;
            newScale = Math.max(newScale, 0.01); // prevent scaling to too small
            newScale = Math.min(newScale, 10); // prevent scaling to too big

            // Calculate the new translate
            // FIXME: the translation is not correct when the canvas was rotated
            newTranslateX = (currentTranslateX + pointerX * (currentScale - 1)) + pointerX * (1 - newScale);
            newTranslateY = (currentTranslateY + pointerY * (currentScale - 1)) + pointerY * (1 - newScale);

            // Apply the new transform
            mainFrame.style.transform = `translate(${newTranslateX}px, ${newTranslateY}px) scale(${newScale}) rotate(${currentRotate}deg)`;
            currentScale = newScale;
            currentTranslateX = newTranslateX;
            currentTranslateY = newTranslateY;

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
            // Get the pointer position relative to center of the canvas overlay
            pointerX = (canvasOverlayBoundingRect.left + canvasOverlayBoundingRect.width / 2 - mainFrameBoundingRect.left) / currentScale;
            pointerY = (canvasOverlayBoundingRect.top + canvasOverlayBoundingRect.height / 2 - mainFrameBoundingRect.top) / currentScale;

            // Get the new scale
            newScale = event.detail.scale;
            newScale = Math.max(newScale, 0.01); // prevent scaling to too small
            newScale = Math.min(newScale, 10); // prevent scaling to too big

            // Calculate the new translate
            // FIXME: the translation is not correct when the canvas was rotated
            newTranslateX = (currentTranslateX + pointerX * (currentScale - 1)) + pointerX * (1 - newScale);
            newTranslateY = (currentTranslateY + pointerY * (currentScale - 1)) + pointerY * (1 - newScale);

            // Apply the new transform
            mainFrame.style.transform = `translate(${newTranslateX}px, ${newTranslateY}px) scale(${newScale}) rotate(${currentRotate}deg)`;
            currentScale = newScale;
            currentTranslateX = newTranslateX;
            currentTranslateY = newTranslateY;

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

        if (selectedNodeParentBoundingRect) {
            let { left, top, width, height } = selectedNodeParentBoundingRect;
            left = (left - selectedNodeBoundingRect.left) * currentScale;
            top = (top - selectedNodeBoundingRect.top) * currentScale;
            width = width * currentScale;
            height = height * currentScale;
            selectedBox.style.setProperty('--parent-top', `${top - 1}px`);
            selectedBox.style.setProperty('--parent-left', `${left - 1}px`);
            selectedBox.style.setProperty('--parent-width', `${width - 2}px`);
            selectedBox.style.setProperty('--parent-height', `${height - 2}px`);
            selectedBox.style.setProperty('--parent-visibility', 'visible');
        } else {
            selectedBox.style.setProperty('--parent-visibility', 'hidden');
        }

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

const onHoveredBoxMouseUp = (event) => {
    event.stopImmediatePropagation();

    // Cycle through the overlapping hovered elements
    if (event.altKey) {
        let index = hoveredElements.includes(selectedNode.node)
            ? hoveredElements.indexOf(selectedNode.node)
            : -1;
        index = (index + 1) % hoveredElements.length;
        setHoveredNode(
            hoveredElements[index],
            hoveredElements[index].parentElement
                ? Array.prototype.indexOf.call(hoveredElements[index].parentElement.childNodes, hoveredElements[index])
                : null,
            hoveredElements[index].parentElement,
        );
    } else {
        // Reset the hovered node
        setHoveredNode(
            hoveredElements[0],
            hoveredElements[0].parentElement
                ? Array.prototype.indexOf.call(hoveredElements[0].parentElement.childNodes, hoveredElements[0])
                : null,
            hoveredElements[0].parentElement,
        );
    }

    // Request to update the selected node
    window.dispatchEvent(new CustomEvent('element:select', {
        detail: {
            uwId: hoveredNode.node.dataset.uwId,
            uwPosition: hoveredNode.position,
            uwParentId: hoveredNode.parent?.dataset.uwId,
            target: 'canvas',
        }
    }));
}

const refreshHoveredBox = () => {
    if (hoveredNodeBoundingRect) {
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

const findHoveredElements = (event) => {
    // Get the hovered elements
    hoveredElements = document.elementsFromPoint(event.clientX, event.clientY);

    // Get elements that are in the canvas container
    hoveredElements = hoveredElements.filter(element =>
        ! ('uwIgnore' in element.dataset) &&
        canvasContainer.contains(element)
    );

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
        hoveredElements = topMostHoveredElement.contentDocument.elementsFromPoint(pointerX, pointerY);

        // Get elements that are not ignored
        hoveredElements = hoveredElements.filter(element => ! ('uwIgnore' in element.dataset));

        // Get the first hovered element if any
        topMostHoveredElement = hoveredElements[0];

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
                ? Array.prototype.indexOf.call(topMostHoveredElement.parentElement.childNodes, topMostHoveredElement)
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

const showContextMenu = (event) => {
    event.preventDefault();

    // TODO: implement the context menu
}

const refreshPanel = (event = {}) => {
    // To force the selection box to be recalculated
    // and hide the hovering box while transforming the selected node
    if (event.detail?.transform) {
        previousSelectedNode = null;
        hoveredNodeBoundingRect = null;
    }

    // To hide the hovering box
    if (event.detail?.existence) {
        hoveredNodeBoundingRect = null;
    }

    refreshCanvas();
    refreshRulers();

    if (! isPanelReady) {
        isPanelReady = true;
    }
}

// TODO: implement marquee selection, but firstly add support for multiple selection

// TODO: implement the drag and drop feature

const onCanvasContainerMouseUp = (event) => {
    if (! isPanelReady) {
        return;
    }

    if (event.which === 1) { // left mouse button
        // Request to clear the selected node
        window.dispatchEvent(new CustomEvent('element:select', {
            detail: { target: 'canvas' }
        }));
    }
}

const onCanvasOverlayMouseDown = (event) => {
    if (! isPanelReady) {
        return;
    }

    if (
        (isSpacebarBeingPressed && event.which === 1) || // left mouse button
        event.which === 2 // middle mouse button
    ) {
        isPanning = true;
        canvasOverlay.requestPointerLock();
        // TODO: maybe the user want to see the cursor moving within the canvas boundary
        // like in the Blender 3D software.
        // See https://stackoverflow.com/a/7072718/8791891 for a reference,
        // and https://stackoverflow.com/a/54216477/8791891
        return;
    }
}

const onCanvasOverlayMouseUp = (event) => {
    if (! isPanelReady) {
        return;
    }

    if (
        (isPanning && event.which === 1) || // left mouse button
        event.which === 2 // middle mouse button
    ) {
        isPanning = false;
        document.exitPointerLock();
        event.stopImmediatePropagation();
        return;
    }
}

const onCanvasOverlayMouseMove = (event) => {
    if (! isPanelReady) {
        return;
    }

    if (isPanning) {
        panCanvas(event.movementX, event.movementY);
        return;
    }

    if (isSpacebarBeingPressed) {
        return;
    }

    // Find the hovered elements
    findHoveredElements(event);
}

const onCanvasOverlayMouseEnter = () => {
    // Register the key event listener on the document
    document.addEventListener('keydown', onDocumentKeyDown);
    document.addEventListener('keyup', onDocumentKeyUp);
}

const onCanvasOverlayMouseLeave = () => {
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

    // Register the key event listener on the document
    document.removeEventListener('keydown', onDocumentKeyDown);
    document.removeEventListener('keyup', onDocumentKeyUp);
}

const onCanvasOverlayWheel = (event) => {
    if (! isPanelReady) {
        return;
    }

    transformCanvas(event);
    refreshRulers();
}

const onDocumentKeyDown = (event) => {
    if (! isPanelReady) {
        return;
    }

    if (event.code === 'Space') {
        isSpacebarBeingPressed = true;

        // Clear the hovered element
        setHoveredNode(null);
        hoveredNodeBoundingRect = null;
        refreshHoveredBox();

        // Request panel updates
        window.dispatchEvent(new CustomEvent('outline:hover'));

        // Set the cursor style
        canvasOverlay.style.cursor = 'grab';

        event.stopImmediatePropagation();

        return;
    }
}

const onDocumentKeyUp = (event) => {
    if (! isPanelReady) {
        return;
    }

    if (event.code === 'Space') {
        isSpacebarBeingPressed = false;

        // Reset the cursor style
        canvasOverlay.style.cursor = 'default';

        event.stopImmediatePropagation();

        return;
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
    canvasContainer.addEventListener('mouseup', onCanvasContainerMouseUp);
    canvasOverlay.addEventListener('mousedown', onCanvasOverlayMouseDown);
    canvasOverlay.addEventListener('mouseup', onCanvasOverlayMouseUp);
    canvasOverlay.addEventListener('mousemove', onCanvasOverlayMouseMove);
    canvasOverlay.addEventListener('mouseenter', onCanvasOverlayMouseEnter);
    canvasOverlay.addEventListener('mouseleave', onCanvasOverlayMouseLeave);
    canvasOverlay.addEventListener('wheel', onCanvasOverlayWheel, { passive: true });

    // Register event listeners on the window
    window.addEventListener('canvas:refresh', refreshPanel);
    window.addEventListener('canvas:zoom', zoomCanvas);
    window.addEventListener('canvas:view', viewCanvas);
    window.addEventListener('resize', onWindowResize);
})()