"use strict";

import { random } from "../../helpers/string.js";
import { Component } from "../component.js";

export class PanelBar extends Component {

    #cid = "panel-bar";
    #template = `
        <style>
            :host {
                flex: 1;
                display: flex;
            }

            .container {
                flex: 1;
                padding: 5px 0;
                min-width: 26px;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 5px;
                background-color: var(--uwcolor-gray-450);

                &.row {
                    padding: 0 5px;
                    flex-direction: row;
                    min-width: unset;
                    min-height: 26px;
                }
            }
        </style>

        <div class="container">
            <slot></slot>
        </div>
    `;

    /**
     * The panel identifier, used to generate a unique identifier for the panel.
     */
    #pid = "panel-bar";

    /**
     * The panel label, used to display the name of the panel in the tab bar.
     */
    #label = "Panel";

    /**
     * Differs from the direction attribute in that is mainly used for styling purposes,
     * this property is used to set the native directionality of the container element so
     * the layout manager can prevent it from being docked on the wrong side of the window.
     *
     * For example, if the direction property is set to "column", the panel can only be docked
     * on the left or right side of the window. Most panels are designed to have a vertical
     * orientation, so the default value is "column". If it is set to "both", the panel can be
     * docked on any side of the window, useful for panels that have no specific orientation
     * like the console panel, text editor, image viewer, etc.
     */
    #direction = "column";

    /**
     * A flag that indicates whether the panel should be expanded to show its content
     * instead of showing only the panel header. The default value is false, meaning
     * the panel should be collapsed by default so that the user can have more space
     * to work with the main viewport.
     */
    #expanded = false;

    /**
     * A flag that indicates whether the panel should be simplified to show a minimal
     * version of the panel, useful for panels that have a lot of content and need to
     * be simplified to show only the most important information. Most panels don't
     * have a simplified version, so the default value is null.
     */
    #simplified = null;

    get pid() {
        return this.#pid;
    }

    set pid(value) {
        this.#pid = `${value}-${random()}`;
        this.id = this.#pid;
    }

    get label() {
        return this.#label;
    }

    set label(value) {
        this.#label = value;
    }

    get direction() {
        return this.#direction;
    }

    set direction(value) {
        this.#direction = value;
    }

    get expanded() {
        return this.#expanded;
    }

    set expanded(value) {
        this.#expanded = value;
        this.classList.toggle("expanded", value);
    }

    get simplified() {
        return this.#simplified;
    }

    set simplified(value) {
        this.#simplified = value;
        this.classList.toggle("simplified", value);
    }

    constructor(pid, label) {
        super();

        this.pid = pid || this.#pid;
        this.label = label || this.#label;

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

customElements.define("panel-bar", PanelBar);