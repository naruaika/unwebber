"use strict";

import { ContextMenu } from "../interfaces/components/context-menu.js";

/**
 * Register custom context-menu event to show the context menu.
 */
(function () {
    window.addEventListener("context-menu", (event) => {
        // Remove all matching context menus if requested
        if (event.detail.delete) {
            const subMenus = document.querySelectorAll(`body > context-menu[parent^="${event.detail.parent}"]`);
            subMenus.forEach((menu) => menu.remove());
            return;
        }

        // Create or get the context menu element
        let contextMenu;
        if (event.detail.create) {
            contextMenu = document.querySelector(`body > context-menu[parent="${event.detail.parent}"]`) || new ContextMenu();
        } else {
            contextMenu = document.querySelector('body > context-menu[parent="none"]') || new ContextMenu();
        }

        // Remove all descendant menus of the previous context menu
        let selector = "body > context-menu";
        if (event.detail.create) {
            selector += `[parent^="${event.detail.parent}."]`;
        }
        const subMenus = document.querySelectorAll(selector);
        Array.from(subMenus).forEach((menu) => menu.remove());

        // Remove the context menu from the document body if it is already connected
        if (contextMenu.isConnected) {
            document.body.removeChild(contextMenu);
        }

        // Set the context menu properties
        contextMenu.setMenuId(event.detail.mid || "none");
        contextMenu.setParentId(event.detail.parent || "none");
        contextMenu.setPosition(event.detail.position);
        contextMenu.setMenus(event.detail.menus);

        // Append the context menu to the document body if it is not already connected
        if (! contextMenu.isConnected) {
            document.body.appendChild(contextMenu);
        }
    });

    // Remove all context menus when the window loses focus
    window.addEventListener("blur", () => {
        const subMenus = document.querySelectorAll("body > context-menu");
        subMenus.forEach((menu) => menu.remove());
    });
})();