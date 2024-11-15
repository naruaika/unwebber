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
    isElementTextable,
    isElementVoid,
    styleElement,
} from '../helpers.js';
import { getGridCheckState, getSnapCheckState } from './controlbar.js';
import { getSpaceKeyState, getShiftKeyState } from './keyboard-shortcut.js';

const rootContainer = document.querySelector('.main-canvas__container');
const topRuler = rootContainer.querySelector('.top-ruler');
const leftRuler = rootContainer.querySelector('.left-ruler');
const canvasContainer = rootContainer.querySelector('.main-container');
const mainFrame = rootContainer.querySelector('.main-iframe');
const canvasOverlay = rootContainer.querySelector('.main-canvas__overlay');
const canvasGrid = rootContainer.querySelector('.main-canvas__grid');

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
const snapFactor = 5;

let currentScale = 1;
let currentRotate = 0;
let currentTranslateX = 0;
let currentTranslateY = 0;
let currentPointerX = 0;
let currentPointerY = 0;

let previousSelectedNode;
let selectedBox;

let hoveredElements = [];
let hoveredBox;

let canvasContainerBoundingRect;
let mainFrameBoundingRect;
let selectedNodeBoundingRect;
let selectedNodeParentBoundingRect;
let hoveredNodeBoundingRect;

let isEditingText = false;
let isSelectingText = false;

let isPanning = false;
let panningTimeout;

let dragStartPoint;
let dragStartMatrix;
let dragStartBoundingRect;
let dragTargetNode;
let dragTargetPosition;
let dragPositionMode;
let dragPointerId;
let dragAnimationRequestId;
let draggingBox;
let draggingLine;
let draggingConstraint;
let isPreparedToDrag = false;
let isDragging = false;
let isDraggingInterrupted = false;
let isDraggingJustDone = false;

let isResizing = false;
let isRotating = false;
let isShearing = false;

let visibleInViewportElements = [];
let snappingBox;

let gridSpacing = 100;
let gridDivisor = 5;
let gridAppliedSpacing = 20;
let isGridRendered = false;

let isPanelInFocus = false;
let isPanelReady = false;

const updateRulerSize = () => {
    topRuler.width = canvasContainerBoundingRect.width - rulerHeight;
    topRuler.height = rulerHeight;
    leftRuler.width = rulerHeight;
    leftRuler.height = canvasContainerBoundingRect.height - rulerHeight;
}

