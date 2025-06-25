"use strict";

import { Component } from "../component.js";

import { getAltKeyState, getShiftKeyState, getSpaceKeyState } from "../../services/keybinding.js";
import { getIndividualTransformationMode } from "../../services/preference.js";
import { getSelectedTool, Tools } from "../../services/tool.js";

import { createRectangle } from "../../utilities/element.js";
import { zoomToFitCanvas, transformCanvas, clearAllBoxes, drawSelectionBoxes, drawBoundingBoxes, calculateTransformations, panCanvas, calculateAllElementBoundingRects } from "../../utilities/canvas.js";
import { findElementsFromPoint, selectElements, selectMarqueedElements, selectOverlappedElements } from "../../utilities/selection.js";
import { moveElements, resizeElements, rotateElements } from "../../utilities/transform.js";

import { random } from "../../helpers/string.js";

export class DocumentView extends Component {

    #cid = "document-view";

    /**
     * Defines the template of the component. We currently implement five layers for the rendering
     * purposes. The first layer (layerB1) is the background layer that is used to render any elements
     * which will not be included in the exported document or in the presentation mode. The second layer
     * (layerM0) is the main layer that is used to render the document content. The third layer (layerF1)
     * is the foreground layer that is used to render any helper elements such as the grid, margin, etc.
     * The fourth layer (layerF2) is the foreground layer that is used to render any interactive elements
     * such as the selection box, etc. The fifth layer (layerE0) is the event layer that is used to handle
     * the user interactions.
     */
    #template = `
        <style>
            :host {
                flex: 1;
                position: relative;
                background-color: var(--uwcolor-gray-100);
            }

