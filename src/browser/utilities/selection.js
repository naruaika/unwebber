// This module contains functions related to element selection, such as single element selection,
// multiple element selection, marquee selection, etc. It is tightly coupled to the DocumentView component.

"use strict";

import { getShiftKeyState } from "../services/keybinding";
import { calculateTransformations, clearAllBoxes, drawBoundingBoxes } from "./canvas";

/** */
export function findElementsFromPoint(view, x, y) {
    return view.shadowRoot.elementsFromPoint(x, y).filter(e => e.hasAttribute("data-id"));
}

/** */
export function selectElements(view, elements = [], shiftKey = false) {
    // Normalize to an array
    if (! Array.isArray(elements)) {
        elements = [elements];
    }

    // Update the selected elements when the user is holding the shift key,
    // otherwise replace the selected elements
    if (shiftKey || getShiftKeyState()) {
        for (const element of elements) {
            if (view.selectedElements.includes(element)) {
                view.selectedElements.splice(view.selectedElements.indexOf(element), 1);
            } else {
                view.selectedElements.push(element);
            }
        }
    } else {
        view.selectedElements = elements;
    }

    clearAllBoxes(view);

    // Skip if there are no selected elements
    if (view.selectedElements.length === 0) {
        view.replaceStatus("Drag to marquee select. Click an object to select it.");
        return;
    }

    calculateTransformations(view);
    drawBoundingBoxes(view);

    // Update the status bar
    let status = "";
    if (view.selectedElements.length === 1) {
        status = `'${view.selectedElements[0].getAttribute("data-type")}' selected.`;
    } else {
        status = `${view.selectedElements.length} objects selected.`;
    }
    status += " Drag to move selection. Click another object to select it. Click on an empty area to clear selection.";
    view.replaceStatus(status);
}

/** */
export function selectMarqueedElements(view) {
    view.targetElements = [];

    const x1 = Math.min(view.startPoint.x, view.endPoint.x);
    const y1 = Math.min(view.startPoint.y, view.endPoint.y);
    const x2 = Math.max(view.startPoint.x, view.endPoint.x);
    const y2 = Math.max(view.startPoint.y, view.endPoint.y);
    const layerM0 = view.shadowRoot.getElementById("layerM0");

    for (const element of layerM0.children) {
        const left = parseFloat(element.getAttribute("data-bx"));
        const top = parseFloat(element.getAttribute("data-by"));
        const width = parseFloat(element.getAttribute("data-bwidth"));
        const height = parseFloat(element.getAttribute("data-bheight"));
        const right = left + width;
        const bottom = top + height;
        if (left >= x1 && top >= y1 && right <= x2 && bottom <= y2) {
            view.targetElements.push(element);
        }
    }

    clearAllBoxes(view);
    drawBoundingBoxes(view, false, getShiftKeyState());
}

/** */
export function selectOverlappedElements(view, elements) {
    const index = elements.indexOf(view.selectedElements[0]) + 1;
    view.selectElements(elements[index % elements.length]);
}