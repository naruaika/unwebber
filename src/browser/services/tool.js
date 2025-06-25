"use strict";

import { getBrowserLanguage } from "./language.js";

export const Tools = {
    selection: 1,
    rectangle: 2,
    frametext: 3,
    pancanvas: 4,
};

/**
 * The tools to be displayed in the toolbar.
 */
const tools = [
    { type: Tools.selection, label: "{{selection}}", icon: "S", keys: [ ["V"] ] },
    { type: Tools.rectangle, label: "{{rectangle}}", icon: "R", keys: [ ["M"] ] },
    { type: Tools.frametext, label: "{{frametext}}", icon: "F", keys: [ ["T"] ] },
];

let compiledTools = [];
let selectedTool = Tools.selection;

/**
 * Get the selected tool.
 */
export function getSelectedTool() {
    return selectedTool;
}

/**
 * Set the selected tool.
 */
export function setSelectedTool(value) {
    value = parseInt(value);
    if (! Object.values(Tools).includes(value)) {
        console.error(
            "Exception has occured:"
            + " TypeError:"
            + ` Failed to set selected tool.`
            + " The provided tool is not a valid tool."
        );
        return;
    }
    selectedTool = value;
    window.dispatchEvent(new CustomEvent("toolchange", { detail: value }));
}

/**
 * Find and replace placeholders with the corresponding strings.
 */
async function translateLabels(tools) {
    const language = getBrowserLanguage();
    const strings = await window.unwebber.language.translate("tools", language);

    // Skip if no strings are found
    if (! strings) {
        return tools;
    }

    tools.forEach(tool => tool.label = strings[tool.type] || tool.label);

    return tools;
}

/**
 * Register key bindings to switch between tools.
 */
function registerKeyBindings(tools) {
    window.addEventListener("keydown", (event) => {
        const key = event.key.toUpperCase();
        const tool = tools.find(tool => tool.keys.some(keys => keys.includes(key)));
        if (tool) {
            const type = tool.type;
            setSelectedTool(type);
        }
    });
}

/**
 * Get the translated tools.
 */
export function getTools() {
    return compiledTools;
}

/**
 * Initialize the compiled tools.
 */
await translateLabels(tools).then((translated) => compiledTools = translated);
registerKeyBindings(compiledTools);