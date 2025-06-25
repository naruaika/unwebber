"use strict";

import { PanelBar } from "../panel-bar.js";
import { getTools, setSelectedTool, Tools } from "../../../services/tool.js";

export class Toolbar extends PanelBar {

    tools = [];
    selected = null;

    constructor() {
        super("tool-bar", "Toolbar");

        const style = document.createElement("style");
        style.textContent = `
            .tool-button {
                display: flex;
                justify-content: center;
                align-items: center;
                width: 20px;
                height: 20px;
                background: var(--uwcolor-gray-300);
                border-radius: 50%;
                user-select: none;

                &:hover {
                    background: var(--uwcolor-gray-250);
                }

                &.selected {
                    background: var(--uwcolor-gray-150);
                }
            }
        `;
        this.appendChild(style);

        this.tools = getTools();
        this.tools.forEach(tool => {
            const button = document.createElement("div");
            button.setAttribute("data-tool", tool.type);
            button.classList.add("tool-button");
            button.textContent = tool.icon;
            if (tool.type === Tools.selection) {
                button.classList.add("selected");
                this.selected = button;
            }
            button.addEventListener("click", () => this.select(button));
            this.appendChild(button);
        });

        this.onToolChange = this.onToolChange.bind(this);
    }

    mounted() {
        window.addEventListener("toolchange", this.onToolChange);
    }

    unmounted() {
        window.removeEventListener("toolchange", this.onToolChange);
    }

    /** */
    onToolChange(event) {
        this.selected?.classList.remove("selected");
        const button = this.querySelector(`[data-tool="${event.detail}"]`);
        if (button) {
            button.classList.add("selected");
            this.selected = button;
        }
    }

    /** */
    select(button) {
        this.selected?.classList.remove("selected");
        button.classList.add("selected");
        this.selected = button;
        window.removeEventListener("toolchange", this.onToolChange);
        setSelectedTool(button.getAttribute("data-tool"));
        window.addEventListener("toolchange", this.onToolChange);
    }
}

customElements.define('tool-bar', Toolbar);