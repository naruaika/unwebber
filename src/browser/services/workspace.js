"use strict";

import { TitleBar } from "../interfaces/components/title-bar.js";
import { StatusBar } from "../interfaces/components/status-bar.js";
import { PanelTabGroup } from "../interfaces/components/panel-tab-group.js";
import { PanelTabBar } from "../interfaces/components/panel-tab-bar.js";
import { PanelBar } from "../interfaces/components/panel-bar.js";

import { Toolbar } from "../interfaces/components/panels/toolbar.js";

const panels = [];

/** */
export const registerPanel = (panel, dock = "left") => {
    // Check if the dock is valid
    if (["left", "top", "right", "bottom"].indexOf(dock) === -1) {
        console.error(
            "Exception has occured:"
            + " TypeError:"
            + ` Failed to register panel '${panel.pid}' in an invalid dock '${dock}'.`
            + " Valid docks are: 'left', 'top', 'right', and 'bottom'."
        );
        return;
    }

    // Check if the panel is a valid Panel instance
    if (! (panel instanceof PanelBar)) {
        console.error(
            "Exception has occured:"
            + " TypeError:"
            + ` Failed to register panel '${panel.pid}' in dock '${dock}'.`
            + " The provided panel is not a valid Panel instance."
        );
        return;
    }

    // Check if the panel is already registered
    if (panels.find(p => p.pid === panel.pid)) {
        console.error(
            "Exception has occured:"
            + " TypeError:"
            + ` Failed to register panel '${panel.pid}' in dock '${dock}'.`
            + " The provided panel is already registered."
        );
        return;
    }

    // Register the panel
    panels.push(panel);

    // Wrap the panel in a tab bar
    const tab = new PanelTabBar();
    tab.appendChild(panel);

    // Wrap the tab bar in a tab group
    const group = new PanelTabGroup();
    group.appendChild(tab);

    // Set the directionality of the panel and append it to the dock
    const container = document.querySelector(`.dock-area.${dock}`);
    let direction = "column";
    if (container.classList.contains("top") || container.classList.contains("bottom")) {
        direction = "row";
    }
    panel.setAttribute("direction", direction);
    tab.setAttribute("direction", direction);
    group.setAttribute("direction", direction);
    container.appendChild(group);
}

/**
 * Replace the title bar placeholder with the title bar component.
 */
(function() {
    const placeholder = document.querySelector(".title-bar");
    placeholder.replaceWith(new TitleBar());
})();

/**
 * Replace the status bar placeholder with the status bar component.
 */
(function() {
    const placeholder = document.querySelector(".status-bar");
    placeholder.replaceWith(new StatusBar());
})();

/** */
(function() {
    const content = document.createElement("div");
    content.setAttribute("style", `
        width: 20px;
        height: 20px;
        background: var(--uwcolor-gray-300);
        border-radius: 50%;
    `);

    // const panel1 = new PanelBar("toolbar");
    // panel1.appendChild(content.cloneNode(true));
    // panel1.appendChild(content.cloneNode(true));
    // registerPanel(panel1, "left");

    const toolbar = new Toolbar();
    registerPanel(toolbar, "left");

    const panel2 = new PanelBar("properties");
    panel2.appendChild(content.cloneNode(true));
    panel2.appendChild(content.cloneNode(true));
    registerPanel(panel2, "top");

    const panel3 = new PanelBar("color");
    panel3.appendChild(content.cloneNode(true));
    panel3.appendChild(content.cloneNode(true));
    registerPanel(panel3, "right");

    const panel4 = new PanelBar("layers");
    panel4.appendChild(content.cloneNode(true));
    panel4.appendChild(content.cloneNode(true));
    registerPanel(panel4, "right");
})();