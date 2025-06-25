"use strict";

import { random } from "../../helpers/string.js";
import { Component } from "../component.js";

export class PanelTabGroup extends Component {

    #cid = "tab-group";
    #template = `
        <style>
            :host {
                display: flex;
            }

            .container {
                flex: 1;
                display: flex;
                flex-direction: column;

                .handler {
                    box-sizing: border-box;
                    width: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: end;
                    background-color: var(--uwcolor-gray-500);

                    .arrow {
                        margin-top: -2px;
                        padding: 1px 3px;
                        font-size: 10px;
                        color: var(--uwcolor-gray-200);

                        &::before {
                            content: "\\00BB";
                        }

                        &:hover {
                            background-color: var(--uwcolor-gray-450);
                        }
                    }
                }

                .handler + * {
                    flex: 1;
                }

                &.row {
                    flex-direction: row;

                    .handler {
                        display: none;
                    }
                }
            }
        </style>

        <div class="container">
            <div class="handler">
                <div class="arrow"></div>
            </div>
            <slot></slot>
        </div>
    `;

    /**
     * A flag that indicates whether the tab group is floating instead of docked.
     * It is used to style the tab group differently when it is floating and to disable
     * the resize handler for the particular side of the tab group when it is docked.
     */
    #floating = false;

    /**
     * The directionality of the tab group, it can be either "column" or "row". It is
     * mainly used for styling purposes. If it is set to "column", which is the default,
     * its handler will be displayed at the top of the tab group inside the tab group
     * regardless of whether the tab group is docked or floating. Setting it to "row"
     * will most likely hide the handler when the tab group is docked. It is uncommon to
     * have more than one tab group when the direction is set to "row".
     */
    #direction = "column";

    /**
     * A flag that indicates whether all tab bars inside the group should be expanded.
     * The default value is false. Toggling this property will also toggle the expanded
     * property of all tab bars inside the group.
     */
    #expanded = false;

    get floating() {
        return this.#floating;
    }

    set floating(value) {
        this.#floating = value;
        this.classList.toggle("floating", value);
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

        // Set the expanded property of all tab bars inside the group
        const container = this.shadowRoot.querySelector(".container");
        container.querySelectorAll(":scope > :not(.handler)").forEach(tab => tab.expanded = value);
    }

    constructor() {
        super();

        this.id = `panel-tab-group-${random()}`;
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

customElements.define("panel-tab-group", PanelTabGroup);