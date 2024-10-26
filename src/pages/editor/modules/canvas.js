'use strict';

import {
    selectedNode,
    hoveredNode,
    setHoveredNode,
    metadata,
    setMetadata,
    setSelectedNode,
    apiSchema,
} from '../globals.js';
import { hexToRgba, styleElement } from '../helpers.js';

const rootContainer = document.querySelector('.main-canvas__container');
const topRuler = rootContainer.querySelector('.top-ruler');
const leftRuler = rootContainer.querySelector('.left-ruler');
const canvasContainer = rootContainer.querySelector('.main-container');
const canvasOverlay = rootContainer.querySelector('.main-canvas__overlay');
const mainFrame = rootContainer.querySelector('.main-iframe');

const documentComputedStyle = getComputedStyle(document.documentElement);

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
let currentPointerX = 0;
let currentPointerY = 0;

let previousSelectedNode = null;
let selectedBox = null;

let hoveredElements = [];
let hoveredBox = null;

let isPanning = false;
let panningTimeout = null;

let dragStartPoint = null;
let dragStartMatrix = null;
let dragPointerId = null;
let dragAnimationRequestId = null;
let isPreparedToDrag = false;
let isDragging = false;
let isDraggingInterrupted = false;
let isDraggingJustDone = false;

let isResizing = false;

let isSpacebarBeingPressed = false;
let isPanelReady = false;

let mainFrameBoundingRect = null;
let selectedNodeBoundingRect = null;
let selectedNodeParentBoundingRect = null;
let hoveredNodeBoundingRect = null;

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
    // TODO: may need to separate the render layer for the below process
    // to prevent unnecessary re-rendering of the rulers
    if (selectedNodeBoundingRect) {
        ctx = topRuler.getContext('2d', { alpha: false });
        ctx.fillStyle = hexToRgba(documentComputedStyle.getPropertyValue('--color-blue') + '55');
        ctx.fillRect(currentTranslateX + selectedNodeBoundingRect.left * currentScale - rulerHeight, 0, selectedNodeBoundingRect.width * currentScale, topRuler.height);
        ctx.fillStyle = hexToRgba(documentComputedStyle.getPropertyValue('--color-blue'));
        ctx.fillRect(currentTranslateX + selectedNodeBoundingRect.left * currentScale - rulerHeight, 0, 1, topRuler.height);
        ctx.fillRect(currentTranslateX + selectedNodeBoundingRect.left * currentScale - rulerHeight + selectedNodeBoundingRect.width * currentScale, 0, 1, topRuler.height);
        ctx = leftRuler.getContext('2d', { alpha: false });
        ctx.fillStyle = hexToRgba(documentComputedStyle.getPropertyValue('--color-blue') + '55');
        ctx.fillRect(0, currentTranslateY + selectedNodeBoundingRect.top * currentScale - rulerHeight, leftRuler.width, selectedNodeBoundingRect.height * currentScale);
        ctx.fillStyle = hexToRgba(documentComputedStyle.getPropertyValue('--color-blue'));
        ctx.fillRect(0, currentTranslateY + selectedNodeBoundingRect.top * currentScale - rulerHeight, leftRuler.width, 1);
        ctx.fillRect(0, currentTranslateY + selectedNodeBoundingRect.top * currentScale - rulerHeight + selectedNodeBoundingRect.height * currentScale, leftRuler.width, 1);
    }
}

const adjustMainFrameSize = () => {
    // TODO: add support for viewport width and height,
    // in case of game or presentation slides development?
    mainFrame.style.width = defaultBreakpoints.desktop + 'px';
    mainFrame.style.height = `${mainFrame.contentDocument.body.scrollHeight}px`;
    mainFrameBoundingRect = mainFrame.getBoundingClientRect();
};