            #layerB1,
            #layerM0,
            #layerF1,
            #layerF2,
            #layerE0 {
                position: absolute;
                inset: 0;
                user-select: none;
                transform: translateZ(0);
                transform-origin: 0 0;
            }

            #layerB1 {
                width: 0;
                height: 0;
                overflow: visible;
            }

            #layerM0 {
                background-color: white;
                overflow: hidden;
            }

            #layerF2 {
                image-rendering: pixelated;
                image-rendering: crisp-edges;
            }

            #layerE0 {
                #outer-bounding-box {
                    position: absolute;
                    translate: -100px -100px;
                    pointer-events: none;

                    .transform-handler {
                        position: absolute;
                        box-sizing: border-box;
                        width: 8px;
                        height: 8px;
                        box-sizing: border-box;
                        background-color: var(--uwcolor-base);
                        border: 2px solid #0099FF;
                        pointer-events: all;
                        user-select: none;
                        cursor: crosshair;

                        &.rotator,
                        &.shearer {
                            background-color: transparent;
                            border: none;
                        }

                        &.resizer {
                            &.top-left {
                                left: -4px;
                                top: -4px;
                            }
                            &.middle-top {
                                left: calc(50% - 4px);
                                top: -4px;
                            }
                            &.top-right {
                                left: calc(100% - 4px);
                                top: -4px;
                            }
                            &.middle-left {
                                left: -4px;
                                top: calc(50% - 4px);
                            }
                            &.middle-right {
                                left: calc(100% - 4px);
                                top: calc(50% - 4px);
                            }
                            &.bottom-left {
                                left: -4px;
                                top: calc(100% - 4px);
                            }
                            &.middle-bottom {
                                left: calc(50% - 4px);
                                top: calc(100% - 4px);
                            }
                            &.bottom-right {
                                left: calc(100% - 4px);
                                top: calc(100% - 4px);
                            }
                        }
                        &.rotator {
                            &.top-left {
                                left: -12px;
                                top: -12px;
                            }
                            &.top-right {
                                left: calc(100% + 4px);
                                top: -12px;
                            }
                            &.bottom-left {
                                left: -12px;
                                top: calc(100% + 4px);
                            }
                            &.bottom-right {
                                left: calc(100% + 4px);
                                top: calc(100% + 4px);
                            }
                        }
                        &.shearer {
                            &.middle-left {
                                left: -12px;
                                top: calc(50% - 11px);
                                width: 6px;
                                height: 22px;
                            }
                            &.middle-right {
                                left: calc(100% + 6px);
                                top: calc(50% - 11px);
                                width: 6px;
                                height: 22px;
                            }
                            &.middle-top {
                                left: calc(50% - 11px);
                                top: -12px;
                                width: 22px;
                                height: 6px;
                            }
                            &.middle-bottom {
                                left: calc(50% - 11px);
                                top: calc(100% + 6px);
                                width: 22px;
                                height: 6px;
                            }
                        }
                    }
                }
            }
        </style>

        <div id="layerB1"></div>
        <div id="layerM0"></div>
        <canvas id="layerF1"></canvas>
        <canvas id="layerF2"></canvas>
        <div id="layerE0"></div>
    `;

    #vid = "document-view";

    #title = "Untitled";

    #units = "px";

    #width = 1280;
    #height = 720;

    #translate = { x: 0, y: 0 };
    #rotate = 0;
    #scale = 1.0;

    scrollFactor = 0.25;
    scaleFactor = 0.0005;
    rotateFactor = 5;

    targetElements = [];
    selectedElements = [];
    targetOBHandle = null;
    selectedOBRect = new DOMRect();
    selectedOBBox = null;

    isMarqueeSelecting = false;
    isDelayedSelecting = false;
    isReadyForCycleSelection = false;
    isInserting = false;
    isReadyToDrag = false;
    isDragging = false;
    isResizing = false;
    isRotating = false;
    isShearing = false;
    isPanning = false;
    isLayerF2Dirty = false;

    pivotPoint = { x: 0, y: 0 };
    startPoint = { x: 0, y: 0 };
    endPoint = { x: 0, y: 0 };

    selectionTimeout = null;
    selectionDelay = 250;
    draggingThreshold = 2;
    transformationAxis = null;
    transformationDirection = null;
    panningTimeout = null;

    viewportRect = new DOMRect();
    resizeObserver = null;

    get vid() {
        return this.#vid;
    }

    set vid(value) {
        this.#vid = `${value}-${random()}`;
        this.id = this.#vid;
    }

    get title() {
        return this.#title;
    }

    set title(value) {
        this.#title = value;
    }

    get units() {
        return this.#units;
    }

    set units(value) {
        this.#units = value;
    }

    get width() {
        return this.#width;
    }

    set width(value) {
        this.#width = value;
    }

    get height() {
        return this.#height;
    }

    set height(value) {
        this.#height = value;
    }

    get translate() {
        return this.#translate;
    }

    set translate(value) {
        this.#translate = value;

        if (! this.shadowRoot) {
            return;
        }

        const x = parseFloat(value.x);
        const y = parseFloat(value.y);

        const layerB1 = this.shadowRoot.getElementById("layerB1");
        const layerM0 = this.shadowRoot.getElementById("layerM0");

        layerB1.style.translate = `${x}px ${y}px`;
        layerM0.style.translate = `${x}px ${y}px`;
    }

    get rotate() {
        return this.#rotate;
    }

    set rotate(value) {
        this.#rotate = value;

        if (! this.shadowRoot) {
            return;
        }

        value = parseFloat(value);
        value = value % 360; // normalize the value

        const layerB1 = this.shadowRoot.getElementById("layerB1");
        const layerM0 = this.shadowRoot.getElementById("layerM0");

        layerB1.style.rotate = `${value}deg`;
        layerM0.style.rotate = `${value}deg`;
    }

    get scale() {
        return this.#scale;
    }

    set scale(value) {
        this.#scale = value;

        if (! this.shadowRoot) {
            return;
        }

        value = parseFloat(value);
        value = Math.max(value, 0.01);
        value = Math.min(value, 10);

        const layerB1 = this.shadowRoot.getElementById("layerB1");
        const layerM0 = this.shadowRoot.getElementById("layerM0");

        layerB1.style.scale = value;
        layerM0.style.scale = value;
    }

    constructor(settings) {
        super();

        this.vid = this.#vid;
        this.title = settings.name || this.#title;
        this.units = settings.units || this.#units;

        this.width = settings.width || this.#width;
        this.height = settings.height || this.#height;

        this.cid = this.#cid;
        this.template = this.#template;

        this.onPointerDown = this.onPointerDown.bind(this);
        this.onPointerUp = this.onPointerUp.bind(this);
        this.onPointerMove = this.onPointerMove.bind(this);
        this.onWheel = this.onWheel.bind(this);

        this.onToolChange = this.onToolChange.bind(this);
        this.onWindowKeyDown = this.onWindowKeyDown.bind(this);
        this.onWindowMouseUp = this.onWindowMouseUp.bind(this);
        this.onWindowSpaceKeyStateChange = this.onWindowSpaceKeyStateChange.bind(this);
        this.onWindowShiftKeyStateChange = this.onWindowShiftKeyStateChange.bind(this);

        this.onViewportResize = this.onViewportResize.bind(this);
    }

    mounted() {
        const layerM0 = this.shadowRoot.getElementById("layerM0");
        layerM0.style.width = `${this.width}${this.units}`;
        layerM0.style.height = `${this.height}${this.units}`;

        const layerE0 = this.shadowRoot.getElementById("layerE0");
        layerE0.addEventListener('pointerdown', this.onPointerDown);
        layerE0.addEventListener('pointerup', this.onPointerUp);
        layerE0.addEventListener('pointermove', this.onPointerMove);
        layerE0.addEventListener('wheel', this.onWheel, { passive: true });

        window.addEventListener("toolchange", this.onToolChange);
        window.addEventListener("keydown", this.onWindowKeyDown);
        window.addEventListener("mouseup", this.onWindowMouseUp);
        window.addEventListener("keystate:space", this.onWindowSpaceKeyStateChange);
        window.addEventListener("keystate:shift", this.onWindowShiftKeyStateChange);

        this.resizeObserver = new ResizeObserver(this.onViewportResize);
        this.resizeObserver.observe(this);

        this.onViewportResize();

        if (! this.selectedOBBox) {
            this.initializeSelectedOBBox();
        }

        this.replaceCursor(getSelectedTool());
        this.replaceStatus("Drag to marquee select. Click an object to select it.");
    }

    unmounted() {
        this.resizeObserver = null;

        const layerE0 = this.shadowRoot.getElementById("layerE0");
        layerE0.removeEventListener('pointerdown', this.onPointerDown);
        layerE0.removeEventListener('pointerup', this.onPointerUp);
        layerE0.removeEventListener('pointermove', this.onPointerMove);
        layerE0.removeEventListener('wheel', this.onWheel);

        window.removeEventListener("toolchange", this.onToolChange);
        window.removeEventListener("keydown", this.onWindowKeyDown);
        window.removeEventListener("mouseup", this.onWindowMouseUp);
        window.removeEventListener("keystate:space", this.onWindowSpaceKeyStateChange);
        window.removeEventListener("keystate:shift", this.onWindowShiftKeyStateChange);

        this.replaceStatus();
    }

    /** */
    onViewportResize(event) {
        this.viewportRect = this.getBoundingClientRect();

        const layerF1 = this.shadowRoot.getElementById("layerF1");
        const layerF2 = this.shadowRoot.getElementById("layerF2");

        layerF1.width = this.viewportRect.width;
        layerF1.height = this.viewportRect.height;

        layerF2.width = this.viewportRect.width;
        layerF2.height = this.viewportRect.height;

        zoomToFitCanvas(this);

        if (this.selectedElements.length > 0) {
            selectElements(this, this.selectedElements);
        }
    };

    /** */
    onPointerDown(event) {
        this.capturePointer(event.pointerId);

        function saveCurrentOBRect(self) {
            // Save the current state of the outer bounding rect for incremental changes
            // especially for when the user transforms element(s) without calling getBoundingClientRect()
            // for each selected element which will trigger the browser' expensive relayout/reflow
            self.selectedOBRect.previous = {
                x: self.selectedOBRect.x,
                y: self.selectedOBRect.y,
                width: self.selectedOBRect.width,
                height: self.selectedOBRect.height,
                left: self.selectedOBRect.left,
                top: self.selectedOBRect.top,
                right: self.selectedOBRect.right,
                bottom: self.selectedOBRect.bottom,
            };
        }

        function shouldTransformElements(self) {
            if (event.target.hasAttribute("data-type")) {
                self.replaceCursor(Tools.rectangle);

                self.targetOBHandle = event.target;
                self.targetOBHandle.classList.add("selected");

                calculateTransformations(self);

                switch (self.targetOBHandle.getAttribute("data-type")) {
                    case "resizer":
                        const direction = self.targetOBHandle.getAttribute("data-dir");
                        switch (direction) {
                            // case "top-left":
                            //     self.startPoint = { x: self.selectedOBRect.right, y: self.selectedOBRect.bottom };
                            //     self.transformationAxis = "both";
                            //     break;
                            // case "middle-top":
                            //     self.startPoint = { x: self.selectedOBRect.left + self.selectedOBRect.width / 2, y: self.selectedOBRect.bottom }
                            //     self.transformationAxis = "vertical";
                            //     break;
                            // case "top-right":
                            //     self.startPoint = { x: self.selectedOBRect.left, y: self.selectedOBRect.bottom };
                            //     self.transformationAxis = "both";
                            //     break;
                            // case "middle-left":
                            //     self.startPoint = { x: self.selectedOBRect.right, y: self.selectedOBRect.bottom - self.selectedOBRect.height / 2 };
                            //     self.transformationAxis = "horizontal";
                            //     break;
                            // case "middle-right":
                            //     self.startPoint = { x: self.selectedOBRect.left, y: self.selectedOBRect.bottom - self.selectedOBRect.height / 2 };
                            //     self.transformationAxis = "horizontal";
                            //     break;
                            // case "bottom-left":
                            //     self.startPoint = { x: self.selectedOBRect.right, y: self.selectedOBRect.top };
                            //     self.transformationAxis = "both";
                            //     break;
                            // case "middle-bottom":
                            //     self.startPoint = { x: self.selectedOBRect.left + self.selectedOBRect.width / 2, y: self.selectedOBRect.top }
                            //     self.transformationAxis = "vertical";
                            //     break;
                            case "bottom-right":
                                self.startPoint = { x: self.selectedOBRect.left, y: self.selectedOBRect.top };
                                self.transformationAxis = "both";
                                break;
                        }
                        if (getIndividualTransformationMode()) {
                            self.startPoint = { x: event.clientX - self.viewportRect.x, y: event.clientY - self.viewportRect.y };
                        }
                        self.transformationDirection = direction;
                        self.isResizing = true;
                        break;

                    case "rotator":
                        self.pivotPoint = {
                            x: self.selectedOBRect.left + self.selectedOBRect.width / 2,
                            y: self.selectedOBRect.top + self.selectedOBRect.height / 2,
                        };
                        self.startPoint = { x: event.clientX - self.viewportRect.x, y: event.clientY - self.viewportRect.y };
                        self.isRotating = true;
                        break;

                    case "shearer":
                        self.isShearing = true;
                        break;
                }

                return true;
            }

            return false;
        }

        // Prepare to pan the canvas by pressing the space key and the left mouse button
        // or pressing the middle mouse button
        if ((getSpaceKeyState() && event.which === 1) || event.which === 2) {
            const layerE0 = this.shadowRoot.getElementById("layerE0");
            layerE0.style.cursor = "grabbing";

            if (event.which === 2 && this.selectedElements.length > 0) {
                clearAllBoxes(this);
            }

            this.isPanning = true;

            // Prevent from triggering the auto-scrolling feature of the browser window
            event.preventDefault();

            // Dispatch a mouse down event to the window to remove the focus from any context menu
            window.dispatchEvent(new MouseEvent("mousedown"));

            return;
        }

        // Prepare to select, drag, or transform any element by pressing the left mouse button
        if (getSelectedTool() === Tools.selection && event.which === 1) {
            if (shouldTransformElements(this)) {
                saveCurrentOBRect(this);
                return;
            }

            this.startPoint = { x: event.offsetX, y: event.offsetY };
            this.endPoint = this.startPoint;

            // Check if the pointer location within the outer bounding box of the selected elements
            // so that we can enable the user to drag the selected elements without accidentally
            // selecting another element or deselecting an element already selected immediately
            // after the user presses the left mouse button by setting a timeout. Once the timeout
            // is over, releasing the left mouse button will not trigger the delayed selection.
            if (
                this.selectedElements.length > 0
                && this.startPoint.x >= this.selectedOBRect.x
                && this.startPoint.y >= this.selectedOBRect.y
                && this.startPoint.x <= this.selectedOBRect.x + this.selectedOBRect.width
                && this.startPoint.y <= this.selectedOBRect.y + this.selectedOBRect.height
            ) {
                this.isDelayedSelecting = true;
                this.isReadyForCycleSelection = true;
                this.isReadyToDrag = true;

                this.selectionTimeout = setTimeout(() => {
                    this.isDelayedSelecting = false;
                    this.isReadyForCycleSelection = false;
                }, this.selectionDelay);

                saveCurrentOBRect(this);

                return;
            }

            // Find any elements under the pointer location
            const x = this.startPoint.x + this.viewportRect.x;
            const y = this.startPoint.y + this.viewportRect.y;
            let elements = findElementsFromPoint(this, x, y);
            if (elements.length > 0) {
                // Delay the selection of the element until the user releases the left mouse button
                // so that we can prevent from unexpected behavior when the user presses the left
                // mouse button on an element which is not in the previous candidate selection list
                // while the user has the intention to cycle through the selection list
                if (! getAltKeyState()) {
                    selectElements(this, elements[0]);
                }

                this.isReadyForCycleSelection = true;
                this.isReadyToDrag = true;

                this.selectionTimeout = setTimeout(() => {
                    this.isReadyForCycleSelection = false;
                }, this.selectionDelay);

                saveCurrentOBRect(this);

                return;
            }

            // Clear selections except when the user is holding the shift key
            // to prevent the user from accidentally deselecting elements
            if (! getShiftKeyState()) {
                selectElements(this);
            }

            // Prepare for marquee selection
            calculateAllElementBoundingRects(this);
            this.isMarqueeSelecting = true;

            saveCurrentOBRect(this);

            return;
        }

        // Prepare to insert a new Rectangle element by pressing the left mouse button
        if (getSelectedTool() === Tools.rectangle && event.which === 1) {
            if (shouldTransformElements(this)) {
                return;
            }

            this.startPoint = { x: event.offsetX, y: event.offsetY };
            this.endPoint = this.startPoint;
            this.transformationAxis = "both";
            this.transformationDirection = "bottom-right";
            this.isDelayedSelecting = true;
            this.isInserting = true;

            this.selectionTimeout = setTimeout(() => {
                this.isDelayedSelecting = false;
            }, this.selectionDelay);

            return;
        }
    }

    /** */
    onPointerUp(event) {
        let isSelectionCycled = false;
        const isAltKeyPressed = getAltKeyState();
        const isSpaceKeyPressed = getSpaceKeyState();

        this.releasePointer(event.pointerId);

        // Commit the marquee selection
        if (this.isMarqueeSelecting) {
            this.isMarqueeSelecting = false;
            if (this.targetElements.length > 0) {
                const newElements = this.targetElements;
                this.targetElements = [];
                selectElements(this, newElements);
            } else {
                clearAllBoxes(this);
                if (this.selectedElements.length > 0) {
                    drawBoundingBoxes(this);
                }
            }
        }

        // Commit the cycle selection
        if (this.isReadyForCycleSelection) {
            clearTimeout(this.selectionTimeout);
            if (isAltKeyPressed) {
                const x = this.startPoint.x + this.viewportRect.x;
                const y = this.startPoint.y + this.viewportRect.y;
                let elements = findElementsFromPoint(this, x, y);
                if (elements.length > 0) {
                    selectOverlappedElements(this, elements);
                    isSelectionCycled = true;
                }
            }
            this.isReadyForCycleSelection = false;
        }

        // Commit the delayed selection
        if (this.isDelayedSelecting) {
            if (! isSelectionCycled) {
                const x = this.startPoint.x + this.viewportRect.x;
                const y = this.startPoint.y + this.viewportRect.y;
                let elements = findElementsFromPoint(this, x, y);
                if (elements.length > 0) {
                    selectElements(this, elements[0]);
                } else {
                    selectElements(this);
                }
            }
            this.isDelayedSelecting = false;
            this.isInserting = false;
        }

        if (this.isReadyToDrag) {
            this.isReadyToDrag = false;
        }

        // Commit the insertion
        if (this.isInserting) {
            if (this.targetElements.length > 0) {
                const newElements = this.targetElements;
                this.targetElements = [];
                selectElements(this, newElements);
            }
            this.isInserting = false;
        }

        // Commit the dragging
        if (this.isDragging) {
            this.isDragging = false;
        }

        // Commit the transformation
        if (this.isResizing || this.isRotating || this.isShearing) {
            this.replaceCursor(getSelectedTool());

            this.targetOBHandle.classList.remove("selected");
            this.targetOBHandle = null;

            this.isResizing = false;
            this.isRotating = false;
            this.isShearing = false;
        }

        // Commit the panning
        if (this.isPanning) {
            if (! isSpaceKeyPressed) {
                this.replaceCursor(getSelectedTool());
                if (this.selectedElements.length > 0) {
                    drawBoundingBoxes(this);
                }
            }
            this.isPanning = false;
        }
    }

    /** */
    onPointerMove(event) {
        if (this.isReadyToDrag) {
            this.endPoint = { x: event.offsetX, y: event.offsetY };

            if (
                Math.abs(this.startPoint.x - this.endPoint.x) >= this.draggingThreshold
                || Math.abs(this.startPoint.y - this.endPoint.y) >= this.draggingThreshold
            ) {
                clearTimeout(this.selectionTimeout);
                this.isDelayedSelecting = false;
                this.isReadyForCycleSelection = false;
                this.isReadyToDrag = false;
                this.isDragging = true;

                for (const element of this.selectedElements) {
                    element.setAttribute("data-transform", element.style.transform);
                }
            }
        }

        if (this.isMarqueeSelecting) {
            this.endPoint = { x: event.offsetX, y: event.offsetY };
            selectMarqueedElements(this);
            drawSelectionBoxes(this);
        }

        if (this.isDragging) {
            this.endPoint = { x: event.offsetX, y: event.offsetY };
            moveElements(this, this.selectedElements);
            clearAllBoxes(this);
            drawBoundingBoxes(this);
        }

        if (this.isInserting) {
            this.endPoint = { x: event.offsetX, y: event.offsetY };

            if (this.targetElements.length === 0) {
                this.targetElements = [createRectangle()];
                const layerM0 = this.shadowRoot.getElementById("layerM0");
                layerM0.append(this.targetElements[0]);
                clearTimeout(this.selectionTimeout);
                this.isDelayedSelecting = false;
            }

            resizeElements(this, this.targetElements);
            clearAllBoxes(this);
            drawBoundingBoxes(this, false, false);
        }

        if (this.isResizing) {
            this.endPoint = { x: event.offsetX, y: event.offsetY };
            resizeElements(this, this.selectedElements);
            clearAllBoxes(this);
            drawBoundingBoxes(this);
        }

        if (this.isRotating) {
            this.endPoint = { x: event.offsetX, y: event.offsetY };
            rotateElements(this, this.selectedElements);
            clearAllBoxes(this);
            drawBoundingBoxes(this);
        }

        if (this.isRotating) { /* TODO */ }

        if (this.isShearing) { /* TODO */ }

        if (this.isPanning) {
            panCanvas(this, event.movementX, event.movementY);
        }
    }

    /** */
    onWheel(event) {
        if (
            this.isMarqueeSelecting
            || this.isInserting
            || this.isResizing
            || this.isRotating
            || this.isShearing
            || this.isPanning
        ) {
            return;
        }

        // FIXME: the horizontal scroll doesn't work when the user has Logi Options+ running
        // in the background as it always returning -0 for the event.deltaX. From reading the
        // issue reports on Visual Studio Code and Electron GitHub repositories, it seems that
        // Logi Options+ hard-coded for which applications it should send the horizontal scroll.
        transformCanvas(this, event);
    }

    /** */
    onWindowKeyDown(event) {
        if (event.key === 'Escape') {
            this.interruptAction();
        }
    }

    /** */
    onWindowMouseUp(event) {
        const layerE0 = this.shadowRoot.getElementById("layerE0");
        layerE0.dispatchEvent(new PointerEvent("pointerup"));
    }

    /** */
    onToolChange(event) {
        clearAllBoxes(this);
        drawBoundingBoxes(this);
        this.replaceCursor(event.detail);
    }

    /** */
    onWindowSpaceKeyStateChange(event) {
        if (event.detail.state) {
            if (this.selectedElements.length > 0) {
                clearAllBoxes(this);
            }
            if (this.isPanning) {
                return;
            }
            this.replaceCursor(Tools.pancanvas);
        } else {
            if (this.selectedElements.length > 0) {
                selectElements(this, this.selectedElements);
            }
            if (this.isPanning) {
                return;
            }
            this.replaceCursor(getSelectedTool());
        }
    }

    /** */
    onWindowShiftKeyStateChange(event) {
        if (this.isMarqueeSelecting) {
            clearAllBoxes(this);
            drawBoundingBoxes(this, false, getShiftKeyState());
            drawSelectionBoxes(this);
        }
    }

    /** */
    initializeSelectedOBBox() {
        const layerE0 = this.shadowRoot.getElementById("layerE0");

        // Create the outer bounding box for the selected elements
        const bBox = document.createElement("div");
        bBox.id = "outer-bounding-box";

        // Create the transformation handlers of the outer bounding box
        const Handlers = [
            // { type: "resizer", dir: "top-left" },
            // { type: "resizer", dir: "middle-top" },
            // { type: "resizer", dir: "top-right" },
            // { type: "resizer", dir: "middle-left" },
            // { type: "resizer", dir: "middle-right" },
            // { type: "resizer", dir: "bottom-left" },
            // { type: "resizer", dir: "middle-bottom" },
            { type: "resizer", dir: "bottom-right" },
            // { type: "rotator", dir: "top-left" },
            // { type: "rotator", dir: "top-right" },
            // { type: "rotator", dir: "bottom-left" },
            // { type: "rotator", dir: "bottom-right" },
            // { type: "shearer", dir: "middle-left" },
            // { type: "shearer", dir: "middle-right" },
            // { type: "shearer", dir: "middle-top" },
            // { type: "shearer", dir: "middle-bottom" },
        ];
        for (const Handler of Handlers) {
            const tHandler = document.createElement("div");
            tHandler.classList.add("transform-handler", Handler.type, Handler.dir);
            tHandler.setAttribute("data-type", Handler.type);
            tHandler.setAttribute("data-dir", Handler.dir);
            bBox.appendChild(tHandler);
        }

        layerE0.appendChild(bBox);
        this.selectedOBBox = bBox;
    }

    /** */
    hideTransformationHandlers() {
        this.selectedOBBox.style.translate = "-100px -100px";
        this.selectedOBBox.style.width = "0px";
        this.selectedOBBox.style.height = "0px";
    }

    /** */
    showTransformationHandlers(x1, y1, width, height, rotate) {
        x1 = parseFloat(x1);
        y1 = parseFloat(y1);
        width = parseFloat(width);
        height = parseFloat(height);

        const verticals = this.selectedOBBox.querySelectorAll(".middle-top, .middle-bottom");
        const horizontals = this.selectedOBBox.querySelectorAll(".middle-left, .middle-right");

        this.selectedOBBox.style.translate = `${x1}px ${y1}px`;
        this.selectedOBBox.style.width = `${width}px`;
        this.selectedOBBox.style.height = `${height}px`;
        this.selectedOBBox.style.rotate = `${rotate}deg`;

        // Show/hide some handles when the bounding box is too small
        if (width < 20) {
            verticals.forEach((handler) => handler.style.display = "none");
        } else {
            verticals.forEach((handler) => handler.style.display = "block");
        }
        if (height < 20) {
            horizontals.forEach((handler) => handler.style.display = "none");
        } else {
            horizontals.forEach((handler) => handler.style.display = "block");
        }
    }

    /** */
    capturePointer(pointerId) {
        const layerE0 = this.shadowRoot.getElementById("layerE0");
        layerE0.setPointerCapture(pointerId);
    }

    /** */
    releasePointer(pointerId) {
        const layerE0 = this.shadowRoot.getElementById("layerE0");
        if (layerE0.hasPointerCapture(pointerId)) {
            layerE0.releasePointerCapture(pointerId);
        }
    }

    /** */
    interruptAction() {
        // Cancel the marquee selection
        if (this.isMarqueeSelecting) {
            if (this.targetElements.length > 0) {
                this.targetElements = [];
            }
            clearAllBoxes(this);
            if (this.selectedElements.length > 0) {
                drawBoundingBoxes(this);
            }
            this.isMarqueeSelecting = false;
            return;
        }

        // Cancel the insertion
        if (this.isInserting) {
            if (this.targetElements.length > 0) {
                this.targetElements[0].remove();
                this.targetElements = [];
            }
            clearAllBoxes(this);
            if (this.selectedElements.length > 0) {
                drawBoundingBoxes(this);
            } else {
                this.hideTransformationHandlers();
            }
            this.isInserting = false;
            return;
        }

        // Cancel the dragging
        if (this.isDragging) {
            for (const element of this.selectedElements) {
                element.style.transform = element.getAttribute("data-transform");
            }

            this.selectedOBRect.x = this.selectedOBRect.previous.x;
            this.selectedOBRect.y = this.selectedOBRect.previous.y;
            this.selectedOBRect.width = this.selectedOBRect.previous.width;
            this.selectedOBRect.height = this.selectedOBRect.previous.height;

            clearAllBoxes(this);
            drawBoundingBoxes(this);
            this.isDragging = false;

            return;
        }

        // Cancel the transformation
        if (this.isResizing || this.isRotating || this.isShearing) {
            this.replaceCursor(getSelectedTool());

            this.targetOBHandle.classList.remove("selected");
            this.targetOBHandle = null;

            for (const element of this.selectedElements) {
                element.style.transform = element.getAttribute("data-transform");
                element.style.width = element.getAttribute("data-width");
                element.style.height = element.getAttribute("data-height");
            }

            this.selectedOBRect.x = this.selectedOBRect.previous.x;
            this.selectedOBRect.y = this.selectedOBRect.previous.y;
            this.selectedOBRect.width = this.selectedOBRect.previous.width;
            this.selectedOBRect.height = this.selectedOBRect.previous.height;

            clearAllBoxes(this);
            drawBoundingBoxes(this);

            this.isResizing = false;
            this.isRotating = false;
            this.isShearing = false;

            return;
        }

        // Clear the selection
        if (this.selectedElements.length > 0) {
            selectElements(this);
        }
    }

    /** */
    replaceCursor(tool = Tools.selection) {
        const layerE0 = this.shadowRoot.getElementById("layerE0");

        switch (tool) {
            case Tools.selection:
                layerE0.style.cursor = "initial";
                break;
            case Tools.rectangle:
            case Tools.frametext:
                layerE0.style.cursor = "crosshair";
                break;
            case Tools.pancanvas:
                layerE0.style.cursor = "grab";
                break;
        }
    }

    /** */
    replaceStatus(text = "") {
        window.dispatchEvent(new CustomEvent("statuschange", { detail: text }));
    }
}

customElements.define("document-view", DocumentView);