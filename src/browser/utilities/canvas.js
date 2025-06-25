// This module contains functions related to the canvas, such as zooming, translating, etc. It also
// includes functions related to canvas rendering, such as drawing a box around the selected elements,
// gridlines, guidelines, etc. It is tightly coupled to the DocumentView component. As for canvas
// interaction, it is still handled by the DocumentView component.

"use strict";

import { round } from "../helpers/number";
import { getSpaceKeyState } from "../services/keybinding";
import { getIndividualTransformationMode } from "../services/preference";
import { extractTransformationMatrix } from "./transform";

/** */
export function zoomToFitCanvas(view) {
    const margin = 50;
    const scale = Math.min(
        view.viewportRect.width / (view.width + margin * 2),
        view.viewportRect.height / (view.height + margin * 2),
    );
    const x = (view.viewportRect.width - view.width * scale) / 2;
    const y = (view.viewportRect.height - view.height * scale) / 2;
    view.translate = { x, y };
    view.scale = scale;
    view.rotate = 0;
}

/** */
export function panCanvas(view, dx, dy) {
    const x = dx / (view.scale >= 1 ? view.scale ** 0.05 : view.scale ** 0.000005);
    const y = dy / (view.scale >= 1 ? view.scale ** 0.05 : view.scale ** 0.000005);
    view.translate = { x: view.translate.x + x, y: view.translate.y + y };

    if (view.selectedElements.length > 0) {
        clearAllBoxes(view);
        if (! getSpaceKeyState()) {
            view.selectedOBRect.x += x;
            view.selectedOBRect.y += y;
            drawBoundingBoxes(view);
        }
    }
}

/** */
export function scaleCanvas(view, value, point) {
    const oldScale = view.scale;
    value = parseFloat(value);

    value = oldScale * value;
    value = Math.max(value, 0.01);
    value = Math.min(value, 10);
    view.scale = value;

    // Adjust the translation to keep the pivot point visually the same
    const x = (view.translate.x + point.x * (oldScale - 1)) + point.x * (1 - view.scale);
    const y = (view.translate.y + point.y * (oldScale - 1)) + point.y * (1 - view.scale);
    view.translate = { x, y };
}

/** */
export function rotateCanvas(view, value, point) {
    value = parseFloat(value);

    view.rotate = view.rotate + value;

    // Adjust the translation to keep the pivot point visually the same
    const radians = value * Math.PI / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const x = (point.x - (point.x * cos - point.y * sin)) * view.scale + view.translate.x;
    const y = (point.y - (point.x * sin + point.y * cos)) * view.scale + view.translate.y;
    view.translate = { x, y };
}

/** */
export function transformCanvas(view, event) {
    // Get the pointer position relative to the canvas
    const point = {
        x: (event.clientX - view.viewportRect.x - view.translate.x) / view.scale,
        y: (event.clientY - view.viewportRect.y - view.translate.y) / view.scale,
    };

    let deltaX = 0;
    let deltaY = 0;
    let scale = 1;

    // Zoom in or out
    if (event.ctrlKey) {
        scale -= (event.deltaY || event.deltaX) * view.scaleFactor;
        scaleCanvas(view, scale, { x: point.x, y: point.y });
    }

    // // Rotate
    // else if (event.altKey) {
    //     const rotate = view.rotateFactor * Math.sign((event.deltaY || event.deltaX));
    //     rotateCanvas(view, rotate, { x: point.x, y: point.y });
    // }

    // Scroll horizontally
    else if (event.shiftKey || event.deltaX) {
        const multiplier = view.scale >= 1 ? view.scale ** 0.05 : view.scale ** 0.000005;
        deltaX = (event.deltaY || event.deltaX) * view.scrollFactor / multiplier;
        view.translate = { x: view.translate.x - deltaX, y: view.translate.y };
    }

    // Scroll vertically
    else {
        const multiplier = view.scale >= 1 ? view.scale ** 0.05 : view.scale ** 0.000005;
        deltaY = (event.deltaY || event.deltaX) * view.scrollFactor / multiplier;
        view.translate = { x: view.translate.x, y: view.translate.y - deltaY };
    }

    if (view.selectedElements.length > 0) {
        if (scale === 1) {
            view.selectedOBRect.x -= deltaX;
            view.selectedOBRect.y -= deltaY;
        } else {
            // TODO: should find a workaround to calculate the new bounding rect
            // without having to re-calculate all the element bounding rects
            calculateAllElementBoundingRects(view);
            calculateOuterBoundingRect(view);
        }
        clearAllBoxes(view);
        drawBoundingBoxes(view);
    }
}

