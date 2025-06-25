"use strict";

import { Component } from "../component.js";

export class StatusBar extends Component {

    #cid = "status-bar";
    #template = `
        <style>
            :host {
                display: flex;
                align-items: center;
                position: absolute;
                left: 0;
                right: 0;
                bottom: 0;
                height: var(--status-bar-height);
                padding: 0 8px;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .container {
                color: #ffffff;
                font-size: 10px;
            }
        </style>

        <div class="container"></div>
    `;

    constructor() {
        super();
        this.cid = this.#cid;
        this.template = this.#template;

        this.onStatusChange = this.onStatusChange.bind(this);
    }

    mounted() {
        window.addEventListener("statuschange", this.onStatusChange);
    }

    unmounted() {
        window.removeEventListener("statuschange", this.onStatusChange);
    }

    /** */
    onStatusChange(event) {
        const container = this.shadowRoot.querySelector('.container');
        container.textContent = event.detail || "";
    }
}

customElements.define("status-bar", StatusBar);