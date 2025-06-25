// This module contains functions related to element insertion and modification.
// It is tightly coupled to the DocumentView component.

"use strict";

import { random } from "../helpers/string";

/** */
export function createRectangle() {
    const element = document.createElement("div");

    element.setAttribute("data-id", `rect-${random()}`);
    element.setAttribute("data-type", "Rectangle");

    element.setAttribute("data-transform", "matrix(1, 0, 0, 1, 0, 0)");
    element.setAttribute("data-width", "0");
    element.setAttribute("data-height", "0");
    element.setAttribute("data-xscale", "1");
    element.setAttribute("data-yscale", "1");

    element.style.position = "absolute";
    element.style.transformOrigin = "0 0 0";
    element.style.transform = "matrix(1, 0, 0, 1, 0, 0)";
    element.style.scale = "1 1";
    element.style.width = "0px";
    element.style.height = "0px";
    element.style.backgroundColor = "#EBEBEB";

    // For development purposes only
    element.style.overflow = "clip";
    element.style.backgroundColor = `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')}`;
    element.textContent = "Lorem ipsum dolor sit amet";

    return element;
}