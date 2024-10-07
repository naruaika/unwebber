'use strict';

let appConfig = {};
let apiSchema = {};

let mousePosition = { x: 0, y: 0 };

let elementData = {};

let selectedElement = null;

let hoveredElement = null;

let hasCutElement = null;

let elementToPaste = null;

const setMousePosition = (x, y) => mousePosition = { x, y };

const setElementData = (key, value) => {
    value === null
        ? delete elementData[key]
        : elementData[key] = value;
};

const setSelectedElement = (element) => selectedElement = element;

const setHoveredElement = (element) => hoveredElement = element;

const setHasCutElement = (boolean) => hasCutElement = boolean;

const setElementToPaste = (element) => elementToPaste = element;

await window.unwebber.config.load().then(config => appConfig = config);
await window.unwebber.apis.schema().then(schema => apiSchema = schema);

export {
    appConfig,
    apiSchema,
    mousePosition,
    elementData,
    selectedElement,
    hoveredElement,
    hasCutElement,
    elementToPaste,
    setMousePosition,
    setElementData,
    setSelectedElement,
    setHoveredElement,
    setHasCutElement,
    setElementToPaste,
};