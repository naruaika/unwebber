// This module contains functions related to element transformation, such as scaling, rotating, etc.
// It is tightly coupled to the DocumentView component. As for canvas transformation, there is a separate module.

"use strict";

/** */
export function moveElements(view, elements) {
    const x = (view.endPoint.x - view.startPoint.x) / view.scale;
    const y = (view.endPoint.y - view.startPoint.y) / view.scale;

    for (const element of elements) {
        const matrix = new DOMMatrix(element.getAttribute("data-transform"));
        matrix.e += x;
        matrix.f += y;
        element.style.transform = matrix.toString();
    }

    view.selectedOBRect.x = view.selectedOBRect.previous.x + (x * view.scale);
    view.selectedOBRect.y = view.selectedOBRect.previous.y + (y * view.scale);
}

/** */
export function resizeElements(view, elements) {
    // Normalize to an array
    if (! Array.isArray(elements)) {
        elements = [elements];
    }

    let x1;
    let y1;
    let x2;
    let y2;
    let width;
    let height;
    // let ratioX1;
    // let ratioY1;
    // let ratioX2;
    // let ratioY2;
    let matrix;

    x1 = (Math.min(view.startPoint.x, view.endPoint.x) - view.translate.x) / view.scale;
    y1 = (Math.min(view.startPoint.y, view.endPoint.y) - view.translate.y) / view.scale;
    x2 = (Math.max(view.startPoint.x, view.endPoint.x) - view.translate.x) / view.scale;
    y2 = (Math.max(view.startPoint.y, view.endPoint.y) - view.translate.y) / view.scale;

    // FIXME: sometimes the element' bounding box is randomly shifted by 1 pixel especially when doing a flip
    for (const element of elements) {
        matrix = new DOMMatrix(element.getAttribute("data-transform"));

        // if (getIndividualTransformationMode() && ! view.isInserting) {
        //     x1 = parseFloat(element.getAttribute("data-x"));
        //     y1 = parseFloat(element.getAttribute("data-y"));
        //     x2 = x1 + parseFloat(element.getAttribute("data-width"));
        //     y2 = y1 + parseFloat(element.getAttribute("data-height"));

        //     switch (view.transformationAxis) {
        //         case "both":
        //             if (view.transformationDirection === "top-left") {
        //                 x1 = x1 + (view.endPoint.x - view.startPoint.x) / view.scale;
        //                 y1 = y1 + (view.endPoint.y - view.startPoint.y) / view.scale;
        //             }
        //             if (view.transformationDirection === "top-right") {
        //                 x2 = x2 + (view.endPoint.x - view.startPoint.x) / view.scale;
        //                 y1 = y1 + (view.endPoint.y - view.startPoint.y) / view.scale;
        //             }
        //             if (view.transformationDirection === "bottom-left") {
        //                 x1 = x1 + (view.endPoint.x - view.startPoint.x) / view.scale;
        //                 y2 = y2 + (view.endPoint.y - view.startPoint.y) / view.scale;
        //             }
        //             if (view.transformationDirection === "bottom-right") {
        //                 x2 = x2 + (view.endPoint.x - view.startPoint.x) / view.scale;
        //                 y2 = y2 + (view.endPoint.y - view.startPoint.y) / view.scale;
        //             }
        //             if (x2 < x1) {
        //                 matrix.a *= -1;
        //             }
        //             if (y2 < y1) {
        //                 matrix.d *= -1;
        //             }
        //             break;

        //         case "horizontal":
        //             if (view.transformationDirection === "middle-left") {
        //                 x1 = x1 + (view.endPoint.x - view.startPoint.x) / view.scale;
        //             }
        //             if (view.transformationDirection === "middle-right") {
        //                 x2 = x2 + (view.endPoint.x - view.startPoint.x) / view.scale;
        //             }
        //             if (x2 < x1) {
        //                 matrix.a *= -1;
        //             }
        //             break;

        //         case "vertical":
        //             if (view.transformationDirection === "middle-top") {
        //                 y1 = y1 + (view.endPoint.y - view.startPoint.y) / view.scale;
        //             }
        //             if (view.transformationDirection === "middle-bottom") {
        //                 y2 = y2 + (view.endPoint.y - view.startPoint.y) / view.scale;
        //             }
        //             if (y2 < y1) {
        //                 matrix.d *= -1;
        //             }
        //             break;
        //     }

        //     [x1, x2] = [Math.min(x1, x2), Math.max(x1, x2)];
        //     [y1, y2] = [Math.min(y1, y2), Math.max(y1, y2)];

        //     width = x2 - x1;
        //     height = y2 - y1;
        //     matrix.e = x1;
        //     matrix.f = y1;

        //     element.style.width = `${width}px`;
        //     element.style.height = `${height}px`;
        //     element.style.transform = matrix.toString();

        //     continue;
        // }

        // ratioX1 = parseFloat(element.getAttribute("data-x1ratio")) || 0;
        // ratioY1 = parseFloat(element.getAttribute("data-y1ratio")) || 0;
        // ratioX2 = parseFloat(element.getAttribute("data-x2ratio")) || 0;
        // ratioY2 = parseFloat(element.getAttribute("data-y2ratio")) || 0;

        // const isFlippedHorizontally = Math.sign(matrix.a) === -1;
        // const isFlippedVertically = Math.sign(matrix.d) === -1;
        // let shouldFlippedHorizontally = isFlippedHorizontally;
        // let shouldFlippedVertically = isFlippedVertically;
        let shouldFlippedHorizontally = false;
        let shouldFlippedVertically = false;

        switch (view.transformationAxis) {
            case "both":
                if (elements.length === 1) {
                    width = x2 - x1;
                    height = y2 - y1;
                    matrix.e = x1;
                    matrix.f = y1;
                // } else {
                //     if (view.endPoint.x < view.startPoint.x) {
                //         [ratioX1, ratioX2] = [ratioX2, ratioX1];
                //     }
                //     if (view.endPoint.y < view.startPoint.y) {
                //         [ratioY1, ratioY2] = [ratioY2, ratioY1];
                //     }
                //     if (view.transformationDirection === "top-left") {
                //         [ratioX1, ratioX2] = [ratioX2, ratioX1];
                //         [ratioY1, ratioY2] = [ratioY2, ratioY1];
                //     }
                //     if (view.transformationDirection === "top-right") {
                //         [ratioY1, ratioY2] = [ratioY2, ratioY1];
                //     }
                //     if (view.transformationDirection === "bottom-left") {
                //         [ratioX1, ratioX2] = [ratioX2, ratioX1];
                //     }
                //     width = x2 - x1;
                //     height = y2 - y1;
                //     x1 = x1 + ratioX1 * width;
                //     y1 = y1 + ratioY1 * height;
                //     matrix.e = x1;
                //     matrix.f = y1;
                //     x2 = x2 - ratioX2 * width;
                //     y2 = y2 - ratioY2 * height;
                //     width = x2 - x1;
                //     height = y2 - y1;
                }
                if (! view.isInserting) {
                    if (view.endPoint.x < view.startPoint.x) {
                        // matrix.a *= -1;
                        shouldFlippedHorizontally = ! shouldFlippedHorizontally;
                    }
                    if (view.endPoint.y < view.startPoint.y) {
                        // matrix.d *= -1;
                        shouldFlippedVertically = ! shouldFlippedVertically;
                    }
                }
                // if (view.transformationDirection === "top-left") {
                //     // matrix.a *= -1;
                //     // matrix.d *= -1;
                //     shouldFlippedHorizontally = ! shouldFlippedHorizontally;
                //     shouldFlippedVertically = ! shouldFlippedVertically;
                // }
                // if (view.transformationDirection === "top-right") {
                //     // matrix.d *= -1;
                //     shouldFlippedVertically = ! shouldFlippedVertically;
                // }
                // if (view.transformationDirection === "bottom-left") {
                //     // matrix.a *= -1;
                //     shouldFlippedHorizontally = ! shouldFlippedHorizontally;
                // }
                // if (isFlippedHorizontally !== shouldFlippedHorizontally) {
                //     if (shouldFlippedHorizontally) {
                //         matrix.e += width;
                //     } else {
                //         matrix.e -= width;
                //     }
                // }
                // if (isFlippedVertically !== shouldFlippedVertically) {
                //     if (shouldFlippedVertically) {
                //         matrix.f += height;
                //     } else {
                //         matrix.f -= height;
                //     }
                // }
                break;

            case "horizontal":
                if (elements.length === 1) {
                    width = x2 - x1;
                    height = parseFloat(element.getAttribute("data-height"));
                    matrix.e = x1;
                // } else {
                //     if (view.endPoint.x < view.startPoint.x) {
                //         [ratioX1, ratioX2] = [ratioX2, ratioX1];
                //     }
                //     if (view.transformationDirection === "middle-left") {
                //         [ratioX1, ratioX2] = [ratioX2, ratioX1];
                //     }
                //     width = x2 - x1;
                //     height = parseFloat(element.getAttribute("data-height"));
                //     x1 = x1 + ratioX1 * width;
                //     matrix.e = x1;
                //     x2 = x2 - ratioX2 * width;
                //     width = x2 - x1;
                }
                // if (view.endPoint.x < view.startPoint.x) {
                //     matrix.a *= -1;
                //     // shouldFlippedHorizontally = ! shouldFlippedHorizontally;
                // }
                // if (view.transformationDirection === "middle-left") {
                //     matrix.a *= -1;
                //     // shouldFlippedHorizontally = ! shouldFlippedHorizontally;
                // }
                // if (isFlippedHorizontally !== shouldFlippedHorizontally) {
                //     if (shouldFlippedHorizontally) {
                //         matrix.e += width;
                //     } else {
                //         matrix.e -= width;
                //     }
                // }
                break;

            case "vertical":
                if (elements.length === 1) {
                    width = parseFloat(element.getAttribute("data-width"));
                    height = y2 - y1;
                    matrix.f = y1;
                // } else {
                //     if (view.endPoint.y < view.startPoint.y) {
                //         [ratioY1, ratioY2] = [ratioY2, ratioY1];
                //     }
                //     if (view.transformationDirection === "middle-top") {
                //         [ratioY1, ratioY2] = [ratioY2, ratioY1];
                //     }
                //     width = parseFloat(element.getAttribute("data-width"));
                //     height = y2 - y1;
                //     y1 = y1 + ratioY1 * height;
                //     matrix.f = y1;
                //     y2 = y2 - ratioY2 * height;
                //     height = y2 - y1;
                }
                // if (view.endPoint.y < view.startPoint.y) {
                //     matrix.d *= -1;
                //     // shouldFlippedVertically = ! shouldFlippedVertically;
                // }
                // if (view.transformationDirection === "middle-top") {
                //     matrix.d *= -1;
                //     // shouldFlippedVertically = ! shouldFlippedVertically;
                // }
                // if (isFlippedVertically !== shouldFlippedVertically) {
                //     if (shouldFlippedVertically) {
                //         matrix.f += height;
                //     } else {
                //         matrix.f -= height;
                //     }
                // }
                break;
        }

        element.style.width = `${width}px`;
        element.style.height = `${height}px`;
        element.style.transform = matrix.toString();

        // if (! view.isInserting) {
        //     let [scaleX, scaleY] = element.style.scale.split(" ");
        //     scaleX = parseFloat(scaleX);
        //     scaleY = parseFloat(scaleY || 1);
        //     if (shouldFlippedHorizontally) {
        //         scaleX = -1;
        //     }
        //     if (shouldFlippedVertically) {
        //         scaleY = -1;
        //     }
        //     element.style.scale = `${scaleX} ${scaleY}`;
        // }
    }

    x1 = Math.min(view.startPoint.x, view.endPoint.x);
    y1 = Math.min(view.startPoint.y, view.endPoint.y);
    x2 = Math.max(view.startPoint.x, view.endPoint.x);
    y2 = Math.max(view.startPoint.y, view.endPoint.y);

    view.selectedOBRect.x = x1;
    view.selectedOBRect.y = y1;
    view.selectedOBRect.width = x2 - x1;
    view.selectedOBRect.height = y2 - y1;
}