/** */
export function clearAllBoxes(view) {
    if (! view.isLayerF2Dirty) {
        return;
    }

    const layerF2 = view.shadowRoot.getElementById("layerF2");
    const context = layerF2.getContext("2d");
    context.clearRect(0, 0, layerF2.width, layerF2.height);

    view.isLayerF2Dirty = false;

    view.hideTransformationHandlers();
}

/** */
export function drawBoxes(view, fill = true, stroke = true, points = [], withCenter = false) {
    const layerF2 = view.shadowRoot.getElementById("layerF2");
    const context = layerF2.getContext("2d");
    const cradians = view.rotate * Math.PI / 180;

    for (const point of points) {
        let x = round(point.x1, 0);
        let y = round(point.y1, 0);
        const deltaX = round(point.x2, 0) - x;
        const deltaY = round(point.y2, 0) - y;
        const width = round(deltaX * Math.cos(-cradians) - deltaY * Math.sin(-cradians), 0);
        const height = round(deltaX * Math.sin(-cradians) + deltaY * Math.cos(-cradians), 0);
        const radians = parseFloat(point.rotate || 0) * Math.PI / 180;

        context.save();
        context.rotate(cradians);
        context.translate(x, y);

        if (radians !== 0) {
            context.translate(width / 2, height / 2);
            context.rotate(radians);
            context.translate(-width / 2, -height / 2);
        }

        if (fill) {
            context.fillStyle = "#0099FF44";
            context.fillRect(0, 0, width, height);
        }

        if (stroke) {
            context.lineWidth = 2;
            context.strokeStyle = "#0099FFFF";
            context.strokeRect(0, 0, width, height);
        }

        // if (withCenter) {
        //     if (radians !== 0) {
        //         context.translate(width / 2, height / 2);
        //         context.rotate(-radians);
        //         context.translate(-width / 2, -height / 2);
        //     }

        //     context.beginPath();
        //     context.moveTo(width / 2, height / 2 - 5);
        //     context.lineTo(width / 2, height / 2 + 5);
        //     context.stroke();

        //     context.moveTo(width / 2 - 5, height / 2);
        //     context.lineTo(width / 2 + 5, height / 2);
        //     context.stroke();
        // }

        context.restore();
    }

    view.isLayerF2Dirty = true;
}

/** */
export function drawSelectionBoxes(view, fill = true, stroke = true) {
    drawBoxes(view, fill, stroke, [{
        x1: view.startPoint.x,
        y1: view.startPoint.y,
        x2: view.endPoint.x,
        y2: view.endPoint.y,
    }]);
}

/** */
export function drawBoundingBoxes(view, withOuter = true, withSelection = true) {
    let points = [];
    let contextualElements = new Set();
    let outerBoundingRotate = 0;

    function calculateBoundingBoxes() {
        for (let index = 0; index < contextualElements.length; index++) {
            const element = contextualElements[index];
            const matrix = new DOMMatrix(element.style.transform);
            const rotate = extractTransformationMatrix(matrix.toString()).rotate;
            const width = parseFloat(element.style.width);
            const height = parseFloat(element.style.height);
            let x1 = matrix.e * view.scale + view.translate.x;
            let y1 = matrix.f * view.scale + view.translate.y;
            let x2 = (matrix.e + width) * view.scale + view.translate.x;
            let y2 = (matrix.f + height) * view.scale + view.translate.y;

            points.push({ x1, y1, x2, y2, rotate });

            if (getIndividualTransformationMode() || index === 0) {
                outerBoundingRotate = rotate;
            }
            if (rotate !== outerBoundingRotate) {
                outerBoundingRotate = 0;
            }
        }
    }

    if (withSelection) {
        for (const element of view.selectedElements) {
            contextualElements.add(element);
        }
    }
    for (const element of view.targetElements) {
        if (contextualElements.has(element)) {
            contextualElements.delete(element);
        } else {
            contextualElements.add(element);
        }
    }
    contextualElements = Array.from(contextualElements);

    if (contextualElements.length === 0) {
        return;
    }

    calculateBoundingBoxes();
    drawBoxes(view, false, true, points);

    if (withOuter) {
        points = [{
            x1: view.selectedOBRect.left,
            y1: view.selectedOBRect.top,
            x2: view.selectedOBRect.right,
            y2: view.selectedOBRect.bottom,
            rotate: outerBoundingRotate,
        }];

        drawBoxes(view, false, true, points, true);

        view.showTransformationHandlers(
            view.selectedOBRect.left,
            view.selectedOBRect.top,
            view.selectedOBRect.right - view.selectedOBRect.left,
            view.selectedOBRect.bottom - view.selectedOBRect.top,
            outerBoundingRotate,
        );
    }
}

