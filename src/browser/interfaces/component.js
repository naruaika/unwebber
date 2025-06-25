"use strict";

import { getBrowserLanguage } from "../services/language.js";

export class Component extends HTMLElement {

    #cid = "component";
    #template = "<span></span>";

    #x = 0;
    #y = 0;
    #width = 0;
    #height = 0;

    #root;
    #children = [];

    #canBeReused = false;
    #wasRendered = false;

    get cid() {
        return this.#cid;
    }

    set cid(value) {
        this.#cid = value;
    }

    get template() {
        return this.#template;
    }

    set template(value) {
        this.#template = value;
        this.#render();
    }

    get x() {
        return this.#x;
    }

    set x(value) {
        this.#x = value;
    }

    get y() {
        return this.#y;
    }

    set y(value) {
        this.#y = value;
    }

    get width() {
        return this.#width;
    }

    set width(value) {
        this.#width = value;
    }

    get height() {
        return this.#height;
    }

    set height(value) {
        this.#height = value;
    }

    get root() {
        return this.#root;
    }

    set root(value) {
        this.#root = value;
    }

    get children() {
        return this.#children;
    }

    set children(value) {
        if (! this.#root) {
            return;
        }
        this.#root.innerHTML = "";
        if (! Array.isArray(value)) {
            this.#children = [value];
        } else {
            this.#children = value;
        }
        this.#children.forEach((child) => {
            this.#root.appendChild(child);
        });
    }

    get canBeReused() {
        return this.#canBeReused;
    }

    set canBeReused(value) {
        this.#canBeReused = value;
    }

    /** */
    appendChildren(children) {
        if (! this.#root) {
            return;
        }
        if (! Array.isArray(children)) {
            children = [children];
        }
        this.#children = this.#children.concat(children);
        children.forEach((child) => this.#root.appendChild(child));
    }

    /** */
    removeChildren(children) {
        if (! this.#root) {
            return;
        }
        if (! Array.isArray(children)) {
            children = [children];
        }
        this.#children = this.#children.filter((child) => ! children.includes(child));
        children.forEach((child) => this.#root.removeChild(child));
    }

    constructor() {
        super();

        // Create a shadow root
        this.attachShadow({ mode: "open" });
        this.shadowRoot.innerHTML = this.#template;
    }

    async connectedCallback() {
        await this.#translate();
        await this.#render();
        await this.mounted();
        this.#wasRendered = true;
    }

    async disconnectedCallback() {
        await this.unmounted();
    }

    async adoptedCallback() {
        await this.adopted();
    }

    async attributeChangedCallback(name, oldValue, newValue) {
        await this.updated(name, oldValue, newValue);
    }

    /**
     * Render the component template.
     */
    async #render() {
        // Prevent re-rendering if the component was already rendered
        // to avoid losing the current state
        if (! this.#canBeReused && this.#wasRendered) {
            return;
        }

        this.shadowRoot.innerHTML = this.#template;
    }

    /**
     * Find and replace placeholders with the corresponding strings.
     */
    async #translate() {
        // Skip if the Unwebber API is not available
        if (! window.unwebber) {
            return;
        }

        const language = getBrowserLanguage();
        const strings = await window.unwebber.language.translate(this.#cid, language);

        // Skip if no strings are found
        if (! strings) {
            return;
        }

        const placeholders = this.#template.match(/{{(.*?)}}/g);
        placeholders.forEach((placeholder) => {
            const key = placeholder.slice(2, -2);
            const value = strings[key];
            this.#template = this.#template.replace(placeholder, value);
        });
    }

    /**
     * Lifecycle hooks.
     */
    async mounted() {}
    async unmounted() {}
    async adopted() {}
    async updated(name, oldValue, newValue) {}
}