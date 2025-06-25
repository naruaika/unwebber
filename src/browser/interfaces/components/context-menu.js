"use strict";

import { Component } from "../component.js";

export class ContextMenu extends Component {

    #cid = "context-menu";
    #template = `
        <style>
            :host {
                position: fixed;
                z-index: 1000;
                top: 0;
                left: 0;
                min-width: 200px;
                padding: 5px;

                background-color: var(--uwcolor-gray-500);
                box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
                border: 1px solid var(--uwcolor-gray-450);
                border-radius: 10px;
            }

            :host(:hover) .button.focused:not(:hover) {
                background-color: var(--uwcolor-blue-350);
            }

            .button {
                padding: 4px 8px;
                display: flex;
                align-items: center;
                gap: 6px;

                font-size: 11px;
                font-weight: 300;
                color: var(--uwcolor-base);
                border-radius: 5px;

                user-select: none;

                &.focused {
                    background-color: var(--uwcolor-gray-400);
                }

                &:hover {
                    background-color: var(--uwcolor-blue-350);
                }

                .icon {
                    display: block;
                    height: 12px;
                    width: 12px;
                    pointer-events: none;
                }

                .shortcut {
                    flex: 1;
                    margin-left: 40px;
                    text-align: end;
                }

                .arrow {
                    flex: 1;
                    margin-left: 40px;
                    text-align: end;
                    font-style: normal;
                    font-size: 10px;

                    &::before {
                        content: "\\2BC8";
                    }
                }
            }

            hr {
                margin: 5px 0;
                border: 0;
                border-top: 1px solid var(--uwcolor-gray-450);
            }
        </style>
    `;

    mid = "none";
    menus = [];
    focused = null;

    constructor() {
        super();

        this.cid = this.#cid;
        this.template = this.#template;
        this.canBeReused = true;

        // Bind these functions to keep its context when called from an event listener
        this.onMenuItemMouseEnter = this.onMenuItemMouseEnter.bind(this);
        this.onMenuItemMouseUp = this.onMenuItemMouseUp.bind(this);
        this.onMouseLeave = this.onMouseLeave.bind(this);
        this.onDestroy = this.onDestroy.bind(this);
    }

    mounted() {
        // Destroy the context menu when clicking outside of it
        // or when there is another context menu event fired
        window.addEventListener("mousedown", this.onDestroy);
        window.addEventListener("keydown", this.onDestroy);

        // Prevent the context menu from being destroyed when clicking inside of it
        this.addEventListener("mousedown", (event) => event.stopPropagation());
        this.addEventListener("mouseleave", this.onMouseLeave);

        // Show the sub menu when hovering over a menu item with children
        const menuItems = this.shadowRoot.querySelectorAll(".menu-item");
        menuItems.forEach((menuItem) => {
            menuItem.addEventListener("mouseenter", this.onMenuItemMouseEnter);
            menuItem.addEventListener("mouseup", this.onMenuItemMouseUp);
        });
    }

    unmounted() {
        // Remove the event listeners from the context menu
        window.removeEventListener("mousedown", this.onDestroy);
        window.removeEventListener("keydown", this.onDestroy);

        // Remove the event listeners from the menu items
        const menuItems = this.shadowRoot.querySelectorAll(".menu-item");
        menuItems.forEach((menuItem) => {
            menuItem.removeEventListener("mouseenter", this.onMenuItemMouseEnter);
            menuItem.removeEventListener("mouseup", this.onMenuItemMouseUp);
        });
    }

    setMenuId(value) {
        this.mid = value;
    }

    setParentId(value) {
        this.setAttribute("parent", value);
    }

    setPosition(value) {
        this.style.left = `${value.x || 0}px`;
        this.style.top = `${value.y || 0}px`;
    }

    setMenus(value) {
        let template = this.#template;

        this.menus = value;
        this.menus.forEach((item) => {
            if (item.separator) {
                template += `<hr>`;
                return;
            }
            if (item.placeholder) {
                const label = "&lt;None&gt;";
                template += `
                    <div class="menu-item button placeholder">
                        <span class="icon"></span>
                        ${label}
                    </div>
                `;
                return;
            }
            template += `
                <div
                    class="menu-item button ${item.children ? `has-children` : ""}"
                    data-command="${item.command}"
                >
                    <span class="icon"></span>
                    ${item.label}
                    ${item.keys ? `<span class="shortcut">${item.keys}</span>` : ""}
                    ${item.children ? `<i class="arrow"></i>` : ""}
                </div>
            `;
        });

        if (this.menus.length === 0) {
            const label = "&lt;None&gt;";
            template += `
                <div class="menu-item button placeholder">
                    <span class="icon"></span>
                    ${label}
                </div>
            `;
        }

        this.template = template;
    }

    /**
     * Show the sub menu when hovering over a menu item with children.
     */
    onMenuItemMouseEnter(event) {
        // Move the focus to the current menu item
        this.focused?.classList.remove("focused");
        this.focused = event.target;
        this.focused.classList.add("focused");

        const command = event.target.getAttribute("data-command");
        const parent = command?.split(".").slice(0, -1).join(".") || this.mid;

        // Remove all sub menus of the previous context menu
        // if the current menu item has no children
        if (! event.target.classList.contains("has-children")) {
            const newEvent = new CustomEvent("context-menu", {
                detail: {
                    delete: true,
                    parent: parent,
                },
                bubbles: true,
                composed: true,
            });
            this.dispatchEvent(newEvent);
            return;
        }

        // Prevent the menu item from attempting to show a sub menu
        if (event.target.classList.contains("placeholder")) {
            return;
        }

        // Dispatch a custom event to show a sub menu
        const menu = this.menus.find((item) => item.command === command);
        const rect = event.target.getBoundingClientRect();
        const newEvent = new CustomEvent("context-menu", {
            detail: {
                create: true,
                mid: command,
                parent: parent,
                position: { x: rect.right - 2, y: rect.top - 6 },
                menus: menu.children,
            },
            bubbles: true,
            composed: true,
        });
        this.dispatchEvent(newEvent);
    }

    /**
     * Dispatch a custom event when clicking on a menu item.
     */
    onMenuItemMouseUp(event) {
        if (event.currentTarget.classList.contains("placeholder")) {
            return;
        }
        if (event.currentTarget.classList.contains("has-children")) {
            return;
        }

        const command = event.currentTarget.getAttribute("data-command");
        const newEvent = new CustomEvent("command", {
            detail: { commands: [command] },
            bubbles: true,
            composed: true,
        });
        this.dispatchEvent(newEvent);

        // Remove the context menu from the DOM
        this.remove();

        // Dispatch a mouse down event to the window to remove the focus from the menu item
        window.dispatchEvent(new MouseEvent("mousedown"));
    }

    /**
     * Remove the focus from the menu item when leaving the context menu.
     * Only applies when the menu item has no children.
     */
    onMouseLeave() {
        if (this.focused && ! this.focused.classList.contains("has-children")) {
            this.focused.classList.remove("focused");
        }
    }

    /**
     * Destroy the context menu.
     *
     * @param {Event} event - The event that triggered the context menu destruction.
     */
    onDestroy(event) {
        // Prevent the context menu from being destroyed when pressing any key other than the Escape key
        if (event instanceof KeyboardEvent && event.key !== "Escape") {
            return;
        }

        // Remove the context menu from the DOM
        this.remove();
    }
}

customElements.define("context-menu", ContextMenu);