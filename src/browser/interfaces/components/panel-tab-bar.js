"use strict";

import { random } from "../../helpers/string.js";
import { Component } from "../component.js";

export class PanelTabBar extends Component {

    #cid = "tab-bar";
    #template = `
        <style>
            :host {
                flex: 1;
                display: flex;
            }

            .container {
                flex: 1;
                padding: 5px;
                padding-top: 0;
                display: flex;
                align-items: center;
                flex-direction: column;
                background-color: var(--uwcolor-gray-450);

                .handler {
                    position: relative;
                    padding: 5px 0;
                    margin: 5px 0 0;
                    height: 2px;
                    width: 100%;
                    max-width: 20px;

                    &:hover::before {
                        background-color: var(--uwcolor-blue-300);
                    }

                    &::before {
                        content: "";
                        position: absolute;
                        left: 0;
                        top: 4px;
                        height: 2px;
                        width: 100%;
                        background-color: var(--uwcolor-gray-350);
                    }
                }

                &.row {
                    padding: 5px;
                    padding-left: 0;
                    flex-direction: row;

                    .handler {
                        padding: 0 5px;
                        margin: 0 0 0 5px;
                        width: 2px;
                        max-width: unset;
                        height: 100%;
                        max-height: 20px;

                        &::before {
                            left: 4px;
                            top: 0;
                            height: 100%;
                            width: 2px;
                        }
                    }
                }
            }
        </style>

        <div class="container">
            <div class="handler"></div>
            <div class="switcher"></div>
            <div class="viewport">
                <slot></slot>
            </div>
        </div>
    `;

    /**
     * A flag that indicates whether the tab bar is hidden. When the tab bar is hidden,
     * the tab switcher will not be displayed, but the active tab will still be visible.
     * The default value is false. But it is recommended to set it to true for some panels
     * that should not be grouped with others, for example panels that have their own tab bar
     * implementation like the console panel or the quick/control bar like on other applications.
     */
    #hidden = false;

    /**
     * The directionality of the tab bar, it can be either "column" or "row". Setting it to
     * "row" will make the tab switcher to be displayed on the left side of the tab bar.
     * As much as possible, we should avoid setting the direction property to "row" since
     * it can introduces to an awkward user experience when some panels have quite long names.
     * It will not cause an issue though when the tab bar is expanded, since the tab switcher
     * will only display the icons of the tabs.
     */
    #direction = "column";

    /**
     * A flag that indicates whether all panels inside the tab bar should be expanded.
     * The default value is false, the same as the panel's expanded property. Toggling
     * this property will also toggle the expanded property of all panels inside.
     */
    #expanded = false;

    get hidden() {
        return this.#hidden;
    }

    set hidden(value) {
        this.#hidden = value;
        this.classList.toggle("hidden", value);
    }

    get direction() {
        return this.#direction;
    }

    set direction(value) {
        this.#direction = value;
        this.classList.toggle("row", value === "row");
        this.classList.toggle("column", value === "column");
    }

    get expanded() {
        return this.#expanded;
    }

    set expanded(value) {
        this.#expanded = value;
        this.classList.toggle("expanded", value);

        // Set the expanded property of all panels inside the tab bar
        const viewport = this.shadowRoot.querySelector(".viewport");
        viewport.querySelectorAll(":scope > *").forEach(panel => panel.expanded = value);
    }

    constructor() {
        super();

        this.id = `panel-tab-bar-${random()}`;
        this.cid = this.#cid;
        this.template = this.#template;
    }

    mounted() {
        // Set the directionality of the container
        const direction = this.getAttribute("direction") || "column";
        const container = this.shadowRoot.querySelector(".container");
        container.classList.add(direction);
    }

    unmounted() {
        // Reset the directionality of the container
        const container = this.shadowRoot.querySelector(".container");
        container?.classList.remove("column", "row");
    }
}

customElements.define("panel-tab-bar", PanelTabBar);