/** */
export function calculateTransformations(view) {
    calculateAllElementBoundingRects(view);
    calculateOuterBoundingRect(view);

    for (const element of view.selectedElements) {
        const bleft = parseFloat(element.getAttribute("data-bx"));
        const btop = parseFloat(element.getAttribute("data-by"));
        const bwidth = parseFloat(element.getAttribute("data-bwidth"));
        const bheight = parseFloat(element.getAttribute("data-bheight"));
        const bright = bleft + bwidth;
        const bbottom = btop + bheight;
        const matrix = new DOMMatrix(element.style.transform || "matrix(1, 0, 0, 1, 0, 0)");

        element.setAttribute("data-transform", matrix.toString());
        element.setAttribute("data-width", element.style.width || "0");
        element.setAttribute("data-height", element.style.height || "0");
        element.setAttribute("data-xscale", element.style.scale.split(" ")[0] || "1");
        element.setAttribute("data-yscale", element.style.scale.split(" ")[1] || "1");
        element.setAttribute("data-x1ratio", Math.abs(bleft - view.selectedOBRect.left) / view.selectedOBRect.width);
        element.setAttribute("data-y1ratio", Math.abs(btop - view.selectedOBRect.top) / view.selectedOBRect.height);
        element.setAttribute("data-x2ratio", Math.abs(bright - view.selectedOBRect.right) / view.selectedOBRect.width);
        element.setAttribute("data-y2ratio", Math.abs(bbottom - view.selectedOBRect.bottom) / view.selectedOBRect.height);
    }
}

/** */
export function calculateAllElementBoundingRects(view) {
    const layerM0 = view.shadowRoot.getElementById("layerM0");
    for (const element of layerM0.children) {
        const boundingRect = element.getBoundingClientRect();
        element.setAttribute("data-bx", boundingRect.x - view.viewportRect.x);
        element.setAttribute("data-by", boundingRect.y - view.viewportRect.y);
        element.setAttribute("data-bwidth", boundingRect.width);
        element.setAttribute("data-bheight", boundingRect.height);
    }
}

/** */
export function calculateOuterBoundingRect(view) {
    let x1;
    let y1;
    let x2;
    let y2;

    for (let index = 0; index < view.selectedElements.length; index++) {
        const element = view.selectedElements[index];
        const left = parseFloat(element.getAttribute("data-bx"));
        const top = parseFloat(element.getAttribute("data-by"));
        const width = parseFloat(element.getAttribute("data-bwidth"));
        const height = parseFloat(element.getAttribute("data-bheight"));
        const right = left + width;
        const bottom = top + height;

        if (index === 0) {
            x1 = left;
            y1 = top;
            x2 = right;
            y2 = bottom;
        } else {
            x1 = Math.min(x1, left);
            y1 = Math.min(y1, top);
            x2 = Math.max(x2, right);
            y2 = Math.max(y2, bottom);
        }
    }

    view.selectedOBRect.x = x1;
    view.selectedOBRect.y = y1;
    view.selectedOBRect.width = x2 - x1;
    view.selectedOBRect.height = y2 - y1;
}