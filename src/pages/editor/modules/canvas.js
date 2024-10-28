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
import {
    hexToRgba,
    isElementVoid,
    styleElement,
} from '../helpers.js';

const rootContainer = document.querySelector('.main-canvas__container');
const topRuler = rootContainer.querySelector('.top-ruler');
const leftRuler = rootContainer.querySelector('.left-ruler');
const canvasContainer = rootContainer.querySelector('.main-container');
const canvasOverlay = rootContainer.querySelector('.main-canvas__overlay');
const mainFrame = rootContainer.querySelector('.main-iframe');

const documentComputedStyle = getComputedStyle(document.documentElement);

const defaultBreakpoints = {
    desktop: 1200, // in pixels
    tablet: 810, // in pixels
    mobile: 390, // in pixels
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

let previousSelectedNode = null; // { node, position, parent }
let selectedBox = null; // HTMLElement

let hoveredElements = []; // array of HTMLElement
let hoveredBox = null; // HTMLElement

// let nodeToDrop;
// let nodeDropGuide;
// let nodeDropTarget;
// let nodeDropPosition;
// let isDropping = false;
// let isDroppingInterrupted = false;

let isPanning = false; // boolean
let panningTimeout = null; // integer

let dragStartPoint = null; // { x, y }
let dragStartMatrix = null; // matrix(a, b, c, d, e, f)
let dragObjectMode = null; // 'free' || 'layout'
let dragTargetObject = null; // HTMLElement
let dragTargetPosition = null; // 'beforebegin' || 'afterbegin' || 'beforeend' || 'afterend'
let dragPointerId = null; // integer
let dragAnimationRequestId = null; // integer
let draggedBox = null; // HTMLElement
let draggingLine = null; // HTMLElement
let isPreparedToDrag = false; // boolean
let isDragging = false; // boolean
let isDraggingInterrupted = false; // boolean
let isDraggingJustDone = false; // boolean

let isResizing = false; // boolean

let isSpacebarBeingPressed = false; // boolean
let isPanelReady = false; // boolean

let mainFrameBoundingRect = null;
let selectedNodeBoundingRect = null;
let selectedNodeParentBoundingRect = null;
let hoveredNodeBoundingRect = null;

const updateRulerSize = () => {
    const containerBoundingRect = mainFrame.parentElement.getBoundingClientRect();
    topRuler.width = containerBoundingRect.width - rulerHeight;
    topRuler.height = rulerHeight;
    leftRuler.width = rulerHeight;
    leftRuler.height = containerBoundingRect.height - rulerHeight;
}

const refreshRulers = () => {
    if (! isPanelReady) {
        updateRulerSize();
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
    mainFrame.style.transform = `translate3d(${marginLeft}px, ${marginLeft}px, 0)`;
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
        mainFrame.style.transform = `translate3d(${newTranslateX}px, ${newTranslateY}px, 0) scale(${newScale}) rotate(${currentRotate}deg)`;
        currentScale = newScale;
        currentTranslateX = newTranslateX;
        currentTranslateY = newTranslateY;
    }

    // // Rotate
    // else if (event.altKey) {
    //     let newRotate = currentRotate + rotateFactor * Math.sign(event.deltaY);
    //     mainFrame.style.transform = `translate3d(${currentTranslateX}px, ${currentTranslateY}px, 0) scale(${currentScale}) rotate(${newRotate}deg)`;
    //     currentRotate = newRotate;
    // }

    // Scroll horizontally
    else if (event.shiftKey) {
        let newTranslateX = currentTranslateX - event.deltaY * scrollFactor / (currentScale >= 1 ? currentScale ** 0.05 : currentScale ** 0.000005);
        mainFrame.style.transform = `translate3d(${newTranslateX}px, ${currentTranslateY}px, 0) scale(${currentScale}) rotate(${currentRotate}deg)`;
        currentTranslateX = newTranslateX;
    }

    // Scroll vertically
    else {
        let newTranslateY = currentTranslateY - event.deltaY * scrollFactor / (currentScale >= 1 ? currentScale ** 0.05 : currentScale ** 0.000005);
        mainFrame.style.transform = `translate3d(${currentTranslateX}px, ${newTranslateY}px, 0) scale(${currentScale}) rotate(${currentRotate}deg)`;
        currentTranslateY = newTranslateY;
    }

    clearTimeout(panningTimeout);
    panningTimeout = setTimeout(() => {
        panningTimeout = null;
        updateSelectedNodeBoundingRect();
        refreshSelectedBox();
        refreshHoveredBox();
        mainFrame.style.willChange = 'unset'; // force repaint
        setTimeout(() => mainFrame.style.willChange = 'transform', 250);
    }, 250);

    refreshRulers();
    refreshSelectedBox();
    refreshHoveredBox();
    refreshDraggedBox();

    mainFrameBoundingRect = mainFrame.getBoundingClientRect();
}

const panCanvas = (dx, dy) => {
    const newTranslateX = currentTranslateX + dx / (currentScale >= 1 ? currentScale ** 0.05 : currentScale ** 0.000005);
    const newTranslateY = currentTranslateY + dy / (currentScale >= 1 ? currentScale ** 0.05 : currentScale ** 0.000005);
    mainFrame.style.transform = `translate3d(${newTranslateX}px, ${newTranslateY}px, 0) scale(${currentScale}) rotate(${currentRotate}deg)`;
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
            mainFrame.style.transform = `translate3d(${newTranslateX}px, ${newTranslateY}px, 0) scale(${newScale}) rotate(${currentRotate}deg)`;
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
            mainFrame.style.transform = `translate3d(${newTranslateX}px, ${newTranslateY}px, 0) scale(${newScale}) rotate(${currentRotate}deg)`;
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
            mainFrame.style.transform = `translate3d(${newTranslateX}px, ${newTranslateY}px, 0) scale(${newScale}) rotate(${currentRotate}deg)`;
            currentScale = newScale;
            currentTranslateX = newTranslateX;
            currentTranslateY = newTranslateY;

            break;

        case 'fit':
            if (defaultBreakpoints.desktop < (containerBoundingRect.width - rulerHeight)) {
                mainFrame.style.transform = `translate3d(${rulerHeight}px, ${rulerHeight}px, 0)`;
            } else {
                const newScale = (containerBoundingRect.width - rulerHeight) / defaultBreakpoints.desktop;
                mainFrame.style.transform = `translate3d(${rulerHeight}px, ${rulerHeight}px, 0) scale(${newScale})`;
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
            mainFrame.style.transform = `translate3d(${newTranslateX}px, ${newTranslateY}px, 0) scale(${newScale}) rotate(${currentRotate}deg)`;
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
        mainFrame.style.willChange = 'unset'; // force repaint
        setTimeout(() => mainFrame.style.willChange = 'transform', 250);
    }, 250);

    refreshRulers();
    refreshSelectedBox();
    refreshHoveredBox();

    mainFrameBoundingRect = mainFrame.getBoundingClientRect();
}