const refreshRulers = () => {
    if (! isPanelReady) {
        updateRulerSize();
    }

    // Get the current canvas size
    const canvasWidth = parseInt(mainFrame.style.width, 10);
    const canvasHeight = parseInt(mainFrame.style.height, 10);

    // Prepare the top ruler
    let ctx = topRuler.getContext('2d', { alpha: true });
    ctx.fillStyle = hexToRgba(documentComputedStyle.getPropertyValue('--color-gray-600'));
    ctx.fillRect(0, 0, topRuler.width + rulerHeight, topRuler.height);

    // Prepare the left ruler
    ctx = leftRuler.getContext('2d', { alpha: true });
    ctx.fillStyle = hexToRgba(documentComputedStyle.getPropertyValue('--color-gray-600'));
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

const updateGridSize = () => {
    canvasGrid.width = canvasContainerBoundingRect.width;
    canvasGrid.height = canvasContainerBoundingRect.height;
}

const refreshGrid = () => {
    if (! isPanelReady) {
        updateGridSize();
    }

    if (! getGridCheckState()) {
        if (isGridRendered) {
            const ctx = canvasGrid.getContext('2d', { alpha: true });
            ctx.clearRect(0, 0, canvasGrid.width, canvasGrid.height);
        }
        return;
    }

    // Skip if the main frame is out of the viewport
    if (
        mainFrameBoundingRect.left > canvasContainerBoundingRect.right ||
        mainFrameBoundingRect.right < canvasContainerBoundingRect.left ||
        mainFrameBoundingRect.top > canvasContainerBoundingRect.bottom ||
        mainFrameBoundingRect.bottom < canvasContainerBoundingRect.top
    ) {
        return;
    }

    // Get the current canvas size
    const canvasWidth = parseInt(mainFrame.style.width, 10);
    const canvasHeight = parseInt(mainFrame.style.height, 10);

    // Prepare the grid canvas
    const ctx = canvasGrid.getContext('2d', { alpha: true });
    ctx.clearRect(0, 0, canvasGrid.width, canvasGrid.height);
    isGridRendered = false;

    // Define grid spacing
    let gridStepMajor = gridSpacing;
    let gridStepMinor = gridStepMajor / gridDivisor;
    // redefine the grid step if the distance between two minor grids is too small
    if (gridStepMinor * currentScale < 5) {
        gridStepMinor = gridStepMinor * Math.ceil(5 / (gridStepMinor * currentScale));
        gridStepMajor = gridStepMinor * gridDivisor;
    }
    // redefine the grid step if the distance between two minor grids is too large
    if (gridStepMinor * currentScale > 10) {
        gridStepMinor = gridStepMinor / Math.ceil((gridStepMinor * currentScale) / 10);
        gridStepMinor = gridStepMinor < 2 ? 1 : gridStepMinor; // Prevent from being less than 1
        gridStepMajor = gridStepMinor * gridDivisor;
    }
    gridAppliedSpacing = gridStepMinor;

    // Draw the grid lines
    let startX = Math.floor(Math.max(-currentTranslateX / currentScale, 0) / gridStepMinor) * gridStepMinor;
    let endX = Math.min((canvasGrid.width - currentTranslateX) / currentScale + rulerHeight, canvasWidth);
    let startY = Math.max(currentTranslateY, 0);
    let endY = Math.min(canvasHeight * currentScale + Math.min(currentTranslateY, 0), canvasGrid.height - Math.min(currentTranslateY, 0));
    for (let i = startX; i <= endX; i += gridStepMinor) {
        ctx.fillStyle = `rgba(0, 0, 0, ${i % gridStepMajor === 0 ? 0.2 : 0.1})`;
        ctx.fillRect(currentTranslateX + i * currentScale, startY, 1, endY);
    }
    startX = Math.max(currentTranslateX, 0);
    endX = Math.min(canvasWidth * currentScale + Math.min(currentTranslateX, 0), canvasGrid.width - Math.min(currentTranslateX, 0));
    startY = Math.floor(Math.max(-currentTranslateY / currentScale, 0) / gridStepMinor) * gridStepMinor;
    endY = Math.min((canvasGrid.height - currentTranslateY) / currentScale + rulerHeight, canvasHeight);
    for (let i = startY; i <= endY; i += gridStepMinor) {
        ctx.fillStyle = `rgba(0, 0, 0, ${i % gridStepMajor === 0 ? 0.2 : 0.1})`;
        ctx.fillRect(startX, currentTranslateY + i * currentScale, endX, 1);
    }

    //
    isGridRendered = true;
}

const updateMainFrameSize = () => {
    // TODO: add support for viewport width and height,
    // in case of game or presentation slides development?
    canvasContainerBoundingRect = canvasContainer.getBoundingClientRect();
    mainFrame.style.width = `${defaultBreakpoints.desktop}px`;
    mainFrame.style.height = `${mainFrame.contentDocument.body.scrollHeight}px`;
    mainFrameBoundingRect = mainFrame.getBoundingClientRect();
};

const initializeCanvas = () => {
    //
    let marginLeft = rulerHeight * 2;
    mainFrame.style.transform = `translate3d(${marginLeft}px, ${marginLeft}px, 0)`;
    currentTranslateX = marginLeft;
    currentTranslateY = marginLeft;

    // Set the initial main frame size
    updateMainFrameSize();

    // Create an IntersectionObserver to watch for elements in the viewport
    const intersectionObserver = new IntersectionObserver(entries => {
        setTimeout(() => updateVisibleInViewportElements(entries), 0);
    });
    mainFrame.contentDocument.querySelectorAll('body, body [data-uw-id]').forEach(element => {
        if (! element.hasAttribute('data-uw-ignore')) {
            intersectionObserver.observe(element);
        }
    });

    // Create a MutationObserver to watch for changes in the document tree
    const documentTree = mainFrame.contentDocument.documentElement;
    new MutationObserver((records) => {
        setTimeout(() => {
            records.forEach(record => {
                record.addedNodes.forEach(node => {
                    if (
                        node.nodeType === Node.ELEMENT_NODE &&
                        ! node.hasAttribute('data-uw-ignore')
                    ) {
                        intersectionObserver.observe(node);
                    }
                });
                record.removedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        intersectionObserver.unobserve(node);
                        const visibleElementIndex = visibleInViewportElements.findIndex(item => item.node === node);
                        if (visibleElementIndex !== -1) {
                            visibleInViewportElements.splice(visibleElementIndex, 1);
                        }
                        // TODO: should we unobserve deleted node and its children?
                    }
                });
            });
            updateMainFrameSize();
            refreshRulers();
            refreshGrid();
        }, 0);
    }).observe(documentTree, {
        childList: true,
        subtree: true,
    });
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
        hoveredBox.addEventListener('pointerdown', onHoveredBoxMouseDown);
        hoveredBox.addEventListener('pointerup', onHoveredBoxMouseUp);
        hoveredBox.addEventListener('dblclick', onHoveredBoxDoubleClick);
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

        // Initialize the transform area points
        const transformations = [
            { type: 'resizer', title: 'top-left', },
            { type: 'resizer', title: 'middle-top', },
            { type: 'resizer', title: 'top-right', },
            { type: 'resizer', title: 'middle-left', },
            { type: 'resizer', title: 'middle-right', },
            { type: 'resizer', title: 'bottom-left', },
            { type: 'resizer', title: 'middle-bottom', },
            { type: 'resizer', title: 'bottom-right', },
            { type: 'rotator', title: 'top-left', },
            { type: 'rotator', title: 'top-right', },
            { type: 'rotator', title: 'bottom-left', },
            { type: 'rotator', title: 'bottom-right', },
            { type: 'shearer', title: 'middle-left', },
            { type: 'shearer', title: 'middle-right', },
            { type: 'shearer', title: 'middle-top', },
            { type: 'shearer', title: 'middle-bottom', },
        ]
        transformations.forEach(transformation => {
            const element = document.createElement('div');
            element.setAttribute('data-uw-ignore', '');
            element.classList.add('transform-area', transformation.type, transformation.title);
            element.dataset.title = transformation.title;
            element.addEventListener('pointerdown', () => {
                if (transformation.type === 'resizer') isResizing = true;
                if (transformation.type === 'rotator') isRotating = true;
                if (transformation.type === 'shearer') isShearing = true;
            });
            element.addEventListener('pointerup', () => {
                if (transformation.type === 'resizer') isResizing = false;
                if (transformation.type === 'rotator') isRotating = true;
                if (transformation.type === 'shearer') isShearing = true;
            });
            selectedBox.appendChild(element);
        });
    }

    // Get the bounding rect of the selected node
    if (
        selectedNode.node &&
        selectedNode.node.nodeType === Node.ELEMENT_NODE &&
        selectedNode.node.tagName.toLowerCase() !== 'head' &&
        ! apiSchema.htmlElements
            .find(element => element.tag === selectedNode.node.tagName.toLowerCase())
            .categories
            .includes('metadata')
    ) {
        // Update the bounding rect of the selected node if it has changed
        if (selectedNode !== previousSelectedNode) {
            updateSelectedNodeBoundingRect();
            previousSelectedNode = selectedNode;
            const visibleElementIndex = visibleInViewportElements.findIndex(item => item.node === selectedNode.node);
            if (visibleElementIndex !== -1) {
                visibleInViewportElements[visibleElementIndex].rect = selectedNodeBoundingRect;
            }
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
        let newScale = currentScale - (event.deltaY || event.deltaX) * zoomFactor * currentScale;
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
    //     let newRotate = currentRotate + rotateFactor * Math.sign((event.deltaY || event.deltaX));
    //     mainFrame.style.transform = `translate3d(${currentTranslateX}px, ${currentTranslateY}px, 0) scale(${currentScale}) rotate(${newRotate}deg)`;
    //     currentRotate = newRotate;
    // }

    // Scroll horizontally
    else if (event.shiftKey || event.deltaX) {
        let newTranslateX = currentTranslateX - (event.deltaY || event.deltaX) * scrollFactor / (currentScale >= 1 ? currentScale ** 0.05 : currentScale ** 0.000005);
        mainFrame.style.transform = `translate3d(${newTranslateX}px, ${currentTranslateY}px, 0) scale(${currentScale}) rotate(${currentRotate}deg)`;
        currentTranslateX = newTranslateX;
    }

    // Scroll vertically
    else {
        let newTranslateY = currentTranslateY - (event.deltaY || event.deltaX) * scrollFactor / (currentScale >= 1 ? currentScale ** 0.05 : currentScale ** 0.000005);
        mainFrame.style.transform = `translate3d(${currentTranslateX}px, ${newTranslateY}px, 0) scale(${currentScale}) rotate(${currentRotate}deg)`;
        currentTranslateY = newTranslateY;
    }

    clearTimeout(panningTimeout);
    panningTimeout = setTimeout(() => {
        panningTimeout = null;
        updateSelectedNodeBoundingRect();
        refreshSelectedBox();
        refreshHoveredBox();
        refreshDraggingConstraint(getShiftKeyState());
        mainFrame.style.willChange = 'unset'; // force repaint
        setTimeout(() => mainFrame.style.willChange = 'transform', 250);
    }, 250);

    setTimeout(() => {
        refreshRulers();
        refreshGrid();
    }, 0);
    refreshSelectedBox();
    refreshHoveredBox();
    refreshDraggingBox();
    refreshDraggingConstraint(getShiftKeyState());

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

    setTimeout(() => {
        refreshRulers();
        refreshGrid();
    }, 0);
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

    const canvasOverlayBoundingRect = canvasOverlay.getBoundingClientRect();

    switch (event.detail.zoom) {
        case 'selection':
            if (! selectedNodeBoundingRect) {
                return;
            }

            // Calculate the new scale to fit the selected node within the main frame
            const scaleX = (canvasContainerBoundingRect.width - rulerHeight * 3) / selectedNodeBoundingRect.width;
            const scaleY = (canvasContainerBoundingRect.height - rulerHeight * 3) / selectedNodeBoundingRect.height;
            newScale = Math.min(scaleX, scaleY);

            // Calculate the new translate to center the selected node within the main frame
            newTranslateX = ((canvasContainerBoundingRect.width - rulerHeight * 3) - selectedNodeBoundingRect.width * newScale) / 2 - selectedNodeBoundingRect.left * newScale + rulerHeight * 2;
            newTranslateY = ((canvasContainerBoundingRect.height - rulerHeight * 3) - selectedNodeBoundingRect.height * newScale) / 2 - selectedNodeBoundingRect.top * newScale + rulerHeight * 2;

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
            if (defaultBreakpoints.desktop < (canvasContainerBoundingRect.width - rulerHeight)) {
                mainFrame.style.transform = `translate3d(${rulerHeight}px, ${rulerHeight}px, 0)`;
            } else {
                const newScale = (canvasContainerBoundingRect.width - rulerHeight) / defaultBreakpoints.desktop;
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
            newScale = event.detail.zoom;
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

    setTimeout(() => {
        refreshRulers();
        refreshGrid();
    }, 0);
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
    if (isDragging && dragPositionMode === 'layout') {
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
        const rect =
            visibleInViewportElements.find(item => item.node === selectedNode.node.offsetParent)?.rect ||
            selectedNode.node.offsetParent?.getBoundingClientRect() ||
            { left: 0, top: 0 };
        const left = currentTranslateX + (selectedNode.node.offsetLeft + rect.left) * currentScale;
        const top = currentTranslateY + (selectedNode.node.offsetTop + rect.top) * currentScale;
        const width = selectedNode.node.offsetWidth * currentScale;
        const height = selectedNode.node.offsetHeight * currentScale;
        selectedBox.style.left = `${left}px`;
        selectedBox.style.top = `${top}px`;
        selectedBox.style.width = `${width}px`;
        selectedBox.style.height = `${height}px`;

        // Apply the transformation matrix of the selected node
        // TODO: put the transformation origin into account
        const _metadata = metadata[selectedNode.node.dataset.uwId];
        const matrix = new DOMMatrix(_metadata.properties.transform?.value || 'matrix(1, 0, 0, 1, 0, 0)');
        selectedBox.style.transform = `matrix(${matrix.a}, ${matrix.b}, ${matrix.c}, ${matrix.d}, ${matrix.e * currentScale}, ${matrix.f * currentScale})`;

        // TODO: convert the parent bounding rect to the selected node's bounding box
        // and create a new element to show the parent bounding rect
        // so that it won't be affected by the transformation matrix of the selected node
        // if (
        //     selectedNodeParentBoundingRect &&
        //     ! isDragging
        // ) {
        //     let { left, top, width, height } = selectedNodeParentBoundingRect;
        //     left = (left - selectedNodeBoundingRect.left) * currentScale;
        //     top = (top - selectedNodeBoundingRect.top) * currentScale;
        //     width = width * currentScale;
        //     height = height * currentScale;
        //     selectedBox.style.setProperty('--parent-top', `${top - 1}px`);
        //     selectedBox.style.setProperty('--parent-left', `${left - 1}px`);
        //     selectedBox.style.setProperty('--parent-width', `${width}px`);
        //     selectedBox.style.setProperty('--parent-height', `${height}px`);
        //     selectedBox.style.setProperty('--parent-visibility', 'visible');
        // } else {
        //     selectedBox.style.setProperty('--parent-visibility', 'hidden');
        // }

        // Get the original position and size of the selected node
        // before considering the offset of the positioned element
        if (
            ! isEditingText &&
            Object.keys(_metadata.properties).some(property =>
                [
                    'left',
                    'right',
                    'top',
                    'bottom',
                    'margin-left',
                    'margin-right',
                    'margin-top',
                    'margin-bottom',
                ].includes(property)
            )
        ) {
            let left = 0;
            left -= parseFloat(_metadata.properties['left']?.value || 0);
            left -= parseFloat(_metadata.properties['margin-left']?.value || 0);
            left *= currentScale;

            let right = 0;
            right += parseFloat(_metadata.properties['right']?.value || 0);
            right += parseFloat(_metadata.properties['margin-right']?.value || 0);
            right *= currentScale;

            let top = 0;
            top -= parseFloat(_metadata.properties['top']?.value || 0);
            top -= parseFloat(_metadata.properties['margin-top']?.value || 0);
            top *= currentScale;

            let bottom = 0;
            bottom += parseFloat(_metadata.properties['bottom']?.value || 0);
            bottom += parseFloat(_metadata.properties['margin-bottom']?.value || 0);
            bottom *= currentScale;

            selectedBox.style.setProperty('--original-top', `${top - 1}px`);
            selectedBox.style.setProperty('--original-left', `${left - 1}px`);
            selectedBox.style.setProperty('--original-right', `${right - 1}px`);
            selectedBox.style.setProperty('--original-bottom', `${bottom - 1}px`);
            selectedBox.style.setProperty('--original-width', `${width}px`);
            selectedBox.style.setProperty('--original-height', `${height}px`);
            selectedBox.style.setProperty('--original-visibility', 'visible');
        } else {
            selectedBox.style.setProperty('--original-visibility', 'hidden');
        }

        //
        selectedBox.querySelectorAll('.transform-area').forEach(element => {
            // Hide the transform area point if the selected element is being edited
            if (isEditingText) {
                element.classList.add('hidden');
                return;
            }

            // Unhide the transform area point
            element.classList.remove('hidden');

            // Hide some transform area points if the selected element is too small either in width
            if (selectedNodeBoundingRect.width * currentScale <= 10) {
                if (
                    element.dataset.title.startsWith('top') ||
                    element.dataset.title.startsWith('bottom') ||
                    element.dataset.title.endsWith('left') ||
                    element.dataset.title.endsWith('right')
                ) {
                    element.classList.add('hidden');
                }
            } else if (selectedNodeBoundingRect.width * currentScale <= 20) {
                if (
                    element.dataset.title === 'middle-top' ||
                    element.dataset.title === 'middle-bottom'
                ) {
                    element.classList.add('hidden');
                }
            }

            // Hide some transform area points if the selected element is too small either in height
            if (selectedNodeBoundingRect.height * currentScale <= 10) {
                if (
                    element.dataset.title.startsWith('top') ||
                    element.dataset.title.startsWith('bottom') ||
                    element.dataset.title.endsWith('top') ||
                    element.dataset.title.endsWith('bottom')
                ) {
                    element.classList.add('hidden');
                }
            } else if (selectedNodeBoundingRect.height * currentScale <= 20) {
                if (
                    element.dataset.title === 'middle-left' ||
                    element.dataset.title === 'middle-right'
                ) {
                    element.classList.add('hidden');
                }
            }
        });

        //
        const position = _metadata.properties['position']?.value || 'static';
        if (! ['absolute', 'fixed', 'sticky'].includes(position)) {
            selectedBox.classList.add('is-layout');
        } else {
            selectedBox.classList.remove('is-layout');
        }

        //
        selectedBox.classList.toggle('is-editing', isEditingText);

        // Show the selected box
        selectedBox.classList.remove('hidden');
    }

    if (! selectedNodeBoundingRect) {
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
        // FIXME: the position is wrong when the hovered element is inside a transformed element,
        // even if the transformation matrix is matrix(1, 0, 0, 1, 0, 0)
        const rect =
            visibleInViewportElements.find(item => item.node === hoveredNode.node.offsetParent)?.rect ||
            hoveredNode.node.offsetParent?.getBoundingClientRect() ||
            { left: 0, top: 0 };
        const left = currentTranslateX + (hoveredNode.node.offsetLeft + rect.left) * currentScale;
        const top = currentTranslateY + (hoveredNode.node.offsetTop + rect.top) * currentScale;
        const width = hoveredNode.node.offsetWidth * currentScale;
        const height = hoveredNode.node.offsetHeight * currentScale;
        hoveredBox.style.left = `${left}px`;
        hoveredBox.style.top = `${top}px`;
        hoveredBox.style.width = `${width}px`;
        hoveredBox.style.height = `${height}px`;

        // Apply the transformation matrix of the hovered node
        // TODO: put the transformation origin into account
        const _metadata = metadata[hoveredNode.node.dataset.uwId];
        const matrix = new DOMMatrix(_metadata.properties.transform?.value || 'matrix(1, 0, 0, 1, 0, 0)');
        hoveredBox.style.transform = `matrix(${matrix.a}, ${matrix.b}, ${matrix.c}, ${matrix.d}, ${matrix.e * currentScale}, ${matrix.f * currentScale})`;

        //
        const position = _metadata.properties['position']?.value || 'static';
        if (! ['absolute', 'fixed', 'sticky'].includes(position)) {
            hoveredBox.classList.add('is-layout');
        } else {
            hoveredBox.classList.remove('is-layout');
        }

        //
        hoveredBox.classList.toggle('is-editing', isEditingText && selectedNode.node === hoveredNode.node);

        // Show the hovered box
        hoveredBox.classList.remove('hidden');
    } else {
        // Hide the hovered box
        hoveredBox.classList.add('hidden');
    }
}

const refreshDraggingBox = () => {
    if (! draggingBox) {
        return;
    }

    if (selectedNodeBoundingRect) {
        // Update the dragged box position and size
        const left = currentTranslateX + selectedNode.node.offsetLeft * currentScale;
        const top = currentTranslateY + selectedNode.node.offsetTop * currentScale;
        const width = selectedNode.node.offsetWidth * currentScale;
        const height = selectedNode.node.offsetHeight * currentScale;
        draggingBox.style.left = `${left}px`;
        draggingBox.style.top = `${top}px`;
        draggingBox.style.width = `${width}px`;
        draggingBox.style.height = `${height}px`;

        // Apply the transformation matrix of the selected node
        // TODO: put the transformation origin into account
        const _metadata = metadata[selectedNode.node.dataset.uwId];
        const matrix = new DOMMatrix(_metadata.properties.transform?.value || 'matrix(1, 0, 0, 1, 0, 0)');
        draggingBox.style.transform = `matrix(${matrix.a}, ${matrix.b}, ${matrix.c}, ${matrix.d}, ${matrix.e * currentScale}, ${matrix.f * currentScale})`;

        // Show the dragged box
        draggingBox.classList.remove('hidden');
    } else {
        // Hide the dragged box
        draggingBox.classList.add('hidden');
    }
}

const refreshDraggingLine = () => {
    // Skip if there is no hovered nodes
    if (hoveredElements.length === 0) {
        draggingLine.classList.add('hidden');
        dragTargetNode = null;
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
        dragTargetNode = null;
        dragTargetPosition = null;
        return;
    }

    const clientX = (currentPointerX - mainFrameBoundingRect.left) / currentScale;
    const clientY = (currentPointerY - mainFrameBoundingRect.top) / currentScale;

    // Get the bounding rect of the hovered node
    dragTargetNode = hoveredNode.node;
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
        if (clientX <= hoveredNodeBoundingRect.left + hoveredNodeBoundingRect.width / 2) {
            dragTargetPosition = 'beforebegin';
            width = 2;
        }
        // If the mouse position 1/2 of the width from the right of hovered element,
        // indicate the target position after hovered element
        if (clientX > hoveredNodeBoundingRect.left + hoveredNodeBoundingRect.width * 1 / 2) {
            dragTargetPosition = 'afterend';
            left = left + width - 2;
            width = 2;
        }
        // If the mouse position 1/5 of the height from the top of hovered element,
        // indicate the target position before hovered element
        if (clientY < hoveredNodeBoundingRect.top + 5) {
            dragTargetPosition = 'beforebegin';
            left = currentTranslateX + hoveredNodeBoundingRect.left * currentScale;
            width = hoveredNodeBoundingRect.width * currentScale;
            height = 2;
        }
        // If the mouse position 4/5 of the height from the top of hovered element,
        // indicate the target position after hovered element
        if (clientY > hoveredNodeBoundingRect.top + hoveredNodeBoundingRect.height - 5) {
            dragTargetPosition = 'afterend';
            left = currentTranslateX + hoveredNodeBoundingRect.left * currentScale;
            top = top + height - 2;
            width = hoveredNodeBoundingRect.width * currentScale;
            height = 2;
        }
    }

    // If the container layout direction is top-to-bottom
    if (containerLayoutDirection.startsWith('column')) {
        // If the mouse position 1/2 of the height from the top of hovered element,
        // indicate the target position before hovered element
        if (clientY <= hoveredNodeBoundingRect.top + hoveredNodeBoundingRect.height / 2) {
            dragTargetPosition = 'beforebegin';
            height = 2;
        }
        // If the mouse position 1/2 of the height from the bottom of hovered element,
        // indicate the target position after hovered element
        if (clientY > hoveredNodeBoundingRect.top + hoveredNodeBoundingRect.height * 1 / 2) {
            dragTargetPosition = 'afterend';
            top = top + height - 2;
            height = 2;
        }
        // If the mouse position 1/5 of the width from the left of hovered element,
        // indicate the target position before hovered element
        if (clientX < hoveredNodeBoundingRect.left + 5) {
            dragTargetPosition = 'beforebegin';
            top = currentTranslateY + hoveredNodeBoundingRect.top * currentScale;
            width = 2;
            height = hoveredNodeBoundingRect.height * currentScale;
        }
        // If the mouse position 4/5 of the width from the left of hovered element,
        // indicate the target position after hovered element
        if (clientX > hoveredNodeBoundingRect.left + hoveredNodeBoundingRect.width - 5) {
            dragTargetPosition = 'afterend';
            left = left + width - 2;
            top = currentTranslateY + hoveredNodeBoundingRect.top * currentScale;
            width = 2;
            height = hoveredNodeBoundingRect.height * currentScale;
        }
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

const refreshDraggingConstraint = (constrained) => {
    if (! isDragging) {
        return;
    }

    if (dragPositionMode !== 'free') {
        return;
    }

    if (panningTimeout) {
        draggingConstraint?.classList.add('hidden');
        return;
    }

    if (! constrained) {
        draggingConstraint?.remove();
        draggingConstraint = null;
        return;
    }

    // Create the dragging constraint if not exists
    if (! draggingConstraint) {
        draggingConstraint = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        draggingConstraint.classList.add('dragging-constraint', 'hidden');
        draggingConstraint.setAttribute('data-uw-ignore', '');

        // Crosshair indicating the start position
        const startCrosshair = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        startCrosshair.classList.add('start-crosshair');
        startCrosshair.setAttribute('r', 3);
        startCrosshair.setAttribute('fill', 'var(--color-blue)');
        draggingConstraint.appendChild(startCrosshair);

        // Crosshair indicating the end position
        const endCrosshair = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        endCrosshair.classList.add('end-crosshair');
        endCrosshair.setAttribute('r', 3);
        endCrosshair.setAttribute('fill', 'var(--color-blue)');
        draggingConstraint.appendChild(endCrosshair);

        // Line connecting the two crosshairs
        const connectingLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        connectingLine.classList.add('connecting-line');
        connectingLine.setAttribute('stroke', 'var(--color-blue)');
        connectingLine.setAttribute('stroke-width', '1');
        connectingLine.setAttribute('shape-rendering', 'crispEdges');
        draggingConstraint.appendChild(connectingLine);
        canvasOverlay.appendChild(draggingConstraint);
    }

    // Update the crosshair which indicates the start position
    const startCrosshair = draggingConstraint.querySelector('.start-crosshair');
    startCrosshair.setAttribute('cx', currentTranslateX + (dragStartBoundingRect.x + dragStartBoundingRect.width / 2) * currentScale);
    startCrosshair.setAttribute('cy', currentTranslateY + (dragStartBoundingRect.y + dragStartBoundingRect.height / 2) * currentScale);

    // Update the crosshair which indicates the end position
    const endCrosshair = draggingConstraint.querySelector('.end-crosshair');
    endCrosshair.setAttribute('cx', currentTranslateX + (selectedNodeBoundingRect.x + selectedNodeBoundingRect.width / 2) * currentScale);
    endCrosshair.setAttribute('cy', currentTranslateY + (selectedNodeBoundingRect.y + selectedNodeBoundingRect.height / 2) * currentScale);

    // Update the line connecting the two crosshairs
    const connectingLine = draggingConstraint.querySelector('.connecting-line');
    connectingLine.setAttribute('x1', startCrosshair.getAttribute('cx'));
    connectingLine.setAttribute('y1', startCrosshair.getAttribute('cy'));
    connectingLine.setAttribute('x2', endCrosshair.getAttribute('cx'));
    connectingLine.setAttribute('y2', endCrosshair.getAttribute('cy'));

    // Show the dragging constraint
    draggingConstraint.classList.remove('hidden');
}

const refreshSnappingBox = (elementCorners) => {
    // Create a snapping box if not exists
    if (! snappingBox) {
        snappingBox = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        snappingBox.classList.add('snapping-box');

        // Vertical lines
        for (let index = 0; index < 3; index++) {
            const verticalLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            verticalLine.classList.add('vertical-line');
            verticalLine.setAttribute('y1', 0);
            verticalLine.setAttribute('y2', canvasOverlay.clientHeight);
            verticalLine.setAttribute('stroke', 'var(--color-blue)');
            verticalLine.setAttribute('stroke-width', '1');
            verticalLine.setAttribute('shape-rendering', 'crispEdges');
            verticalLine.classList.add('hidden');
            snappingBox.appendChild(verticalLine);
        }

        // Horizontal lines
        for (let index = 0; index < 3; index++) {
            const horizontalLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            horizontalLine.classList.add('horizontal-line');
            horizontalLine.setAttribute('x1', 0);
            horizontalLine.setAttribute('x2', canvasOverlay.clientWidth);
            horizontalLine.setAttribute('stroke', 'var(--color-blue)');
            horizontalLine.setAttribute('stroke-width', '1');
            horizontalLine.setAttribute('shape-rendering', 'crispEdges');
            horizontalLine.classList.add('hidden');
            snappingBox.appendChild(horizontalLine);
        }
    }

    // Hide the snapping box
    snappingBox.remove();

    if (elementCorners[0].x === null && elementCorners[0].y === null) {
        return;
    }

    // Update line positions
    const verticalLines = snappingBox.querySelectorAll('.vertical-line');
    const horizontalLines = snappingBox.querySelectorAll('.horizontal-line');

    // Hide all lines
    verticalLines.forEach(line => line.classList.add('hidden'));
    horizontalLines.forEach(line => line.classList.add('hidden'));

    // TODO: limit the vertical line height and horizontal line width
    // TODO: add distance information to the snapping lines

    if (elementCorners[0].x !== null) {
        const corners = elementCorners.filter(corner => corner.x);
        verticalLines.forEach((line, index) => {
            if (typeof corners[index] === 'undefined') {
                return;
            }
            let offset = selectedNodeBoundingRect.x * currentScale + currentTranslateX;
            if (corners[index].label.endsWith('left')) {
                offset += 1;
            }
            if (corners[index].label.endsWith('center')) {
                offset += selectedNodeBoundingRect.width / 2 * currentScale;
            }
            if (corners[index].label.endsWith('right')) {
                offset += selectedNodeBoundingRect.width * currentScale;
            }
            line.setAttribute('x1', offset);
            line.setAttribute('x2', offset);
            line.classList.remove('hidden');
        });
    }

    if (elementCorners[0].y !== null) {
        const corners = elementCorners.filter(corner => corner.y);
        horizontalLines.forEach((line, index) => {
            if (typeof corners[index] === 'undefined') {
                return;
            }
            let offset = selectedNodeBoundingRect.y * currentScale + currentTranslateY;
            if (corners[index].label.startsWith('top')) {
                offset += 1;
            }
            if (corners[index].label.startsWith('middle')) {
                offset += selectedNodeBoundingRect.height / 2 * currentScale;
            }
            if (corners[index].label.startsWith('bottom')) {
                offset += selectedNodeBoundingRect.height * currentScale;
            }
            line.setAttribute('y1', offset);
            line.setAttribute('y2', offset);
            line.classList.remove('hidden');
        });
    }

    // Show the snapping box
    canvasOverlay.appendChild(snappingBox);
}

const onHoveredBoxMouseDown = (event) => {
    if (event.which === 1) { // left mouse button
        // Skip if the hovered node is HTML or body
        // TODO: implement marquee selection, but add support for multiple selection first
        if (['html', 'body'].includes(hoveredNode.node.tagName.toLowerCase())) {
            return;
        }

        // Specify the drag position mode
        const _metadata = metadata[hoveredNode.node.dataset.uwId];
        const position = _metadata.properties['position']?.value || 'static';
        dragPositionMode = ['absolute', 'fixed', 'sticky'].includes(position) ? 'free' : 'layout';

        // Flag to start dragging
        dragStartPoint = { x: event.clientX, y: event.clientY };
        isPreparedToDrag = true;

        if (
            isEditingText &&
            selectedNode.node === hoveredNode.node
        ) {
            event.preventDefault();

            // Get the cursor position relative to the iframe document
            const pointerX = (event.clientX - mainFrameBoundingRect.left) / currentScale;
            const pointerY = (event.clientY - mainFrameBoundingRect.top) / currentScale;

            // Update the text selection
            const caretPosition = selectedNode.node.ownerDocument.caretPositionFromPoint(pointerX, pointerY);
            if (caretPosition) {
                const selection = selectedNode.node.ownerDocument.getSelection();
                const range = selectedNode.node.ownerDocument.createRange();
                if (getShiftKeyState()) {
                    range.setStart(selection.anchorNode, selection.anchorOffset);
                    range.collapse(true);
                    selection.removeAllRanges();
                    selection.addRange(range);
                    selection.extend(caretPosition.offsetNode, caretPosition.offset);
                } else {
                    range.setStart(caretPosition.offsetNode, caretPosition.offset);
                    range.collapse(true);
                    selection.removeAllRanges();
                    selection.addRange(range);
                }
            }

            // Re-focus on the selected node
            selectedNode.node.focus();
        }

        return;
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

        // Remove the dragging constraint if exists
        if (draggingConstraint) {
            draggingConstraint.remove();
            draggingConstraint = null;
        }
    }

    // Skip if there is no hovered nodes
    if (hoveredElements.length === 0) {
        return;
    }

    if (
        isEditingText &&
        selectedNode.node === hoveredNode.node
    ) {
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
        if (selectedNode.node?.nodeType === Node.ELEMENT_NODE) {
            // Remove the contenteditable attribute from the hovered node
            // FIXME: handle the case when the user explicitly set the contenteditable attribute
            selectedNode.node.removeAttribute('contenteditable');

            // Blur on the hovered node
            selectedNode.node.blur();

            // Clear the text selection
            selectedNode.node?.ownerDocument.getSelection().removeAllRanges();
        }

        //
        isEditingText = false;
        previousSelectedNode = selectedNode;

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

const onHoveredBoxDoubleClick = (event) => {
    if (! isElementTextable(hoveredNode.node)) {
        return;
    }

    // Set the content of the hovered node to be editable
    hoveredNode.node.setAttribute('contenteditable', 'true');

    // Focus on the hovered node
    hoveredNode.node.focus();

    // Get the cursor position relative to the iframe document
    const pointerX = (event.clientX - mainFrameBoundingRect.left) / currentScale;
    const pointerY = (event.clientY - mainFrameBoundingRect.top) / currentScale;

    // Update the text selection
    const caretPosition = hoveredNode.node.ownerDocument.caretPositionFromPoint(pointerX, pointerY);
    if (caretPosition) {
        const selection = hoveredNode.node.ownerDocument.getSelection();
        const range = hoveredNode.node.ownerDocument.createRange();
        let node = caretPosition.offsetNode;
        let offset = caretPosition.offset;
        let text = node.textContent;
        let start = offset;
        let end = offset;
        while (start > 0 && /\w/.test(text[start - 1])) {
            start--;
        }
        while (end < text.length && /\w/.test(text[end])) {
            end++;
        }
        range.setStart(node, start);
        range.setEnd(node, end);
        selection.removeAllRanges();
        selection.addRange(range);
    }

    isEditingText = true;

    //
    refreshSelectedBox();
    refreshHoveredBox();
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
                'align-middle', 'align-bottom', 'flip-horizontal', 'flip-vertical', 'rotate-left', 'rotate-right',
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
                window.dispatchEvent(new CustomEvent('element:move-to-top-tree'));
            },
            disabled:
                ['html', 'head', 'body'].includes(selectedNode.node.tagName.toLowerCase()) ||
                ! hasPreviousSibling,
            belongs: 'move',
            shortcut: 'Ctrl+Shift+]',
        },
        {
            id: 'move-up-tree',
            label: ['absolute', 'fixed'].includes(stylePosition) ? 'Move Backward' : 'Move Up',
            action: () => {
                // Request to move the element up
                window.dispatchEvent(new CustomEvent('element:move-up-tree'));
            },
            disabled:
                ['html', 'head', 'body'].includes(selectedNode.node.tagName.toLowerCase()) ||
                ! hasPreviousSibling,
            belongs: 'move',
            shortcut: 'Ctrl+]',
        },
        {
            id: 'move-down-tree',
            label: ['absolute', 'fixed'].includes(stylePosition) ? 'Move Forward' : 'Move Down',
            action: () => {
                // Request to move the element down
                window.dispatchEvent(new CustomEvent('element:move-down-tree'));
            },
            disabled:
                ['html', 'head', 'body'].includes(selectedNode.node.tagName.toLowerCase()) ||
                ! hasNextSibling,
            belongs: 'move',
            shortcut: 'Ctrl+[',
        },
        {
            id: 'move-to-bottom-tree',
            label: ['absolute', 'fixed'].includes(stylePosition) ? 'Move to Front' : 'Move to Bottom',
            action: () => {
                // Request to move the element to bottom
                window.dispatchEvent(new CustomEvent('element:move-to-bottom-tree'));
            },
            disabled:
                ['html', 'head', 'body'].includes(selectedNode.node.tagName.toLowerCase()) ||
                ! hasNextSibling,
            belongs: 'move',
            shortcut: 'Ctrl+Shift+[',
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
            for: ['flip-horizontal', 'flip-vertical', 'rotate-left', 'rotate-right'],
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
            for: ['rotate-left', 'rotate-right'],
            belongs: 'transform',
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
            for: ['edit-text'],
        },
        {
            id: 'edit-text',
            label: 'Edit Text...',
            icon: 'edit',
            action: () => onListItemDoubleClick(event),
            disabled: ! isElementTextable(selectedNode.node),
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

    // Do not change the hovered element if the selected node is under the pointer
    const pointerX = (event.clientX - mainFrameBoundingRect.left) / currentScale;
    const pointerY = (event.clientY - mainFrameBoundingRect.top) / currentScale;
    if (
        event.altKey &&
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

            return;
        }

        if (
            (
                isEditingText &&
                selectedNode.node.contains(topMostHoveredElement)
            )
        ) {
            // Reset the hovered element
            setHoveredNode(selectedNode.node, selectedNode.position, selectedNode.parent);
        } else {
            // Set the hovered element
            setHoveredNode(
                topMostHoveredElement,
                topMostHoveredElement.parentElement
                    ? Array.prototype.indexOf.call(topMostHoveredElement.parentElement.childNodes, topMostHoveredElement)
                    : null,
                topMostHoveredElement.parentElement,
            );
        }

        //
        hoveredNodeBoundingRect = topMostHoveredElement.getBoundingClientRect();
        refreshHoveredBox();

        return;
    }

    // TODO: add support for hovering non-framed elements
}

const updateVisibleInViewportElements = (entries) => {
    entries.forEach(entry => {
        const visibleElementIndex = visibleInViewportElements.findIndex(item => item.node === entry.target);
        if (entry.isIntersecting && visibleElementIndex === -1) {
            visibleInViewportElements.push({
                node: entry.target,
                rect: entry.boundingClientRect,
            });
        } else if (! entry.isIntersecting && visibleElementIndex !== -1) {
            visibleInViewportElements.splice(visibleElementIndex, 1);
        }
    });
}

const moveSelectedNode = (clientX, clientY) => {
    // Get the metadata of the selected node
    const _metadata = metadata[selectedNode.node.dataset.uwId];
    const matrix = new DOMMatrix(_metadata.properties.transform?.value || 'matrix(1, 0, 0, 1, 0, 0)');

    // Apply the transformation to the element
    matrix.e = dragStartMatrix.e + clientX - dragStartPoint.x;
    matrix.f = dragStartMatrix.f + clientY - dragStartPoint.y;

    // Reposition if the element is constrained
    let constraintDirection = null;
    if (getShiftKeyState()) {
        const deltaX = clientX - dragStartPoint.x;
        const deltaY = clientY - dragStartPoint.y;
        const angle = Math.atan2(Math.abs(deltaY), Math.abs(deltaX)) * (180 / Math.PI);
        if (angle >= 45 - 10 && angle <= 45 + 10) {
            const shift = Math.max(Math.abs(clientX - dragStartPoint.x), Math.abs(clientY - dragStartPoint.y));
            matrix.e = shift * Math.sign(clientX - dragStartPoint.x) + dragStartMatrix.e;
            matrix.f = shift * Math.sign(clientY - dragStartPoint.y) + dragStartMatrix.f;
            constraintDirection = 'diagonal';
        } else {
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                matrix.f = dragStartMatrix.f;
                constraintDirection = 'horizontal';
            } else {
                matrix.e = dragStartMatrix.e;
                constraintDirection = 'vertical';
            }
        }
    }

    // Reposition if there is a snapping point nearby
    let nearestElementCorners = [ { x: null, y: null, label: '' } ];
    if (getSnapCheckState()) {
        // Find the nearest corner snapping point of visible elements relative to the selected node
        let nearestSnappingPoint = { x: null, y: null };
        let nearestPointDistance = { x: null, y: null };
        const snappingThreshold = snapFactor / currentScale;
        [
            {
                label: 'top-left',
                x: clientX - (dragStartPoint.x - dragStartBoundingRect.x),
                y: clientY - (dragStartPoint.y - dragStartBoundingRect.y),
            },
            {
                label: 'top-center',
                x: clientX - (dragStartPoint.x - dragStartBoundingRect.x) + dragStartBoundingRect.width / 2,
                y: clientY - (dragStartPoint.y - dragStartBoundingRect.y),
            },
            {
                label: 'top-right',
                x: clientX - (dragStartPoint.x - dragStartBoundingRect.x) + dragStartBoundingRect.width,
                y: clientY - (dragStartPoint.y - dragStartBoundingRect.y),
            },
            {
                label: 'middle-left',
                x: clientX - (dragStartPoint.x - dragStartBoundingRect.x),
                y: clientY - (dragStartPoint.y - dragStartBoundingRect.y) + dragStartBoundingRect.height / 2,
            },
            {
                label: 'middle-center',
                x: clientX - (dragStartPoint.x - dragStartBoundingRect.x) + dragStartBoundingRect.width / 2,
                y: clientY - (dragStartPoint.y - dragStartBoundingRect.y) + dragStartBoundingRect.height / 2,
            },
            {
                label: 'middle-right',
                x: clientX - (dragStartPoint.x - dragStartBoundingRect.x) + dragStartBoundingRect.width,
                y: clientY - (dragStartPoint.y - dragStartBoundingRect.y) + dragStartBoundingRect.height / 2,
            },
            {
                label: 'bottom-left',
                x: clientX - (dragStartPoint.x - dragStartBoundingRect.x),
                y: clientY - (dragStartPoint.y - dragStartBoundingRect.y) + dragStartBoundingRect.height,
            },
            {
                label: 'bottom-center',
                x: clientX - (dragStartPoint.x - dragStartBoundingRect.x) + dragStartBoundingRect.width / 2,
                y: clientY - (dragStartPoint.y - dragStartBoundingRect.y) + dragStartBoundingRect.height,
            },
            {
                label: 'bottom-right',
                x: clientX - (dragStartPoint.x - dragStartBoundingRect.x) + dragStartBoundingRect.width,
                y: clientY - (dragStartPoint.y - dragStartBoundingRect.y) + dragStartBoundingRect.height,
            },
        ].forEach(elementCorner => {
            visibleInViewportElements.forEach(viewportElement => {
                // Skip if the item is the selected node
                if (viewportElement.node === selectedNode.node) {
                    return;
                }

                // Skip if the item is not an absolute or fixed positioned element,
                // and is not the parent element of the selected node
                const __metadata = metadata[viewportElement.node.dataset.uwId];
                if (
                    ! ['absolute', 'fixed'].includes(__metadata.properties.position?.value) &&
                    viewportElement.node !== selectedNode.parent
                ) {
                    return;
                }

                // Check for snapping corner points nearby
                [
                    {
                        label: 'top-left',
                        x: viewportElement.rect.left,
                        y: viewportElement.rect.top,
                    },
                    {
                        label: 'top-center',
                        x: viewportElement.rect.left + viewportElement.rect.width / 2,
                        y: viewportElement.rect.top,
                    },
                    {
                        label: 'top-right',
                        x: viewportElement.rect.right,
                        y: viewportElement.rect.top,
                    },
                    {
                        label: 'middle-left',
                        x: viewportElement.rect.left,
                        y: viewportElement.rect.top + viewportElement.rect.height / 2,
                    },
                    {
                        label: 'middle-center',
                        x: viewportElement.rect.left + viewportElement.rect.width / 2,
                        y: viewportElement.rect.top + viewportElement.rect.height / 2,
                    },
                    {
                        label: 'middle-right',
                        x: viewportElement.rect.right,
                        y: viewportElement.rect.top + viewportElement.rect.height / 2,
                    },
                    {
                        label: 'bottom-left',
                        x: viewportElement.rect.left,
                        y: viewportElement.rect.bottom,
                    },
                    {
                        label: 'bottom-center',
                        x: viewportElement.rect.left + viewportElement.rect.width / 2,
                        y: viewportElement.rect.bottom,
                    },
                    {
                        label: 'bottom-right',
                        x: viewportElement.rect.right,
                        y: viewportElement.rect.bottom,
                    },
                ].forEach(snappingPoint => {
                    const distance = {
                        x: Math.abs(snappingPoint.x - elementCorner.x),
                        y: Math.abs(snappingPoint.y - elementCorner.y),
                    };
                    if (
                        ! ['vertical', 'diagonal'].includes(constraintDirection) &&
                        distance.x <= snappingThreshold &&
                        (
                            nearestPointDistance.x === null ||
                            distance.x < nearestPointDistance.x
                        )
                    ) {
                        nearestElementCorners[0].x = elementCorner.x;
                        nearestElementCorners[0].label =
                            (nearestElementCorners[0].label.split('-')?.[0] || '') +
                            '-' + elementCorner.label.split('-')[1];
                        nearestElementCorners = nearestElementCorners.filter(corner =>
                            corner.x === elementCorner.x || corner.x === null
                        );
                        nearestSnappingPoint.x = snappingPoint.x;
                        nearestPointDistance.x = distance.x;
                    }
                    if (
                        ! ['horizontal', 'diagonal'].includes(constraintDirection) &&
                        distance.y <= snappingThreshold &&
                        (
                            nearestPointDistance.y === null ||
                            distance.y < nearestPointDistance.y
                        )
                    ) {
                        nearestElementCorners[0].y = elementCorner.y;
                        nearestElementCorners[0].label =
                            elementCorner.label.split('-')[0] +
                            '-' + (nearestElementCorners[0].label.split('-')?.[1] || '');
                        nearestElementCorners = nearestElementCorners.filter(corner =>
                            corner.y === elementCorner.y || corner.y === null
                        );
                        nearestSnappingPoint.y = snappingPoint.y;
                        nearestPointDistance.y = distance.y;
                    }
                    // TODO: implement diagonal snapping
                    // if (
                    //     constraintDirection === 'diagonal'
                    // ) {
                    //     nearestElementCorners[0].x = elementCorner.x;
                    //     nearestElementCorners[0].y = elementCorner.y;
                    //     nearestElementCorners[0].label = elementCorner.label;
                    //     nearestElementCorners = nearestElementCorners.filter(corner =>
                    //         corner.x === elementCorner.x && corner.y === elementCorner.y
                    //     );
                    //     nearestSnappingPoint.x = snappingPoint.x;
                    //     nearestSnappingPoint.y = snappingPoint.y;
                    //     nearestPointDistance.x = distance.x;
                    //     nearestPointDistance.y = distance.y;
                    // }
                    if (distance.x === nearestPointDistance.x) {
                        const hasMatchingX = nearestElementCorners.some(corner => corner.x === elementCorner.x);
                        if (! hasMatchingX) {
                            nearestElementCorners.push({ x: elementCorner.x, label: elementCorner.label.split('-')[1] });
                        }
                    }
                    if (distance.y === nearestPointDistance.y) {
                        const hasMatchingY = nearestElementCorners.some(corner => corner.y === elementCorner.y);
                        if (! hasMatchingY) {
                            nearestElementCorners.push({ y: elementCorner.y, label: elementCorner.label.split('-')[0] });
                        }
                    }
                });
            });

            // Find the nearest grid intersection relative to the selected node
            if (getGridCheckState()) {
                let intersections = [
                    {
                        x: elementCorner.x - (elementCorner.x % gridAppliedSpacing),
                        y: elementCorner.y - (elementCorner.y % gridAppliedSpacing),
                    },
                    {
                        x: elementCorner.x - (elementCorner.x % gridAppliedSpacing) + gridAppliedSpacing,
                        y: elementCorner.y - (elementCorner.y % gridAppliedSpacing),
                    },
                    {
                        x: elementCorner.x - (elementCorner.x % gridAppliedSpacing),
                        y: elementCorner.y - (elementCorner.y % gridAppliedSpacing) + gridAppliedSpacing,
                    },
                    {
                        x: elementCorner.x - (elementCorner.x % gridAppliedSpacing) + gridAppliedSpacing,
                        y: elementCorner.y - (elementCorner.y % gridAppliedSpacing) + gridAppliedSpacing,
                    },
                ].filter(intersection =>
                    intersection.x > 0 &&
                    intersection.y > 0 &&
                    intersection.x < mainFrameBoundingRect.width &&
                    intersection.y < mainFrameBoundingRect.height
                );
                intersections.forEach(intersection => {
                    const distance = {
                        x: Math.abs(intersection.x - elementCorner.x),
                        y: Math.abs(intersection.y - elementCorner.y),
                    };
                    if (
                        ! ['vertical', 'diagonal'].includes(constraintDirection) &&
                        distance.x <= snappingThreshold &&
                        (
                            nearestPointDistance.x === null ||
                            distance.x < nearestPointDistance.x
                        )
                    ) {
                        nearestElementCorners[0].x = elementCorner.x;
                        nearestElementCorners[0].label =
                            (nearestElementCorners[0].label.split('-')?.[0] || '') +
                            '-' + elementCorner.label.split('-')[1];
                        nearestElementCorners = nearestElementCorners.filter(corner =>
                            corner.x === elementCorner.x || corner.x === null
                        );
                        nearestSnappingPoint.x = intersection.x;
                        nearestPointDistance.x = distance.x;
                    }
                    if (
                        ! ['horizontal', 'diagonal'].includes(constraintDirection) &&
                        distance.y <= snappingThreshold &&
                        (
                            nearestPointDistance.y === null ||
                            distance.y < nearestPointDistance.y
                        )
                    ) {
                        nearestElementCorners[0].y = elementCorner.y;
                        nearestElementCorners[0].label =
                            elementCorner.label.split('-')[0] +
                            '-' + (nearestElementCorners[0].label.split('-')?.[1] || '');
                        nearestElementCorners = nearestElementCorners.filter(corner =>
                            corner.y === elementCorner.y || corner.y === null
                        );
                        nearestSnappingPoint.y = intersection.y;
                        nearestPointDistance.y = distance.y;
                    }
                    if (distance.x === nearestPointDistance.x) {
                        const hasMatchingX = nearestElementCorners.some(corner => corner.x === elementCorner.x);
                        if (! hasMatchingX) {
                            nearestElementCorners.push({ x: elementCorner.x, label: elementCorner.label.split('-')[1] });
                        }
                    }
                    if (distance.y === nearestPointDistance.y) {
                        const hasMatchingY = nearestElementCorners.some(corner => corner.y === elementCorner.y);
                        if (! hasMatchingY) {
                            nearestElementCorners.push({ y: elementCorner.y, label: elementCorner.label.split('-')[0] });
                        }
                    }
                });
            }
        });

        // Apply snapping if found nearby points
        if (nearestSnappingPoint.x !== null || nearestSnappingPoint.y !== null) {
            if (nearestSnappingPoint.x !== null) {
                matrix.e += nearestSnappingPoint.x - nearestElementCorners[0].x;
            }
            if (nearestSnappingPoint.y !== null) {
                matrix.f += nearestSnappingPoint.y - nearestElementCorners[0].y;
            }
        }
    }

    // Apply the transformation to the element
    styleElement(selectedNode.node, 'transform', matrix.toString(), true);

    // Save the property value
    _metadata.properties['transform'] = { value: matrix.toString(), checked: true };
    setMetadata(selectedNode.node.dataset.uwId, _metadata);

    //
    updateSelectedNodeBoundingRect();
    refreshRulers();
    refreshSelectedBox();
    refreshDraggingConstraint(constraintDirection);
    refreshSnappingBox(nearestElementCorners);

    // Update the bounding rect of the selected node in the cached visible elements
    const visibleElementIndex = visibleInViewportElements.findIndex(item => item.node === selectedNode.node);
    if (visibleElementIndex !== -1) {
        visibleInViewportElements[visibleElementIndex].rect = selectedNodeBoundingRect;
    }
};

const resizeSelectedNode = (dx, dy, direction) => { /* TODO: implement this */ }

const refreshPanel = (event = {}) => {
    // To force the selection box to be recalculated,
    // hide the hovering box while transforming the selected node,
    // and adjust the main frame size
    if (event.detail?.transform) {
        previousSelectedNode = null;
        hoveredNodeBoundingRect = null;
        updateMainFrameSize();
    }

    // To hide the hovering box
    if (event.detail?.existence) {
        hoveredNodeBoundingRect = null;
    }

    //
    refreshCanvas();
    refreshRulers();
    refreshGrid();

    if (! isPanelReady) {
        isPanelReady = true;
    }
}

const refreshSelection = () => {
    updateSelectedNodeBoundingRect();
    refreshSelectedBox();

    if (
        selectedNode.node === hoveredNode.node &&
        ! hoveredBox?.classList.contains('hidden')
    ) {
        hoveredNodeBoundingRect = selectedNodeBoundingRect;
        refreshHoveredBox();
    }
}

const interruptAction = () => {
    if (isSelectingText) {
        isSelectingText = false;
        canvasOverlay.releasePointerCapture(dragPointerId);
        return;
    }

    if (isEditingText) {
        // Remove the contenteditable attribute from the hovered node
        // FIXME: handle the case when the user explicitly set the contenteditable attribute
        selectedNode.node?.removeAttribute('contenteditable');

        // Blur on the hovered node
        selectedNode.node?.blur();

        // Clear the text selection
        selectedNode.node?.ownerDocument.getSelection().removeAllRanges();

        //
        isEditingText = false;
        previousSelectedNode = selectedNode;

        // Refresh the selected box
        refreshSelectedBox();

        return;
    }

    if (isDragging) {
        // Flag to interrupt dragging
        dragStartPoint = null;
        isDragging = false;
        isDraggingInterrupted = true;
        canvasOverlay.releasePointerCapture(dragPointerId);

        // Remove the dragging constraint if exists
        draggingConstraint?.remove();
        draggingConstraint = null;

        // Remove the snapping box if exists
        snappingBox?.remove();
        snappingBox = null;

        if (dragPositionMode === 'free') {
            // Reset the transformation of the selected node
            styleElement(selectedNode.node, 'transform', dragStartMatrix.toString(), true);

            // Reset the property value
            const _metadata = metadata[selectedNode.node.dataset.uwId];
            _metadata.properties['transform'] = { value: dragStartMatrix.toString(), checked: true };
            setMetadata(selectedNode.node.dataset.uwId, _metadata);

            // Reset the dragging matrix
            dragStartMatrix = null;
            dragStartBoundingRect = null;
        }

        if (dragPositionMode === 'layout') {
            // Remove the dragged box
            draggingBox.remove();
            draggingBox = null;

            // Remove the dragging line
            draggingLine.remove();
            draggingLine = null;

            // Reset the dragging target and position
            dragTargetNode = null;
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
    // Prevent from triggering the window's mouse down event
    // which will emit an interrupt event
    event.stopImmediatePropagation();

    if (! isPanelReady) {
        return;
    }

    if (
        (getSpaceKeyState() && event.which === 1) || // left mouse button
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

    if (isSelectingText) {
        // Flag to stop selecting
        dragStartPoint = null;
        isSelectingText = false;
        canvasOverlay.releasePointerCapture(dragPointerId);

        return;
    }

    if (isEditingText) {
        // Remove the contenteditable attribute from the hovered node
        // FIXME: handle the case when the user explicitly set the contenteditable attribute
        selectedNode.node?.removeAttribute('contenteditable');

        // Blur on the hovered node
        selectedNode.node?.blur();

        // Clear the text selection
        selectedNode.node?.ownerDocument.getSelection().removeAllRanges();

        //
        isEditingText = false;
        previousSelectedNode = selectedNode;
    }

    if (isDragging) {
        // Flag to stop dragging
        dragStartPoint = null;
        isDragging = false;
        isDraggingJustDone = true;
        canvasOverlay.releasePointerCapture(dragPointerId);

        // Remove the dragging constraint if exists
        draggingConstraint?.remove();
        draggingConstraint = null;

        // Remove the snapping box if exists
        snappingBox?.remove();
        snappingBox = null;

        //
        console.log(`[Editor] Move element: @${selectedNode.node.dataset.uwId}${event.shiftKey ? ' (constrained)' : ''}`);

        if (dragPositionMode === 'free') {
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
            dragStartBoundingRect = null;
        }

        if (dragPositionMode === 'layout') {
            if (dragTargetNode) {
                // Save the current action state
                const previousState = {
                    container: selectedNode.parent,
                    position: selectedNode.position,
                };

                // Move the selected element to the target position
                dragTargetNode.insertAdjacentElement(dragTargetPosition, selectedNode.node);

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
            }

            // Remove the dragged box
            draggingBox.remove();
            draggingBox = null;

            // Remove the dragging line
            draggingLine.remove();
            draggingLine = null;

            // Reset the dragging target and position
            dragTargetNode = null;
            dragTargetPosition = null;
        }

        // Update the main frame size
        updateMainFrameSize();

        // Show the selected parent box
        updateSelectedNodeBoundingRect();
        refreshSelectedBox();

        // Show the hovered box
        setHoveredNode(selectedNode.node, selectedNode.position, selectedNode.parent);
        hoveredNodeBoundingRect = selectedNodeBoundingRect;
        refreshHoveredBox();

        setTimeout(() => {
            refreshRulers();
            refreshGrid();
        }, 0);

        return;
    }

    // Request to clear the selected node if there is no hovered nodes
    if (hoveredElements.length === 0) {
        setTimeout(() => {
            window.dispatchEvent(new CustomEvent('element:select', {
                detail: { target: 'canvas' }
            }));
        }, 0);
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

    //
    currentPointerX = event.clientX;
    currentPointerY = event.clientY;

    if (isPanning) {
        panCanvas(event.movementX, event.movementY);
        return;
    }

    if (getSpaceKeyState()) {
        return;
    }

    if (isPreparedToDrag) {
        // Check if the drag distance is enough to start dragging
        if (
            Math.abs(event.clientX - dragStartPoint.x) > snapFactor ||
            Math.abs(event.clientY - dragStartPoint.y) > snapFactor
        ) {
            //
            isPreparedToDrag = false;
            isDraggingInterrupted = false;
            canvasOverlay.setPointerCapture(dragPointerId);

            // Flag to start selecting text
            if (isEditingText) {
                isSelectingText = true;
                return;
            }

            if (! hoveredNode.node) {
                return;
            }

            // Request to update the selected node
            if (selectedNode.node !== hoveredNode.node) {
                setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('element:select', {
                        detail: {
                            uwId: hoveredNode.node.dataset.uwId,
                            uwPosition: hoveredNode.position,
                            uwParentId: hoveredNode.parent?.dataset.uwId,
                            target: 'canvas',
                        }
                    }));
                }, 0);
            }
            setSelectedNode(hoveredNode.node, hoveredNode.position, hoveredNode.parent);

            if (! selectedNodeBoundingRect) {
                updateSelectedNodeBoundingRect();
            }

            if (dragPositionMode === 'free') {
                // Re-calculate the dragging start point
                dragStartPoint = {
                    x: (dragStartPoint.x - mainFrameBoundingRect.left) / currentScale,
                    y: (dragStartPoint.y - mainFrameBoundingRect.top) / currentScale,
                };

                //
                dragStartBoundingRect = selectedNodeBoundingRect;

                // Get the current transformation matrix
                dragStartMatrix = new DOMMatrix(metadata[selectedNode.node.dataset.uwId].properties.transform?.value || 'matrix(1, 0, 0, 1, 0, 0)');
            }

            if (dragPositionMode === 'layout') {
                // Create a dragging box element to indicate the element being dragged
                draggingBox = document.createElement('div');
                draggingBox.setAttribute('data-uw-ignore', '');
                draggingBox.classList.add('dragged-box', 'hidden');
                canvasOverlay.appendChild(draggingBox);
                refreshDraggingBox();

                // Create a dragging line overlay element to show the position
                // where the dragged element will be placed
                draggingLine = document.createElement('div');
                draggingLine.setAttribute('data-uw-ignore', '');
                draggingLine.classList.add('dragging-line', 'hidden');
                canvasOverlay.appendChild(draggingLine);
            }

            // Flag to start dragging
            isDragging = true;

            // Hide the hovered box
            hoveredNodeBoundingRect = null;
            refreshHoveredBox();

            // Refresh the selected box
            refreshSelectedBox();
        }

        return;
    }

    if (isSelectingText) {
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
                            isSelectingText &&
                            (
                                currentPointerX < canvasOverlayRect.left ||
                                currentPointerX > canvasOverlayRect.right ||
                                currentPointerY < canvasOverlayRect.top ||
                                currentPointerY > canvasOverlayRect.bottom
                            )
                        )
                    ) {
                        dragAnimationRequestId = null;
                        mainFrame.style.willChange = 'unset'; // force repaint
                        setTimeout(() => mainFrame.style.willChange = 'transform', 250);
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
                    let pointerX = (event.clientX - mainFrameBoundingRect.left) / currentScale;
                    let pointerY = (event.clientY - mainFrameBoundingRect.top) / currentScale;
                    pointerX = Math.max(selectedNodeBoundingRect.left, Math.min(selectedNodeBoundingRect.right, pointerX));
                    pointerY = Math.max(selectedNodeBoundingRect.top, Math.min(selectedNodeBoundingRect.bottom, pointerY));
                    const selection = selectedNode.node.ownerDocument.getSelection();
                    const range = selectedNode.node.ownerDocument.createRange();
                    const newCaretPosition = hoveredNode.node.ownerDocument.caretPositionFromPoint(pointerX, pointerY);
                    if (! selectedNode.node.contains(newCaretPosition.offsetNode)) {
                        dragAnimationRequestId = requestAnimationFrame(continueDragging);
                        return;
                    }
                    range.setStart(selection.anchorNode, selection.anchorOffset);
                    range.collapse(true);
                    selection.removeAllRanges();
                    selection.addRange(range);
                    selection.extend(newCaretPosition.offsetNode, newCaretPosition.offset);
                    dragAnimationRequestId = requestAnimationFrame(continueDragging);
                    setTimeout(() => refreshGrid(), 0);
                };
                dragAnimationRequestId = requestAnimationFrame(continueDragging);
                return;
            }
        }

        // Get the cursor position relative to the iframe document
        let pointerX = (event.clientX - mainFrameBoundingRect.left) / currentScale;
        let pointerY = (event.clientY - mainFrameBoundingRect.top) / currentScale;

        // Limit the pointer position within the selected node bounding rect
        pointerX = Math.max(selectedNodeBoundingRect.left, Math.min(selectedNodeBoundingRect.right, pointerX));
        pointerY = Math.max(selectedNodeBoundingRect.top, Math.min(selectedNodeBoundingRect.bottom, pointerY));

        if (! hoveredNode.node) {
            return;
        }

        const selection = selectedNode.node.ownerDocument.getSelection();
        const range = selectedNode.node.ownerDocument.createRange();
        const newCaretPosition = hoveredNode.node.ownerDocument.caretPositionFromPoint(pointerX, pointerY);

        if (! selectedNode.node.contains(newCaretPosition.offsetNode)) {
            return;
        }

        // Update the document text selection
        range.setStart(selection.anchorNode, selection.anchorOffset);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        selection.extend(newCaretPosition.offsetNode, newCaretPosition.offset);

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
                        mainFrame.style.willChange = 'unset'; // force repaint
                        setTimeout(() => {
                            mainFrame.style.willChange = 'transform';
                            if (dragPositionMode === 'free') {
                                refreshDraggingConstraint(getShiftKeyState());
                            }
                        }, 250);
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
                    const clientX = (currentPointerX - mainFrameBoundingRect.left) / currentScale;
                    const clientY = (currentPointerY - mainFrameBoundingRect.top) / currentScale;
                    if (dragPositionMode === 'free') {
                        moveSelectedNode(clientX, clientY);
                    }
                    if (dragPositionMode === 'layout') {
                        refreshDraggingBox();
                        findHoveredElements(event, true);
                        hoveredNodeBoundingRect = hoveredNode.node?.getBoundingClientRect();
                        refreshDraggingLine();
                        refreshHoveredBox();
                    }
                    setTimeout(() => refreshGrid(), 0);
                    dragAnimationRequestId = requestAnimationFrame(continueDragging);
                };
                dragAnimationRequestId = requestAnimationFrame(continueDragging);
                return;
            }
        }

        const clientX = (event.clientX - mainFrameBoundingRect.left) / currentScale;
        const clientY = (event.clientY - mainFrameBoundingRect.top) / currentScale;
        if (dragPositionMode === 'free') {
            moveSelectedNode(clientX, clientY);
        }
        if (dragPositionMode === 'layout') {
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
    isPanelInFocus = true;
}