/** */
export function rotateElements(view, elements, angle = null) {
    // // Normalize to an array
    // if (! Array.isArray(elements)) {
    //     elements = [elements];
    // }

    // // FIXME: sometimes the element' bounding box is randomly shifted by < 1 pixel
    // for (const element of elements) {
    //     const matrix = new DOMMatrix(element.getAttribute("data-transform"));

    //     if (angle === null) {
    //         const startAngle = Math.atan2(view.startPoint.y - view.pivotPoint.y, view.startPoint.x - view.pivotPoint.x);
    //         const endAngle = Math.atan2(view.endPoint.y - view.pivotPoint.y, view.endPoint.x - view.pivotPoint.x);
    //         angle = (endAngle - startAngle) * 180 / Math.PI;
    //     }

    //     if (getIndividualTransformationMode()) {
    //         matrix.rotateSelf(0, 0, angle);
    //     } else {
    //         const originX = (view.pivotPoint.x - parseFloat(element.getAttribute("data-bxcenter"))) / view.scale;
    //         const originY = (view.pivotPoint.y - parseFloat(element.getAttribute("data-bycenter"))) / view.scale;
    //         matrix.translateSelf(originX, originY);
    //         matrix.rotateSelf(0, 0, angle);
    //         matrix.translateSelf(-originX, -originY);
    //     }

    //     element.style.transform = matrix.toString();
    // }
}