const initializeCanvas = () => {
    //
    let marginLeft = rulerHeight * 2;
    mainFrame.style.transform = `translate(${marginLeft}px, ${marginLeft}px)`;
    currentTranslateX = marginLeft;
    currentTranslateY = marginLeft;
    mainFrame.style.transformOrigin = '0px 0px';

    // Set the initial main frame size
    adjustMainFrameSize();

    // Create a MutationObserver to watch for changes in the body height
    const documentTree = mainFrame.contentDocument.documentElement;
    new MutationObserver(adjustMainFrameSize).observe(documentTree, {
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
        hoveredBox.addEventListener('pointerup', onHoveredBoxMouseUp);
        hoveredBox.addEventListener('pointerdown', onHoveredBoxMouseDown);
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
            dragAreaElement.setAttribute('data-uw-ignore', '');
            dragAreaElement.classList.add('drag-area');
            dragAreaElement.addEventListener('pointerdown', () => { isResizing = true; });
            dragAreaElement.addEventListener('pointerup', () => { isResizing = false; });
            selectedBox.appendChild(dragAreaElement);
        }
    }

    // Get the bounding rect of the selected node
    // TODO: get the rects instead for non-element nodes?
    if (
        selectedNode.node &&
        selectedNode.node.nodeType === Node.ELEMENT_NODE &&
        selectedNode.node.tagName.toLowerCase() !== 'head' &&
        ! apiSchema.htmlElements
            .find(element => element.tag === selectedNode.node.tagName.toLowerCase())
            .categories
            .includes('metadata')
    ) {
        if (selectedNode !== previousSelectedNode) {
            updateSelectedNodeBoundingRect();
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
        updateSelectedNodeBoundingRect();
        refreshSelectedBox();
        refreshHoveredBox();
    }, 250);

    refreshRulers();
    refreshSelectedBox();
    refreshHoveredBox();

    mainFrameBoundingRect = mainFrame.getBoundingClientRect();
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
        updateSelectedNodeBoundingRect();
        refreshSelectedBox();
        refreshHoveredBox();
    }, 250);

    refreshRulers();
    refreshSelectedBox();
    refreshHoveredBox();

    mainFrameBoundingRect = mainFrame.getBoundingClientRect();
};

const zoomCanvas = (event) => {
    let newScale = currentScale;
    let pointerX;
    let pointerY;
    let newTranslateX;
    let newTranslateY;

    const containerBoundingRect = mainFrame.parentElement.getBoundingClientRect();
    const canvasOverlayBoundingRect = canvasOverlay.getBoundingClientRect();

    switch (event.detail) {
        case 'selection':
            if (! selectedNodeBoundingRect) {
                return;
            }

            // Calculate the new scale to fit the selected node within the main frame
            const scaleX = (containerBoundingRect.width - rulerHeight * 3) / selectedNodeBoundingRect.width;
            const scaleY = (containerBoundingRect.height - rulerHeight * 3) / selectedNodeBoundingRect.height;
            newScale = Math.min(scaleX, scaleY);

            // Calculate the new translate to center the selected node within the main frame
            newTranslateX = ((containerBoundingRect.width - rulerHeight * 3) - selectedNodeBoundingRect.width * newScale) / 2 - selectedNodeBoundingRect.left * newScale + rulerHeight * 2;
            newTranslateY = ((containerBoundingRect.height - rulerHeight * 3) - selectedNodeBoundingRect.height * newScale) / 2 - selectedNodeBoundingRect.top * newScale + rulerHeight * 2;

            // Apply the new transform
            mainFrame.style.transform = `translate(${newTranslateX}px, ${newTranslateY}px) scale(${newScale}) rotate(${currentRotate}deg)`;
            currentScale = newScale;
            currentTranslateX = newTranslateX;
            currentTranslateY = newTranslateY;

            break;

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
        updateSelectedNodeBoundingRect();
        refreshSelectedBox();
        refreshHoveredBox();
    }, 250);

    refreshSelectedBox();
    refreshHoveredBox();
    refreshRulers();

    mainFrameBoundingRect = mainFrame.getBoundingClientRect();
}

