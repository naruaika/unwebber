"use strict";

import { Component } from "../component.js";
import { getMenus } from "../../services/menu.js";

export class MenuBar extends Component {

    #cid = "menu-bar";
    #template = `
        <style>
            :host {
                height: inherit;
                display: flex;
                flex-wrap: wrap;
                padding: 0 10px;
            }

            .button {
                margin: 7px 0;
                padding: 4px 8px;

                font-size: 11px;
                color: var(--uwcolor-base);
                background-color: transparent;
                border: 0;
                border-radius: 10px;

                app-region: no-drag;
                user-select: none;

                &:hover,
                &.focused {
                    background-color: var(--uwcolor-gray-400);
                }
            }
        </style>
    `;

    menus = [];
    focused = null;

    constructor() {
        super();

        this.menus = getMenus();
        this.menus.forEach((menu) => {
            this.#template += `
                <div
                    class="menu-item button"
                    part="button"
                    role="menuitem"
                    aria-label="${menu.label}"
                    aria-keyshortcuts="${menu.keys}"
                    aria-haspopup="true"
                >
                    ${menu.label}
                </div>
            `;
        });

        this.cid = this.#cid;
        this.template = this.#template;

        // Bind these functions to keep their context when called from an event listener
        this.onWindowMouseDown = this.onWindowMouseDown.bind(this);
        this.onWindowKeyDown = this.onWindowKeyDown.bind(this);
        this.onWindowBlur = this.onWindowBlur.bind(this);
        this.onMenuItemMouseDown = this.onMenuItemMouseDown.bind(this);
        this.onMenuItemMouseEnter = this.onMenuItemMouseEnter.bind(this);
    }

    mounted() {
        this.registerEventListeners();
    }

    registerEventListeners() {
        // Register the event listeners for the menu items
        const menuItems = this.shadowRoot.querySelectorAll(".menu-item");
        menuItems.forEach((menuItem) => {
            menuItem.addEventListener("mousedown", this.onMenuItemMouseDown);
            menuItem.addEventListener("mouseenter", this.onMenuItemMouseEnter);
        });
    }

    /**
     * Register window events for the menu bar.
     */
    registerWindowEvents() {
        window.addEventListener("mousedown", this.onWindowMouseDown);
        window.addEventListener("keydown", this.onWindowKeyDown);
        window.addEventListener("blur", this.onWindowBlur);
    }

    /**
     * Unregister window events for the menu bar.
     */
    unregisterWindowEvents() {
        window.removeEventListener("mousedown", this.onWindowMouseDown);
        window.removeEventListener("keydown", this.onWindowKeyDown);
        window.removeEventListener("blur", this.onWindowBlur);
    }

    /**
     * Remove the focus from the menu item and unregister the window events.
     */
    onWindowMouseDown() {
        this.unregisterWindowEvents();
        this.focused?.classList.remove("focused");
        this.focused = null;
    }

    /**
     * Remove the focus from the menu item when pressing the Escape key
     *
     * @param {KeyboardEvent} event - The keydown event object.
     */
    onWindowKeyDown(event) {
        if (event.key === "Escape") {
            this.unregisterWindowEvents();
            this.focused?.classList.remove("focused");
            this.focused = null;
        }
    }

    /**
     * Remove the focus from the menu item when the window loses focus.
     */
    onWindowBlur() {
        this.unregisterWindowEvents();
        this.focused?.classList.remove("focused");
        this.focused = null;
    }

    /**
     * Show the context menu when clicking on a menu item.
     *
     * @param {MouseEvent} event - The mousedown event object.
     */
    onMenuItemMouseDown(event) {
        // Remove the focus from the menu item if it is already focused
        if (this.focused === event.target) {
            this.focused.classList.remove("focused");
            this.focused = null;
            return;
        }

        // Prevent the window from receiving the mouse down event
        event.stopPropagation();

        // Dispatch a custom event to show the context menu
        const items = this.shadowRoot.querySelectorAll(".menu-item");
        const index = Array.from(items).indexOf(event.target);
        const menu = this.menus[index];
        const rect = event.target.getBoundingClientRect();
        const newEvent = new CustomEvent("context-menu", {
            detail: {
                mid: menu.command,
                position: { x: rect.left, y: rect.bottom },
                menus: menu.children,
            },
            bubbles: true,
            composed: true,
        });
        this.dispatchEvent(newEvent);

        // Add the focus to the clicked menu item
        this.focused?.classList.remove("focused");
        this.focused = event.target;
        this.focused.classList.add("focused");

        // Re-register the window events
        this.unregisterWindowEvents();
        this.registerWindowEvents();
    }

    /**
     * Show the context menu when hovering over a menu item
     * if any of the menu items is already focused.
     *
     * @param {MouseEvent} event - The mouseenter event object.
     */
    onMenuItemMouseEnter(event) {
        // Skip if no menu item is focused
        if (! this.focused) {
            return;
        }

        // Dispatch a custom event to show the context menu
        const items = this.shadowRoot.querySelectorAll(".menu-item");
        const index = Array.from(items).indexOf(event.target);
        const menu = this.menus[index];
        const rect = event.target.getBoundingClientRect();
        const newEvent = new CustomEvent("context-menu", {
            detail: {
                mid: menu.command,
                position: { x: rect.left, y: rect.bottom },
                menus: menu.children,
            },
            bubbles: true,
            composed: true,
        });
        this.dispatchEvent(newEvent);

        // Add the focus to the hovered menu item
        this.focused?.classList.remove("focused");
        this.focused = event.target;
        this.focused.classList.add("focused");
    }
}

customElements.define("menu-bar", MenuBar);