'use strict';

let appConfig = {};
let apiSchema = {};

let mousePosition = { x: 0, y: 0 };

let metadata = {};

let selectedNode = {
    node: null,
    position: null,
    parent: null,
};

let hoveredNode = {
    node: null,
    position: null,
    parent: null,
};

let hasCutNode = null;

let nodeToPaste = {
    node: null,
    position: null,
    parent: null,
};

const setMousePosition = (x, y) => mousePosition = { x, y };

const setMetadata = (key, value) => { value === null ? delete metadata[key] : metadata[key] = value };

const setSelectedNode = (node, position = null, parent = null) => selectedNode = { node, position, parent };

const setHoveredNode = (node, position = null, parent = null) => hoveredNode = { node, position, parent };

const setHasCutNode = (boolean) => hasCutNode = boolean;

const setNodeToPaste = (node, position = null, parent = null) => nodeToPaste = { node, position, parent };

await window.unwebber.config.load().then(config => appConfig = config);
await window.unwebber.apis.schema().then(schema => apiSchema = schema);

export {
    appConfig,
    apiSchema,

    mousePosition,
    metadata,
    selectedNode,
    hoveredNode,
    hasCutNode,
    nodeToPaste,

    setMousePosition,
    setMetadata,
    setSelectedNode,
    setHoveredNode,
    setHasCutNode,
    setNodeToPaste,
};