const onCanvasOverlayMouseLeave = () => {
    if (! isPanelReady) {
        return;
    }

    if (isSelectingText) {
        return;
    }

    // Set the hovered element
    setHoveredNode(null);

    //
    hoveredNodeBoundingRect = null;
    refreshHoveredBox();

    isPanelInFocus = false;
}

const onCanvasOverlayWheel = (event) => {
    if (! isPanelReady) {
        return;
    }

    if (isPanning) {
        return;
    }

    // FIXME: the horizontal scrolling is often not working
    // because the deltaX and deltaY are returning -0
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

const onWindowSpaceKeyPressed = (event) => {
    if (! isPanelReady) {
        return;
    }

    // To prevent from triggering browser's default behavior
    // after clicking a button by pressing the space key
    if (
        ! ['input', 'textarea'].includes(document.activeElement.tagName?.toLowerCase()) &&
        ! document.activeElement.isContentEditable
    ) {
        document.activeElement.blur();
    }

    if (event.detail.state) {
        // Clear the hovered element
        setHoveredNode(null);
        hoveredNodeBoundingRect = null;
        refreshHoveredBox();
        // Set the cursor style
        canvasOverlay.style.cursor = 'grab';
    } else {
        // Reset the cursor style
        canvasOverlay.style.cursor = 'default';
    }
}

const onWindowShiftKeyPressed = () => {
    if (! isPanelReady) {
        return;
    }

    // Toggle the dragging constraint of positioned elements being dragged
    if (isDragging && dragPositionMode === 'free') {
        // Restore the transformation of the selected node
        const matrix = new DOMMatrix(dragStartMatrix.toString());
        styleElement(selectedNode.node, 'transform', matrix.toString(), true);

        // Reposition the selected node
        const clientX = (currentPointerX - mainFrameBoundingRect.left) / currentScale;
        const clientY = (currentPointerY - mainFrameBoundingRect.top) / currentScale;
        moveSelectedNode(clientX, clientY);
    }
}

const onWindowCtrlKeyPressed = () => { /* TODO: implement this */ }

const onWindowAltKeyPressed = (event) => {
    if (! isPanelReady) {
        return;
    }

    if (event.detail.state) {
        findHoveredElements({
            clientX: currentPointerX,
            clientY: currentPointerY,
            altKey: true,
        }, true);
    }
}

const onWindowResize = () => {
    // To force the selection box to be recalculated
    previousSelectedNode = null;

    // Update the bounding rect of the canvas container
    canvasContainerBoundingRect = canvasContainer.getBoundingClientRect();

    updateRulerSize();
    updateGridSize();
    refreshPanel();
}

export const initialize = () => {
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
    window.addEventListener('canvas:select', refreshSelection);
    window.addEventListener('canvas:zoom', zoomCanvas);
    window.addEventListener('contextmenu:hide', findHoveredElements);
    window.addEventListener('editor:space', onWindowSpaceKeyPressed);
    window.addEventListener('editor:shift', onWindowShiftKeyPressed);
    window.addEventListener('editor:ctrl', onWindowCtrlKeyPressed);
    window.addEventListener('editor:alt', onWindowAltKeyPressed);
    window.addEventListener('editor:grid', refreshGrid);
    window.addEventListener('resize', onWindowResize);
}