const updateSelectedNodeBoundingRect = () => {
    if (! selectedNode.node) {
        selectedNodeBoundingRect = null;
        return;
    }
    selectedNodeBoundingRect = selectedNode.node.getBoundingClientRect();
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

        if (
            selectedNodeParentBoundingRect &&
            ! isDragging
        ) {
            let { left, top, width, height } = selectedNodeParentBoundingRect;
            left = (left - selectedNodeBoundingRect.left) * currentScale;
            top = (top - selectedNodeBoundingRect.top) * currentScale;
            width = width * currentScale;
            height = height * currentScale;
            selectedBox.style.setProperty('--parent-top', `${top - 2}px`);
            selectedBox.style.setProperty('--parent-left', `${left - 2}px`);
            selectedBox.style.setProperty('--parent-width', `${width}px`);
            selectedBox.style.setProperty('--parent-height', `${height}px`);
            selectedBox.style.setProperty('--parent-visibility', 'visible');
        } else {
            selectedBox.style.setProperty('--parent-visibility', 'hidden');
        }

        //
        const dragAreaPoints = selectedBox.querySelectorAll('.drag-area');
        const dragAreaPositions = [
            { x: -5 - 0.5, y: -5 - 0.5, title: 'top-left', },
            { x: width / 2 - 5 - 1, y: -5 - 0.5, title: 'middle-top', },
            { x: width - 5 - 1, y: -5 - 0.5, title: 'top-right', },
            { x: -5 - 0.5, y: height / 2 - 5 - 1, title: 'middle-left', },
            { x: width - 5 - 1, y: height / 2 - 5 - 1, title: 'middle-right', },
            { x: -5 - 0.5, y: height - 5 - 1, title: 'bottom-left', },
            { x: width / 2 - 5 - 1, y: height - 5 - 1, title: 'middle-bottom', },
            { x: width - 5 - 1, y: height - 5 - 1, title: 'bottom-right', },
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
            if (selectedNodeBoundingRect.width * currentScale <= 10) {
                if (
                    dragAreaPositions[index].title.startsWith('top') ||
                    dragAreaPositions[index].title.startsWith('bottom') ||
                    dragAreaPositions[index].title.endsWith('left') ||
                    dragAreaPositions[index].title.endsWith('right')
                ) {
                    dragAreaPoint.classList.add('hidden');
                }
            } else if (selectedNodeBoundingRect.width * currentScale <= 20) {
                if (
                    dragAreaPositions[index].title === 'middle-top' ||
                    dragAreaPositions[index].title === 'middle-bottom'
                ) {
                    dragAreaPoint.classList.add('hidden');
                }
            }

            // Hide some drag area points if the selected element is too small either in height
            if (selectedNodeBoundingRect.height * currentScale <= 10) {
                if (
                    dragAreaPositions[index].title.startsWith('top') ||
                    dragAreaPositions[index].title.startsWith('bottom') ||
                    dragAreaPositions[index].title.endsWith('top') ||
                    dragAreaPositions[index].title.endsWith('bottom')
                ) {
                    dragAreaPoint.classList.add('hidden');
                }
            } else if (selectedNodeBoundingRect.height * currentScale <= 20) {
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

    if (isDraggingInterrupted) {
        isDraggingInterrupted = false;
        return;
    }

    if (isPreparedToDrag) {
        // Flag to cancel dragging
        dragStartPoint = null;
        isPreparedToDrag = false;
    }

    // Skip if there is no hovered nodes
    if (hoveredElements.length == 0) {
        return;
    }

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
        hoveredNodeBoundingRect = hoveredElements[index].getBoundingClientRect();
        refreshHoveredBox();
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

const onHoveredBoxMouseDown = (event) => {
    if (event.which === 1) { // left mouse button
        // Prevent from dragging non-positioned hovered element
        // TODO: add support for dragging non-positioned hovered element
        const _metadata = metadata[hoveredNode.node.dataset.uwId];
        const position = _metadata.properties['position']?.value || 'static';
        if (! ['absolute', 'fixed', 'sticky'].includes(position)) {
            return;
        }

        // Flag to start dragging
        dragStartPoint = { x: event.clientX, y: event.clientY };
        isPreparedToDrag = true;
        return;
    }
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
        // Check if the pointer is within the selected box boundaries
        const pointerX = (event.clientX - mainFrameBoundingRect.left) / currentScale;
        const pointerY = (event.clientY - mainFrameBoundingRect.top) / currentScale;
        if (
            selectedNode.node &&
            selectedNode.node.nodeType === Node.ELEMENT_NODE &&
            selectedNodeBoundingRect &&
            pointerX >= selectedNodeBoundingRect.left &&
            pointerX <= selectedNodeBoundingRect.right &&
            pointerY >= selectedNodeBoundingRect.top &&
            pointerY <= selectedNodeBoundingRect.bottom
        ) {
            // Set the hovered element
            setHoveredNode(selectedNode.node, selectedNode.position, selectedNode.parent);

            // Set the hovered bounding rect
            hoveredNodeBoundingRect = selectedNodeBoundingRect;
            refreshHoveredBox();

            return;
        }
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

        return;
    }

    // TODO: if () {}
}

const moveSelectedNode = (clientX, clientY, constrained = false) => {
    // TODO: add support for object snapping

    const previousX = dragStartPoint.x;
    const previousY = dragStartPoint.y;
    const upcomingX = clientX;
    const upcomingY = clientY;

    // Get the metadata of the selected node
    const _metadata = metadata[selectedNode.node.dataset.uwId];
    const matrix = new DOMMatrix(_metadata.properties.transform?.value || 'matrix(1, 0, 0, 1, 0, 0)');

    // Apply the transformation to the element
    matrix.e = dragStartMatrix.e + upcomingX - previousX;
    matrix.f = dragStartMatrix.f + upcomingY - previousY;
    if (constrained) {
        const deltaX = upcomingX - previousX;
        const deltaY = upcomingY - previousY;
        const angle = Math.atan2(Math.abs(deltaY), Math.abs(deltaX)) * (180 / Math.PI);
        const threshold = Math.min(50, 40 + Math.max(Math.abs(deltaX), Math.abs(deltaY)) / 10);
        if (angle >= threshold - 10 && angle <= threshold + 10) {
            const shift = Math.max(Math.abs(upcomingX - previousX), Math.abs(upcomingY - previousY));
            matrix.e = shift * Math.sign(upcomingX - previousX) + dragStartMatrix.e;
            matrix.f = shift * Math.sign(upcomingY - previousY) + dragStartMatrix.f;
        } else {
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                matrix.f = dragStartMatrix.f;
            } else {
                matrix.e = dragStartMatrix.e;
            }
        }
    }
    styleElement(selectedNode.node, 'transform', matrix.toString(), true);

    // Save the property value
    _metadata.properties['transform'] = { value: matrix.toString(), checked: true };
    setMetadata(selectedNode.node.dataset.uwId, _metadata);

    updateSelectedNodeBoundingRect();
    refreshRulers();
    refreshSelectedBox();
};

const resizeSelectedNode = (dx, dy, direction) => { /* TODO: implement this */ }

const refreshPanel = (event = {}) => {
    // To force the selection box to be recalculated,
    // hide the hovering box while transforming the selected node,
    // and adjust the main frame size
    if (event.detail?.transform) {
        previousSelectedNode = null;
        hoveredNodeBoundingRect = null;
        adjustMainFrameSize();
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

const showContextMenu = (event) => {
    event.preventDefault();

    // TODO: implement this
}

const interruptAction = () => {
    if (isDragging) {
        // Flag to interrupt dragging
        dragStartPoint = null;
        isDragging = false;
        isDraggingInterrupted = true;
        canvasOverlay.releasePointerCapture(dragPointerId);

        // Reset the transformation of the selected node
        styleElement(selectedNode.node, 'transform', dragStartMatrix.toString(), true);

        // Reset the property value
        const _metadata = metadata[selectedNode.node.dataset.uwId];
        _metadata.properties['transform'] = { value: dragStartMatrix.toString(), checked: true };
        setMetadata(selectedNode.node.dataset.uwId, _metadata);

        // Reset the selected box
        updateSelectedNodeBoundingRect();
        refreshSelectedBox();

        // Show the hovered box
        hoveredNodeBoundingRect = selectedNodeBoundingRect;
        refreshHoveredBox();

        refreshRulers();

        return;
    }
}

// TODO: implement marquee selection, but firstly add support for multiple selection

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

    //
    dragPointerId = event.pointerId;
}

const onCanvasOverlayMouseUp = (event) => {
    event.stopImmediatePropagation();

    if (! isPanelReady) {
        return;
    }

    if (
        (isPanning && event.which === 1) || // left mouse button
        event.which === 2 // middle mouse button
    ) {
        isPanning = false;
        document.exitPointerLock();
        return;
    }

    if (isDragging) {
        // Flag to stop dragging
        dragStartPoint = null;
        isDragging = false;
        isDraggingJustDone = true;
        canvasOverlay.releasePointerCapture(dragPointerId);

        // Update the main frame size
        adjustMainFrameSize();

        // Show the selected parent box
        selectedNodeParentBoundingRect = selectedNode.parent?.getBoundingClientRect();
        refreshSelectedBox();

        // Show the hovered box
        hoveredNodeBoundingRect = selectedNodeBoundingRect;
        refreshHoveredBox();

        // Request to save the action
        const previousState = {
            // container: selectedNode.parent,
            // position: selectedNode.position,
            style: { transform: dragStartMatrix.toString() },
        };
        const upcomingState = {
            // container: selectedNode.parent,
            // position: selectedNode.position,
            style: { transform: metadata[selectedNode.node.dataset.uwId].properties.transform.value },
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

        // Reset the dragging matrix
        dragStartMatrix = null;

        return;
    }

    if (isDraggingInterrupted) {
        return;
    }

    // Request to clear the selected node if there is no hovered nodes
    if (hoveredElements.length == 0) {
        window.dispatchEvent(new CustomEvent('element:select', {
            detail: { target: 'canvas' }
        }));
        return;
    }
}

const onCanvasOverlayMouseMove = (event) => {
    if (! isPanelReady) {
        return;
    }

    currentPointerX = event.clientX;
    currentPointerY = event.clientY;

    if (isPanning) {
        panCanvas(event.movementX, event.movementY);
        return;
    }

    if (isSpacebarBeingPressed) {
        return;
    }

    if (isPreparedToDrag) {
        // Check if the drag distance is enough to start dragging
        if (
            Math.abs(event.clientX - dragStartPoint.x) > 5 ||
            Math.abs(event.clientY - dragStartPoint.y) > 5
        ) {
            // Flag to start dragging
            isPreparedToDrag = false;
            isDragging = true;
            isDraggingInterrupted = false;
            canvasOverlay.setPointerCapture(dragPointerId);

            // Request to update the selected node
            if (selectedNode.node !== hoveredNode.node) {
                window.dispatchEvent(new CustomEvent('element:select', {
                    detail: {
                        uwId: hoveredNode.node.dataset.uwId,
                        uwPosition: hoveredNode.position,
                        uwParentId: hoveredNode.parent?.dataset.uwId,
                        target: 'canvas',
                    }
                }));
            }
            setSelectedNode(hoveredNode.node, hoveredNode.position, hoveredNode.parent);

            // Re-calculate the dragging start point
            dragStartPoint = {
                x: (dragStartPoint.x - mainFrameBoundingRect.left) / currentScale,
                y: (dragStartPoint.y - mainFrameBoundingRect.top) / currentScale,
            };

            // Get the current transformation matrix
            dragStartMatrix = new DOMMatrix(metadata[selectedNode.node.dataset.uwId].properties.transform?.value || 'matrix(1, 0, 0, 1, 0, 0)');

            // Hide the hovered box
            hoveredNodeBoundingRect = null;
            refreshHoveredBox();
        }

        return;
    }

    if (isDragging) {
        if (! dragAnimationRequestId) {
            const canvasOverlayRect = canvasOverlay.getBoundingClientRect();
            if (
                currentPointerX < canvasOverlayRect.left ||
                currentPointerX > canvasOverlayRect.right ||
                currentPointerY < canvasOverlayRect.top ||
                currentPointerY > canvasOverlayRect.bottom
            ) {
                const lastPointerX = currentPointerX;
                const lastPointerY = currentPointerY;
                const continueDragging = () => {
                    if (
                        ! (
                            isDragging &&
                            (
                                currentPointerX < canvasOverlayRect.left ||
                                currentPointerX > canvasOverlayRect.right ||
                                currentPointerY < canvasOverlayRect.top ||
                                currentPointerY > canvasOverlayRect.bottom
                            )
                        )
                    ) {
                        dragAnimationRequestId = null;
                        return;
                    }
                    const distanceX = currentPointerX - lastPointerX;
                    const distanceY = currentPointerY - lastPointerY;
                    const speedFactor = 1 / 10;
                    if (currentPointerX < canvasOverlayRect.left || currentPointerX > canvasOverlayRect.right) {
                        panCanvas(-distanceX * speedFactor, 0);
                    }
                    if (currentPointerY < canvasOverlayRect.top || currentPointerY > canvasOverlayRect.bottom) {
                        panCanvas(0, -distanceY * speedFactor);
                    }
                    dragAnimationRequestId = requestAnimationFrame(continueDragging);
                    const clientX = (currentPointerX - mainFrameBoundingRect.left) / currentScale;
                    const clientY = (currentPointerY - mainFrameBoundingRect.top) / currentScale;
                    moveSelectedNode(clientX, clientY, event.shiftKey);
                };
                dragAnimationRequestId = requestAnimationFrame(continueDragging);
                return;
            }
        }

        const clientX = (event.clientX - mainFrameBoundingRect.left) / currentScale;
        const clientY = (event.clientY - mainFrameBoundingRect.top) / currentScale;
        moveSelectedNode(clientX, clientY, event.shiftKey);

        return;
    }

    if (isDraggingJustDone) {
        isDraggingJustDone = false;
        return;
    }

    if (isDraggingInterrupted) {
        isDraggingInterrupted = false;
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

    if (isPanning) {
        return;
    }

    transformCanvas(event);
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
    canvasOverlay.addEventListener('pointerdown', onCanvasOverlayMouseDown);
    canvasOverlay.addEventListener('pointerup', onCanvasOverlayMouseUp);
    canvasOverlay.addEventListener('pointermove', onCanvasOverlayMouseMove);
    canvasOverlay.addEventListener('mouseenter', onCanvasOverlayMouseEnter);
    canvasOverlay.addEventListener('mouseleave', onCanvasOverlayMouseLeave);
    canvasOverlay.addEventListener('wheel', onCanvasOverlayWheel, { passive: true });

    // Register event listeners on the window
    window.addEventListener('action:interrupt', interruptAction);
    window.addEventListener('canvas:refresh', refreshPanel);
    window.addEventListener('canvas:zoom', zoomCanvas);
    window.addEventListener('resize', onWindowResize);
})()