const updateSelectedNodeBoundingRect = () => {
    if (! selectedNode.node) {
        selectedNodeBoundingRect = null;
        selectedNodeParentBoundingRect = null;
        return;
    }

    // Get the bounding rect of the selected node
    selectedNodeBoundingRect = selectedNode.node.getBoundingClientRect();

    // Get the bounding rect of the parent of the selected node
    if (
        selectedNode.parent &&
        ! ('uwIgnore' in selectedNode.parent.dataset)
    ) {
        selectedNodeParentBoundingRect = selectedNode.parent?.getBoundingClientRect();
    } else {
        selectedNodeParentBoundingRect = null;
    }
}

const refreshSelectedBox = () => {
    if (isDragging && dragObjectMode === 'layout') {
        // Hide the hovered box
        selectedBox.classList.add('hidden');
        return;
    }

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
            selectedBox.style.setProperty('--parent-top', `${top - 1}px`);
            selectedBox.style.setProperty('--parent-left', `${left - 1}px`);
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

        //
        const _metadata = metadata[selectedNode.node.dataset.uwId];
        const position = _metadata.properties['position']?.value || 'static';
        if (! ['absolute', 'fixed', 'sticky'].includes(position)) {
            selectedBox.classList.add('is-layout');
        } else {
            selectedBox.classList.remove('is-layout');
        }

        // Show the selected box
        selectedBox.classList.remove('hidden');
    } else {
        // Hide the selected box
        selectedBox.classList.add('hidden');
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

        //
        const _metadata = metadata[hoveredNode.node.dataset.uwId];
        const position = _metadata.properties['position']?.value || 'static';
        if (! ['absolute', 'fixed', 'sticky'].includes(position)) {
            hoveredBox.classList.add('is-layout');
        } else {
            hoveredBox.classList.remove('is-layout');
        }

        // Show the hovered box
        hoveredBox.classList.remove('hidden');
    } else {
        // Hide the hovered box
        hoveredBox.classList.add('hidden');
    }
}

const refreshDraggedBox = () => {
    if (! draggedBox) {
        return;
    }

    if (selectedNodeBoundingRect) {
        // Update the dragged box position and size
        let { left, top, width, height } = selectedNodeBoundingRect;
        left = currentTranslateX + left * currentScale;
        top = currentTranslateY + top * currentScale;
        width = width * currentScale;
        height = height * currentScale;
        draggedBox.style.left = `${left}px`;
        draggedBox.style.top = `${top}px`;
        draggedBox.style.width = `${width}px`;
        draggedBox.style.height = `${height}px`;

        // Show the dragged box
        draggedBox.classList.remove('hidden');
    } else {
        // Hide the dragged box
        draggedBox.classList.add('hidden');
    }
}