/**
 * Extracts scale, rotation, skew, and translation from a CSS transform matrix.
 *
 * I have no idea how on earth this works, but it passed some tests. Honestly,
 * I just copied it from ChatGPT. Would be glad if someone can explain it better.
 */
export function extractTransformationMatrix(matrix) {
    const values = matrix.match(/matrix\(([^)]+)\)/)[1].split(",").map(parseFloat);
    const [a, b, c, d, e, f] = values;

    const scaleX = Math.sqrt(a * a + b * b);
    const scaleY = Math.sqrt(c * c + d * d);

    const rotate = Math.atan2(b, a) * (180 / Math.PI);

    const skewX = Math.atan2(a * c + b * d, scaleY) * (180 / Math.PI);
    const skewY = Math.atan2(c * a + d * b, scaleX) * (180 / Math.PI);

    const translateX = e;
    const translateY = f;

    return {
        scaleX,
        scaleY,
        rotate,
        skewX,
        skewY,
        translateX,
        translateY,
    };
}

/**
 * Multiplies two transformation matrices.
 *
 * This function was also copied from ChatGPT.
 */
export function multiplyTransformationMatrices(m1, m2) {
    return {
        a: m1.a * m2.a + m1.c * m2.b,
        b: m1.b * m2.a + m1.d * m2.b,
        c: m1.a * m2.c + m1.c * m2.d,
        d: m1.b * m2.c + m1.d * m2.d,
        e: m1.a * m2.e + m1.c * m2.f + m1.e,
        f: m1.b * m2.e + m1.d * m2.f + m1.f,
    };
}