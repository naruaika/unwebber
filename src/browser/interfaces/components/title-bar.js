"use strict";

import { Component } from "../component.js";
import { MenuBar } from "./menu-bar.js";

export class TitleBar extends Component {

    #cid = "title-bar";
    #template = `
        <style>
            :host {
                display: flex;
                height: var(--title-bar-height);
                app-region: drag;
                user-select: none;

                font-size: 12px;
                color: var(--uwcolor-base);

                ::part(button) {
                    font-family: inherit;
                }

                > .left {
                    width: 20%;
                    flex-grow: 1;
                    display: flex;
                    justify-content: flex-start;
                    overflow: hidden;
                }

                > .center {
                    width: 60%;
                    margin: 0 10px;
                    max-width: fit-content;
                    min-width: 0;

                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                > .right {
                    width: 20%;
                    flex-grow: 1;
                    display: flex;
                    justify-content: flex-end;
                    overflow: hidden;
                }
            }

            .app-icon {
                align-self: center;
                padding-left: 10px;
                margin-right: -5px;
                font-size: 20px;

                &::before {
                    content: "\\ea01";
                }
            }
        </style>

        <div class="left"><i class="app-icon" part="icon"></i></div>
        <div class="center">{{title}}</div>
        <div class="right"></div>
    `;

    constructor() {
        super();
        this.cid = this.#cid;
        this.template = this.#template;
    }

    mounted() {
        // Attach the menu bar to the title bar
        const container = this.shadowRoot.querySelector(".left");
        const component = new MenuBar();
        container.appendChild(component);

        // Dim the title bar when the window loses focus
        window.addEventListener("blur", () => this.style.opacity = 0.5);

        // Restore the title bar when the window gains focus
        window.addEventListener("focus", () => this.style.opacity = 1);
    }
}

customElements.define("title-bar", TitleBar);