const refreshDraggingLine = () => {
    // Skip if there is no hovered nodes
    if (hoveredElements.length == 0) {
        draggingLine.classList.add('hidden');
        dragTargetObject = null;
        dragTargetPosition = null;
        return;
    }

    // Skip if the target element is the same as the selected node
    // or the selected node contains the target element
    if (
        hoveredNode.node === selectedNode.node ||
        selectedNode.node.contains(hoveredNode.node)
    ) {
        draggingLine.classList.add('hidden');
        dragTargetObject = null;
        dragTargetPosition = null;
        return;
    }

    const clientX = (currentPointerX - mainFrameBoundingRect.left) / currentScale;
    const clientY = (currentPointerY - mainFrameBoundingRect.top) / currentScale;

    // Get the bounding rect of the hovered node
    dragTargetObject = hoveredNode.node;
    hoveredNodeBoundingRect = hoveredNode.node.getBoundingClientRect();

    // Initialize the position and size of the dragging line
    let left = currentTranslateX + hoveredNodeBoundingRect.left * currentScale;
    let top = currentTranslateY + hoveredNodeBoundingRect.top * currentScale;
    let width = hoveredNodeBoundingRect.width * currentScale;
    let height = hoveredNodeBoundingRect.height * currentScale;

    // Set default position of the dragging line
    dragTargetPosition = 'afterbegin';

    // Find out the layout direction of the container
    const containerStyle = window.getComputedStyle(hoveredNode.parent);
    const containerLayoutDirection = containerStyle.flexDirection || container.gridAutoFlow || 'column';

    // If the container layout direction is left-to-right
    if (containerLayoutDirection.startsWith('row')) {
        // If the mouse position 1/2 of the width from the left of hovered element,
        // indicate the target position before hovered element
        if (clientX < hoveredNodeBoundingRect.left + hoveredNodeBoundingRect.width / 2) {
            dragTargetPosition = 'beforebegin';
        }
        // If the mouse position 1/2 of the width from the right of hovered element,
        // indicate the target position after hovered element
        if (clientX > hoveredNodeBoundingRect.left + hoveredNodeBoundingRect.width * 1 / 2) {
            dragTargetPosition = 'afterend';
            left = left + width - 2;
        }
        width = 2;
    }

    // If the container layout direction is top-to-bottom
    if (containerLayoutDirection.startsWith('column')) {
        // If the mouse position 1/2 of the height from the top of hovered element,
        // indicate the target position before hovered element
        if (clientY < hoveredNodeBoundingRect.top + hoveredNodeBoundingRect.height / 2) {
            dragTargetPosition = 'beforebegin';
        }
        // If the mouse position 1/2 of the height from the bottom of hovered element,
        // indicate the target position after hovered element
        if (clientY > hoveredNodeBoundingRect.top + hoveredNodeBoundingRect.height * 1 / 2) {
            dragTargetPosition = 'afterend';
            top = top + height - 2;
        }
        height = 2;
    }

    // If hovered element is a container and it has no child elements,
    // indicate the target position as the first child of hovered element
    if (
        ! isElementVoid(hoveredNode.node) &&
        ! [...hoveredNode.node.childNodes].some(child =>
            ! child.hasAttribute?.('data-uw-ignore') &&
            (child.nodeType === Node.ELEMENT_NODE || child.textContent.trim())
        )
    ) {
        dragTargetPosition = 'afterbegin';
        left = currentTranslateX + hoveredNodeBoundingRect.left * currentScale;
        top = currentTranslateY + hoveredNodeBoundingRect.top * currentScale;
        width = hoveredNodeBoundingRect.width * currentScale;
        height = hoveredNodeBoundingRect.height * currentScale;
    }

    // Update the dragging line position and size
    draggingLine.style.left = `${left}px`;
    draggingLine.style.top = `${top}px`;
    draggingLine.style.width = `${width}px`;
    draggingLine.style.height = `${height}px`;

    // Show the dragging line
    draggingLine.classList.remove('hidden');
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
        if (! (
            event.which === 3 && // right mouse button
            selectedNode.node
        )) {
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
        }
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

    if (selectedNode.node !== hoveredNode.node) {
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

    if (event.which === 3) { // right mouse button
        if (! selectedNode.node) {
            setSelectedNode(hoveredNode.node, hoveredNode.position, hoveredNode.parent);
        }
        onHoveredBoxContextMenu(event);
    }
}

const onHoveredBoxMouseDown = (event) => {
    if (event.which === 1) { // left mouse button
        // Skip if the hovered node is HTML or body
        // TODO: implement marquee selection, but add support for multiple selection first
        if (['html', 'body'].includes(hoveredNode.node.tagName.toLowerCase())) {
            return;
        }

        // Specify the drag object mode
        const _metadata = metadata[hoveredNode.node.dataset.uwId];
        const position = _metadata.properties['position']?.value || 'static';
        dragObjectMode = ['absolute', 'fixed', 'sticky'].includes(position) ? 'free' : 'layout';

        // Flag to start dragging
        dragStartPoint = { x: event.clientX, y: event.clientY };
        isPreparedToDrag = true;

        return;
    }
}

const onHoveredBoxContextMenu = (event) => {
    event.preventDefault();

    const parentDisplay = selectedNode.parent
        ? window?.getComputedStyle(selectedNode.parent).display
        : 'block';

    const stylePosition = selectedNode.node.dataset?.uwId
        ? window.getComputedStyle(selectedNode.node).position
        : 'static';

    let hasPreviousSibling = true;
    let previousSibling = selectedNode.node.previousSibling;
    while (
        previousSibling &&
        (
            (
                previousSibling.nodeType !== Node.ELEMENT_NODE &&
                previousSibling.textContent?.trim() === ''
            ) ||
            'uwIgnore' in (previousSibling.dataset || [])
        )
    ) {
        previousSibling = previousSibling.previousSibling;
    }
    if (! previousSibling) {
        hasPreviousSibling = false;
    }

    let hasNextSibling = true;
    let nextSibling = selectedNode.node.nextSibling;
    while (
        nextSibling &&
        (
            (
                nextSibling.nodeType !== Node.ELEMENT_NODE &&
                nextSibling.textContent.trim() === ''
            ) ||
            'uwIgnore' in (nextSibling.dataset || [])
        )
    ) {
        nextSibling = nextSibling.nextSibling;
    }
    if (! nextSibling) {
        hasNextSibling = false;
    }

    // Prepare the request to show the context menu
    const customEvent = new MouseEvent('contextmenu:show', event);
    customEvent.uwTarget = 'canvas';
    customEvent.uwMenu = [
        {
            group: true,
            id: 'select-same',
            label: 'Select Same',
            for: [
                'select-same-color', 'select-same-bgcolor', 'select-same-brcolor', 'select-same-brstyle',
                'select-same-border', 'select-same-olcolor', 'select-same-olstyle', 'select-same-outline',
                'select-same-elabel', 'select-same-etag', 'select-same-colortag',
            ],
        },
        {
            id: 'select-same-color',
            label: 'Color',
            action: () => {
                // Request to select the elements with the same color
                window.dispatchEvent(new CustomEvent('element:select-same-color'));
            },
            disabled:
                ! selectedNode.node.dataset.uwId ||
                ['html', 'head'].includes(selectedNode.node.tagName.toLowerCase()) ||
                apiSchema.htmlElements
                    .find(element => element.tag === selectedNode.node.tagName.toLowerCase())
                    .categories
                    .includes('metadata'),
            belongs: 'select-same',
        },
        {
            id: 'select-same-bgcolor',
            label: 'Background Color',
            action: () => {
                // Request to select the elements with the same background color
                window.dispatchEvent(new CustomEvent('element:select-same-bgcolor'));
            },
            disabled:
                ! selectedNode.node.dataset.uwId ||
                ['html', 'head'].includes(selectedNode.node.tagName.toLowerCase()) ||
                apiSchema.htmlElements
                    .find(element => element.tag === selectedNode.node.tagName.toLowerCase())
                    .categories
                    .includes('metadata'),
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
            disabled:
                ! selectedNode.node.dataset.uwId ||
                ['html', 'head'].includes(selectedNode.node.tagName.toLowerCase()) ||
                apiSchema.htmlElements
                    .find(element => element.tag === selectedNode.node.tagName.toLowerCase())
                    .categories
                    .includes('metadata'),
            belongs: 'select-same',
        },
        {
            id: 'select-same-brstyle',
            label: 'Border Style',
            action: () => {
                // Request to select the elements with the same border style
                window.dispatchEvent(new CustomEvent('element:select-same-brstyle'));
            },
            disabled:
                ! selectedNode.node.dataset.uwId ||
                ['html', 'head'].includes(selectedNode.node.tagName.toLowerCase()) ||
                apiSchema.htmlElements
                    .find(element => element.tag === selectedNode.node.tagName.toLowerCase())
                    .categories
                    .includes('metadata'),
            belongs: 'select-same',
        },
        {
            id: 'select-same-border',
            label: 'Border',
            action: () => {
                // Request to select the elements with the same border
                window.dispatchEvent(new CustomEvent('element:select-same-border'));
            },
            disabled:
                ! selectedNode.node.dataset.uwId ||
                ['html', 'head'].includes(selectedNode.node.tagName.toLowerCase()) ||
                apiSchema.htmlElements
                    .find(element => element.tag === selectedNode.node.tagName.toLowerCase())
                    .categories
                    .includes('metadata'),
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
            disabled:
                ! selectedNode.node.dataset.uwId ||
                ['html', 'head'].includes(selectedNode.node.tagName.toLowerCase()) ||
                apiSchema.htmlElements
                    .find(element => element.tag === selectedNode.node.tagName.toLowerCase())
                    .categories
                    .includes('metadata'),
            belongs: 'select-same',
        },
        {
            id: 'select-same-olstyle',
            label: 'Outline Style',
            action: () => {
                // Request to select the elements with the same outline style
                window.dispatchEvent(new CustomEvent('element:select-same-olstyle'));
            },
            disabled:
                ! selectedNode.node.dataset.uwId ||
                ['html', 'head'].includes(selectedNode.node.tagName.toLowerCase()) ||
                apiSchema.htmlElements
                    .find(element => element.tag === selectedNode.node.tagName.toLowerCase())
                    .categories
                    .includes('metadata'),
            belongs: 'select-same',
        },
        {
            id: 'select-same-outline',
            label: 'Outline',
            action: () => {
                // Request to select the elements with the same outline
                window.dispatchEvent(new CustomEvent('element:select-same-outline'));
            },
            disabled:
                ! selectedNode.node.dataset.uwId ||
                ['html', 'head'].includes(selectedNode.node.tagName.toLowerCase()) ||
                apiSchema.htmlElements
                    .find(element => element.tag === selectedNode.node.tagName.toLowerCase())
                    .categories
                    .includes('metadata'),
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
            disabled:
                ! selectedNode.node.dataset.uwId ||
                ['html', 'head'].includes(selectedNode.node.tagName.toLowerCase()) ||
                apiSchema.htmlElements
                    .find(element => element.tag === selectedNode.node.tagName.toLowerCase())
                    .categories
                    .includes('metadata'),
            belongs: 'select-same',
        },
        {
            id: 'select-same-etag',
            label: 'Element Tag',
            action: () => {
                // Request to select the elements with the same element tag
                window.dispatchEvent(new CustomEvent('element:select-same-etag'));
            },
            disabled:
                ! selectedNode.node.dataset.uwId ||
                ['html', 'head'].includes(selectedNode.node.tagName.toLowerCase()) ||
                apiSchema.htmlElements
                    .find(element => element.tag === selectedNode.node.tagName.toLowerCase())
                    .categories
                    .includes('metadata'),
            belongs: 'select-same',
        },
        {
            id: 'select-same-colortag',
            label: 'Color Tag',
            action: () => {
                // Request to select the elements with the same color tag
                window.dispatchEvent(new CustomEvent('element:select-same-colortag'));
            },
            disabled:
                ! selectedNode.node.dataset.uwId ||
                ['html', 'head'].includes(selectedNode.node.tagName.toLowerCase()) ||
                apiSchema.htmlElements
                    .find(element => element.tag === selectedNode.node.tagName.toLowerCase())
                    .categories
                    .includes('metadata'),
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
            disabled: ['html', 'head', 'body'].includes(selectedNode.node.tagName.toLowerCase()),
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
            disabled: ['html', 'head', 'body'].includes(selectedNode.node.tagName.toLowerCase()),
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
            disabled: selectedNode.node.tagName === 'html',
            shortcut: 'Ctrl+V',
        },
        {
            group: true,
            id: 'paste-special',
            label: 'Paste Special',
            for: [
                'paste-text-content', 'paste-inner-html', 'paste-outer-html', 'paste-style', 'paste-size', 'paste-width',
                'paste-height', 'paste-size-separately', 'paste-width-separately', 'paste-height-separately',
            ],
        },
        {
            id: 'paste-text-content',
            label: 'Paste Text Content',
            action: () => {
                // Request to paste the text content of the element
                window.dispatchEvent(new CustomEvent('element:paste-text-content'));
            },
            disabled:
                selectedNode.node.tagName === 'html' ||
                ! selectedNode.node.dataset.uwId,
            belongs: 'paste-special',
        },
        {
            id: 'paste-inner-html',
            label: 'Paste Inner HTML',
            action: () => {
                // Request to paste the inner HTML of the element
                window.dispatchEvent(new CustomEvent('element:paste-inner-html'));
            },
            disabled:
                ['html', 'head'].includes(selectedNode.node.tagName.toLowerCase()) ||
                ! selectedNode.node.dataset.uwId,
            belongs: 'paste-special',
        },
        {
            id: 'paste-outer-html',
            label: 'Paste Outer HTML',
            action: () => {
                // Request to paste the outer HTML of the element
                window.dispatchEvent(new CustomEvent('element:paste-outer-html'));
            },
            disabled:
                ['html', 'head'].includes(selectedNode.node.tagName.toLowerCase()) ||
                ! selectedNode.node.dataset.uwId,
            belongs: 'paste-special',
        },
        {
            id: 'paste-style',
            label: 'Paste Style',
            action: () => {
                // Request to paste the style of the element
                window.dispatchEvent(new CustomEvent('element:paste-style'));
            },
            disabled:
                ! selectedNode.node.dataset.uwId ||
                ['html', 'head'].includes(selectedNode.node.tagName.toLowerCase()) ||
                apiSchema.htmlElements
                    .find(element => element.tag === selectedNode.node.tagName.toLowerCase())
                    .categories
                    .includes('metadata'),
            belongs: 'paste-special',
        },
        {
            spacer: true,
            for: [
                'paste-size', 'paste-width', 'paste-height', 'paste-size-separately',
                'paste-width-separately', 'paste-height-separately',
            ],
            belongs: 'paste-special',
        },
        {
            id: 'paste-size',
            label: 'Paste Size',
            action: () => {
                // Request to paste the size of the element
                window.dispatchEvent(new CustomEvent('element:paste-size'));
            },
            disabled:
                ! selectedNode.node.dataset.uwId ||
                ['html', 'head'].includes(selectedNode.node.tagName.toLowerCase()) ||
                apiSchema.htmlElements
                    .find(element => element.tag === selectedNode.node.tagName.toLowerCase())
                    .categories
                    .includes('metadata'),
            belongs: 'paste-special',
        },
        {
            id: 'paste-width',
            label: 'Paste Width',
            action: () => {
                // Request to paste the width of the element
                window.dispatchEvent(new CustomEvent('element:paste-width'));
            },
            disabled:
                ! selectedNode.node.dataset.uwId ||
                ['html', 'head'].includes(selectedNode.node.tagName.toLowerCase()) ||
                apiSchema.htmlElements
                    .find(element => element.tag === selectedNode.node.tagName.toLowerCase())
                    .categories
                    .includes('metadata'),
            belongs: 'paste-special',
        },
        {
            id: 'paste-height',
            label: 'Paste Height',
            action: () => {
                // Request to paste the height of the element
                window.dispatchEvent(new CustomEvent('element:paste-height'));
            },
            disabled:
                ! selectedNode.node.dataset.uwId ||
                ['html', 'head'].includes(selectedNode.node.tagName.toLowerCase()) ||
                apiSchema.htmlElements
                    .find(element => element.tag === selectedNode.node.tagName.toLowerCase())
                    .categories
                    .includes('metadata'),
            belongs: 'paste-special',
        },
        {
            id: 'paste-size-separately',
            label: 'Paste Size Separately',
            action: () => {
                // Request to paste the size of the element separately
                window.dispatchEvent(new CustomEvent('element:paste-size-separately'));
            },
            disabled:
                ! selectedNode.node.dataset.uwId ||
                ['html', 'head'].includes(selectedNode.node.tagName.toLowerCase()) ||
                apiSchema.htmlElements
                    .find(element => element.tag === selectedNode.node.tagName.toLowerCase())
                    .categories
                    .includes('metadata'),
            belongs: 'paste-special',
        },
        {
            id: 'paste-width-separately',
            label: 'Paste Width Separately',
            action: () => {
                // Request to paste the width of the element separately
                window.dispatchEvent(new CustomEvent('element:paste-width-separately'));
            },
            disabled:
                ! selectedNode.node.dataset.uwId ||
                ['html', 'head'].includes(selectedNode.node.tagName.toLowerCase()) ||
                apiSchema.htmlElements
                    .find(element => element.tag === selectedNode.node.tagName.toLowerCase())
                    .categories
                    .includes('metadata'),
            belongs: 'paste-special',
        },
        {
            id: 'paste-height-separately',
            label: 'Paste Height Separately',
            action: () => {
                // Request to paste the height of the element separately
                window.dispatchEvent(new CustomEvent('element:paste-height-separately'));
            },
            disabled:
                ! selectedNode.node.dataset.uwId ||
                ['html', 'head'].includes(selectedNode.node.tagName.toLowerCase()) ||
                apiSchema.htmlElements
                    .find(element => element.tag === selectedNode.node.tagName.toLowerCase())
                    .categories
                    .includes('metadata'),
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
            disabled:
                ['html', 'head', 'body'].includes(selectedNode.node.tagName.toLowerCase()) ||
                ! selectedNode.node.dataset.uwId,
            belongs: 'paste-special',
        },
        {
            id: 'paste-after',
            label: 'Paste After',
            action: () => {
                // Request to paste the element after the element
                window.dispatchEvent(new CustomEvent('element:paste-after'));
            },
            disabled:
                ['html', 'head', 'body'].includes(selectedNode.node.tagName.toLowerCase()) ||
                ! selectedNode.node.dataset.uwId,
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
            disabled:
                selectedNode.node.tagName === 'html' ||
                ! selectedNode.node.dataset.uwId,
            belongs: 'paste-special',
        },
        {
            id: 'paste-last-child',
            label: 'Paste Last Child',
            action: () => {
                // Request to paste the element as the last child of the element
                window.dispatchEvent(new CustomEvent('element:paste-last-child'));
            },
            disabled:
                selectedNode.node.tagName === 'html' ||
                ! selectedNode.node.dataset.uwId,
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
            disabled: ['html', 'head', 'body'].includes(selectedNode.node.tagName.toLowerCase()),
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
            disabled: ['html', 'head', 'body'].includes(selectedNode.node.tagName.toLowerCase()),
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
            disabled:
                ['html', 'head', 'body'].includes(selectedNode.node.tagName.toLowerCase()) ||
                ! selectedNode.node.dataset.uwId,
            belongs: 'clone',
        },
        {
            id: 'unlink-clone',
            label: 'Unlink Clone',
            action: () => {
                // Request to unlink a clone of the element
                window.dispatchEvent(new CustomEvent('element:unlink-clone'));
            },
            disabled:
                // TODO: disable if the element is not a clone
                ['html', 'head', 'body'].includes(selectedNode.node.tagName.toLowerCase()) ||
                ! selectedNode.node.dataset.uwId,
            belongs: 'clone',
        },
        {
            id: 'select-original-clone',
            label: 'Select Original Clone',
            action: () => {
                // Request to select the original clone of the element
                window.dispatchEvent(new CustomEvent('element:select-original-clone'));
            },
            disabled:
                // TODO: disable if the element is not a clone
                ['html', 'head', 'body'].includes(selectedNode.node.tagName.toLowerCase()) ||
                ! selectedNode.node.dataset.uwId,
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
            disabled: ['html', 'head', 'body'].includes(selectedNode.node.tagName.toLowerCase()),
        },
        {
            id: 'unwrap',
            label: 'Unwrap',
            action: () => {
                // Request to unwrap the element
                window.dispatchEvent(new CustomEvent('element:unwrap'));
            },
            disabled: ['html', 'head', 'body'].includes(selectedNode.node.tagName.toLowerCase()),
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
            disabled: ['html', 'head', 'body'].includes(selectedNode.node.tagName.toLowerCase()),
            belongs: 'insert',
        },
        {
            id: 'insert-after',
            label: 'Insert After...',
            action: () => {
                // Request to insert an element after the element
                window.dispatchEvent(new CustomEvent('element:insert-after'));
            },
            disabled: ['html', 'head', 'body'].includes(selectedNode.node.tagName.toLowerCase()),
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
            disabled:
                selectedNode.node.tagName === 'html' ||
                ! selectedNode.node.dataset.uwId,
            belongs: 'insert',
        },
        {
            id: 'insert-last-child',
            label: 'Insert Last Child...',
            action: () => {
                // Request to insert an element as the last child of the element
                window.dispatchEvent(new CustomEvent('element:insert-last-child'));
            },
            disabled:
                selectedNode.node.tagName === 'html' ||
                ! selectedNode.node.dataset.uwId,
            belongs: 'insert',
        },
        {
            id: 'convert-to',
            label: 'Convert to...',
            action: () => {
                // Request to convert the element to another element
                window.dispatchEvent(new CustomEvent('element:convert-to'));
            },
            disabled: ['html', 'head', 'body'].includes(selectedNode.node.tagName.toLowerCase()),
        },
        {
            spacer: true,
            for: [
                'move-to-top-tree', 'move-to-bottom-tree', 'move-up-tree', 'move-down-tree', 'outdent-up', 'outdent-down',
                'indent-up', 'indent-down', 'align-left', 'align-center', 'align-right', 'align-top',
                'align-middle', 'align-bottom', 'rotate-left', 'rotate-right', 'flip-horizontal', 'flip-vertical',
            ]
        },
        {
            group: true,
            id: 'move',
            label: 'Move',
            for: [
                'move-to-top-tree', 'move-to-bottom-tree', 'move-up-tree', 'move-down-tree',
                'outdent-up', 'outdent-down', 'indent-up', 'indent-down',
            ],
        },
        {
            id: 'move-to-top-tree',
            label: ['absolute', 'fixed'].includes(stylePosition) ? 'Move to Back' : 'Move to Top',
            action: () => {
                // Request to move the element to the top
                window.dispatchEvent(new CustomEvent('element:move-to-top'));
            },
            disabled:
                ['html', 'head', 'body'].includes(selectedNode.node.tagName.toLowerCase()) ||
                ! hasPreviousSibling,
            belongs: 'move',
        },
        {
            id: 'move-up-tree',
            label: ['absolute', 'fixed'].includes(stylePosition) ? 'Move Backward' : 'Move Up',
            action: () => {
                // Request to move the element up
                window.dispatchEvent(new CustomEvent('element:move-up'));
            },
            disabled:
                ['html', 'head', 'body'].includes(selectedNode.node.tagName.toLowerCase()) ||
                ! hasPreviousSibling,
            belongs: 'move',
        },
        {
            id: 'move-down-tree',
            label: ['absolute', 'fixed'].includes(stylePosition) ? 'Move Forward' : 'Move Down',
            action: () => {
                // Request to move the element down
                window.dispatchEvent(new CustomEvent('element:move-down'));
            },
            disabled:
                ['html', 'head', 'body'].includes(selectedNode.node.tagName.toLowerCase()) ||
                ! hasNextSibling,
            belongs: 'move',
        },
        {
            id: 'move-to-bottom-tree',
            label: ['absolute', 'fixed'].includes(stylePosition) ? 'Move to Front' : 'Move to Bottom',
            action: () => {
                // Request to move the element to bottom
                window.dispatchEvent(new CustomEvent('element:move-to-bottom'));
            },
            disabled:
                ['html', 'head', 'body'].includes(selectedNode.node.tagName.toLowerCase()) ||
                ! hasNextSibling,
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
                ['html', 'head', 'body', 'meta', 'title', 'link', 'base'].includes(selectedNode.node.tagName.toLowerCase()) ||
                ['head', 'body'].includes(selectedNode.parent.tagName.toLowerCase()),
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
                ['html', 'head', 'body', 'meta', 'title', 'link', 'base'].includes(selectedNode.node.tagName.toLowerCase()) ||
                ['head', 'body'].includes(selectedNode.parent.tagName.toLowerCase()),
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
                ['html', 'head', 'body', 'meta', 'title', 'link', 'base'].includes(selectedNode.node.tagName.toLowerCase()) ||
                ! selectedNode.node.previousElementSibling ||
                (
                    selectedNode.node.previousElementSibling &&
                    apiSchema.htmlElements.find(element => element.tag === selectedNode.node.previousElementSibling.tagName.toLowerCase()).categories.includes('void')
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
                ['html', 'head', 'body', 'meta', 'title', 'link', 'base'].includes(selectedNode.node.tagName.toLowerCase()) ||
                ! selectedNode.node.nextElementSibling ||
                (
                    selectedNode.node.nextElementSibling &&
                    apiSchema.htmlElements
                        .find(element => element.tag === selectedNode.node.nextElementSibling.tagName.toLowerCase())
                        .categories
                        .includes('void')
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
            disabled:
                ! selectedNode.node.dataset.uwId ||
                ['absolute', 'fixed'].includes(stylePosition) ||
                ! ['flex', 'grid'].includes(parentDisplay),
            belongs: 'align',
        },
        {
            id: 'align-center',
            label: 'Align Center',
            action: () => {
                // Request to align the element to the center
                window.dispatchEvent(new CustomEvent('element:align-center'));
            },
            disabled:
                ! selectedNode.node.dataset.uwId ||
                ['absolute', 'fixed'].includes(stylePosition) ||
                ! ['flex', 'grid'].includes(parentDisplay),
            belongs: 'align',
        },
        {
            id: 'align-right',
            label: 'Align Right',
            action: () => {
                // Request to align the element to the right
                window.dispatchEvent(new CustomEvent('element:align-right'));
            },
            disabled:
                ! selectedNode.node.dataset.uwId ||
                ['absolute', 'fixed'].includes(stylePosition) ||
                ! ['flex', 'grid'].includes(parentDisplay),
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
            disabled:
                ! selectedNode.node.dataset.uwId ||
                ['absolute', 'fixed'].includes(stylePosition) ||
                ! ['flex', 'grid'].includes(parentDisplay),
            belongs: 'align',
        },
        {
            id: 'align-middle',
            label: 'Align Middle',
            action: () => {
                // Request to align the element to the middle
                window.dispatchEvent(new CustomEvent('element:align-middle'));
            },
            disabled:
                ! selectedNode.node.dataset.uwId ||
                ['absolute', 'fixed'].includes(stylePosition) ||
                ! ['flex', 'grid'].includes(parentDisplay),
            belongs: 'align',
        },
        {
            id: 'align-bottom',
            label: 'Align Bottom',
            action: () => {
                // Request to align the element to the bottom
                window.dispatchEvent(new CustomEvent('element:align-bottom'));
            },
            disabled:
                ! selectedNode.node.dataset.uwId ||
                ['absolute', 'fixed'].includes(stylePosition) ||
                ! ['flex', 'grid'].includes(parentDisplay),
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
            disabled:
                ! selectedNode.node.dataset.uwId ||
                ['html', 'head'].includes(selectedNode.node.tagName.toLowerCase()) ||
                apiSchema.htmlElements
                    .find(element => element.tag === selectedNode.node.tagName.toLowerCase())
                    .categories
                    .includes('metadata'),
            belongs: 'transform',
        },
        {
            id: 'rotate-right',
            label: 'Rotate Right',
            action: () => {
                // Request to rotate the element to the right
                window.dispatchEvent(new CustomEvent('element:rotate-right'));
            },
            disabled:
                ! selectedNode.node.dataset.uwId ||
                ['html', 'head'].includes(selectedNode.node.tagName.toLowerCase()) ||
                apiSchema.htmlElements
                    .find(element => element.tag === selectedNode.node.tagName.toLowerCase())
                    .categories
                    .includes('metadata'),
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
            disabled:
                ! selectedNode.node.dataset.uwId ||
                ['html', 'head'].includes(selectedNode.node.tagName.toLowerCase()) ||
                apiSchema.htmlElements
                    .find(element => element.tag === selectedNode.node.tagName.toLowerCase())
                    .categories
                    .includes('metadata'),
            belongs: 'transform',
        },
        {
            id: 'flip-vertical',
            label: 'Flip Vertical',
            action: () => {
                // Request to flip the element vertically
                window.dispatchEvent(new CustomEvent('element:flip-vertical'));
            },
            disabled:
                ! selectedNode.node.dataset.uwId ||
                ['html', 'head'].includes(selectedNode.node.tagName.toLowerCase()) ||
                apiSchema.htmlElements
                    .find(element => element.tag === selectedNode.node.tagName.toLowerCase())
                    .categories
                    .includes('metadata'),
            belongs: 'transform',
        },
        {
            spacer: true,
            for: ['edit-text'],
        },
        {
            id: 'edit-text',
            label: 'Edit Text...',
            icon: 'edit',
            action: () => onListItemDoubleClick(event),
            disabled: selectedNode.node.dataset.uwId,
        },
    ];

    // Add custom context menu item for select parent element
    const parentElements = [];
    let parent = selectedNode.node.parentElement;
    while (parent) {
        parentElements.push({
            uwId: parent.dataset.uwId,
            uwPosition: parent.parentElement ? Array.prototype.indexOf.call(parent.parentElement.childNodes, parent) : '',
            uwParentId: parent.parentElement?.dataset.uwId || '',
            label: metadata[parent.dataset.uwId].label,
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
            disabled: selectedNode.node.tagName === 'html',
        },
        ...Array(parentElements.length).fill(null).map((_, index) => ({
            id: `select-parent-${index}`,
            label: parentElements[index].label,
            icon: 'box',
            action: () => {
                // Request to select the parent element
                window.dispatchEvent(new CustomEvent('element:select', {
                    detail: {
                        uwId: parentElements[index].uwId,
                        uwPosition: parentElements[index].uwPosition,
                        uwParentId: parentElements[index].uwParentId,
                        target: 'canvas',
                    }
                }));
            },
            belongs: 'select-parent',
        })),
        ...customEvent.uwMenu,
    ];

    // Dispatch the custom event to show the context menu
    window.dispatchEvent(customEvent);

    event.stopImmediatePropagation();
}

const findHoveredElements = (event, force = false) => {
    // Skip if the left mouse button is pressed
    // to prevent selecting another element when hiding the context menu
    if (! force && event.which === 1) {
        return;
    }

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

        // Do not change the hovered element if the selected node is under the pointer
        if (event.altKey && hoveredElements.includes(selectedNode.node)) {
            setHoveredNode(
                selectedNode.node,
                selectedNode.parent
                    ? Array.prototype.indexOf.call(selectedNode.parent.childNodes, selectedNode.node)
                    : null,
                selectedNode.parent,
            );

            //
            hoveredNodeBoundingRect = selectedNodeBoundingRect;
            refreshHoveredBox();

            return;
        }

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

const interruptAction = () => {
    if (isDragging) {
        // Flag to interrupt dragging
        dragStartPoint = null;
        isDragging = false;
        isDraggingInterrupted = true;
        canvasOverlay.releasePointerCapture(dragPointerId);

        if (dragObjectMode === 'free') {
            // Reset the transformation of the selected node
            styleElement(selectedNode.node, 'transform', dragStartMatrix.toString(), true);

            // Reset the property value
            const _metadata = metadata[selectedNode.node.dataset.uwId];
            _metadata.properties['transform'] = { value: dragStartMatrix.toString(), checked: true };
            setMetadata(selectedNode.node.dataset.uwId, _metadata);

            // Reset the dragging matrix
            dragStartMatrix = null;
        }

        if (dragObjectMode === 'layout') {
            // Remove the dragged box
            draggedBox.remove();
            draggedBox = null;

            // Remove the dragging line
            draggingLine.remove();
            draggingLine = null;

            // Reset the dragging target and position
            dragTargetObject = null;
            dragTargetPosition = null;
        }

        // Reset the selected box
        updateSelectedNodeBoundingRect();
        refreshSelectedBox();

        // Reset the hovered box
        hoveredNodeBoundingRect = null;
        setHoveredNode(null);

        refreshRulers();

        return;
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

        //
        console.log(`[Editor] Move element: @${selectedNode.node.dataset.uwId}${event.shiftKey ? ' (constrained)' : ''}`);

        if (dragObjectMode === 'free') {
            // Request to save the action
            const previousState = {
                style: { transform: dragStartMatrix.toString() },
            };
            const upcomingState = {
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
        }

        if (dragObjectMode === 'layout') {
            if (dragTargetObject) {
                // Save the current action state
                const previousState = {
                    container: selectedNode.parent,
                    position: selectedNode.position,
                };

                // Move the selected element to the target position
                dragTargetObject.insertAdjacentElement(dragTargetPosition, selectedNode.node);

                // Update the selected node
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
                        title: 'element:move',
                        previous: previousState,
                        upcoming: upcomingState,
                        reference: actionContext,
                    }
                }));

                // Request panel updates
                window.dispatchEvent(new CustomEvent('outline:refresh'));
            }

            // Remove the dragged box
            draggedBox.remove();
            draggedBox = null;

            // Remove the dragging line
            draggingLine.remove();
            draggingLine = null;

            // Reset the dragging target and position
            dragTargetObject = null;
            dragTargetPosition = null;
        }

        // Update the main frame size
        adjustMainFrameSize();

        // Show the selected parent box
        updateSelectedNodeBoundingRect();
        refreshSelectedBox();

        // Show the hovered box
        setHoveredNode(selectedNode.node, selectedNode.position, selectedNode.parent);
        hoveredNodeBoundingRect = selectedNodeBoundingRect;
        refreshHoveredBox();

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

    if (isDraggingInterrupted) {
        isDraggingInterrupted = false;
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

            if (dragObjectMode === 'free') {
                // Re-calculate the dragging start point
                dragStartPoint = {
                    x: (dragStartPoint.x - mainFrameBoundingRect.left) / currentScale,
                    y: (dragStartPoint.y - mainFrameBoundingRect.top) / currentScale,
                };

                // Get the current transformation matrix
                dragStartMatrix = new DOMMatrix(metadata[selectedNode.node.dataset.uwId].properties.transform?.value || 'matrix(1, 0, 0, 1, 0, 0)');
            }

            if (dragObjectMode === 'layout') {
                // Create a dragging box element to indicate the element being dragged
                draggedBox = document.createElement('div');
                draggedBox.setAttribute('data-uw-ignore', '');
                draggedBox.classList.add('dragged-box', 'hidden');
                canvasOverlay.appendChild(draggedBox);
                refreshDraggedBox();

                // Create a dragging line overlay element to show the position
                // where the dragged element will be placed
                draggingLine = document.createElement('div');
                draggingLine.setAttribute('data-uw-ignore', '');
                draggingLine.classList.add('dragging-line', 'hidden');
                canvasOverlay.appendChild(draggingLine);

                // Hide the selected box
                refreshSelectedBox();
            }

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
                    const speedFactor = 1 / 10;
                    if (
                        currentPointerX < canvasOverlayRect.left ||
                        currentPointerX > canvasOverlayRect.right
                    ) {
                        const distanceX = currentPointerX - lastPointerX;
                        panCanvas(-distanceX * speedFactor, 0);
                    }
                    if (
                        currentPointerY < canvasOverlayRect.top ||
                        currentPointerY > canvasOverlayRect.bottom
                    ) {
                        const distanceY = currentPointerY - lastPointerY;
                        panCanvas(0, -distanceY * speedFactor);
                    }
                    dragAnimationRequestId = requestAnimationFrame(continueDragging);
                    const clientX = (currentPointerX - mainFrameBoundingRect.left) / currentScale;
                    const clientY = (currentPointerY - mainFrameBoundingRect.top) / currentScale;
                    if (dragObjectMode === 'free') {
                        moveSelectedNode(clientX, clientY, event.shiftKey);
                    }
                    if (dragObjectMode === 'layout') {
                        refreshDraggedBox();
                        findHoveredElements(event, true);
                        hoveredNodeBoundingRect = hoveredNode.node?.getBoundingClientRect();
                        refreshDraggingLine();
                        refreshHoveredBox();
                    }
                };
                dragAnimationRequestId = requestAnimationFrame(continueDragging);
                return;
            }
        }

        const clientX = (event.clientX - mainFrameBoundingRect.left) / currentScale;
        const clientY = (event.clientY - mainFrameBoundingRect.top) / currentScale;
        if (dragObjectMode === 'free') {
            moveSelectedNode(clientX, clientY, event.shiftKey);
        }
        if (dragObjectMode === 'layout') {
            findHoveredElements(event, true);
            hoveredNodeBoundingRect = hoveredNode.node?.getBoundingClientRect();
            refreshDraggingLine();
            refreshHoveredBox();
        }

        return;
    }

    if (isDraggingJustDone) {
        isDraggingJustDone = false;
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

const onCanvasOverlayContextMenu = (event) => {
    event.preventDefault();

    // Prepare the request to show the context menu
    const customEvent = new MouseEvent('contextmenu:show', event);
    customEvent.uwTarget = 'canvas';
    customEvent.uwMenu = [
        {
            id: 'paste',
            label: 'Paste',
            icon: 'paste',
            action: () => {
                // Request to paste the element
                window.dispatchEvent(new CustomEvent('element:paste'));
            },
            shortcut: 'Ctrl+V',
        },
    ];

    // Dispatch the custom event to show the context menu
    window.dispatchEvent(customEvent);
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

    updateRulerSize();
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
    canvasOverlay.addEventListener('contextmenu', onCanvasOverlayContextMenu);

    // Register event listeners on the window
    window.addEventListener('action:interrupt', interruptAction);
    window.addEventListener('canvas:refresh', refreshPanel);
    window.addEventListener('canvas:zoom', zoomCanvas);
    window.addEventListener('contextmenu:hide', findHoveredElements);
    window.addEventListener('resize', onWindowResize);
})()