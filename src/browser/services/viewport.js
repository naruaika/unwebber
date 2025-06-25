"use strict";

import { DocumentView } from "../interfaces/components/document-view.js";

const views = [];

let focusedTab = null;
let focusedView = null;

/** */
function focusView(view) {
    // Check if the view is already focused
    if (focusedView === view) {
        return;
    }

    // Change focus to the specified view
    if (focusedView) {
        focusedView.remove();
    }
    const viewport = document.querySelector(".viewport");
    viewport.appendChild(view);
    focusedView = view;

    // Change focus to the specified tab
    if (focusedTab) {
        focusedTab.classList.remove("focused");
    }
    const tab = document.querySelector(`.switcher .switch-${view.vid}`);
    tab.classList.add("focused");
    focusedTab = tab;
}

/** */
function createTab(view) {
    const tab = document.createElement("div");
    tab.classList.add("button", `switch-${view.vid}`);

    const title = document.createElement("span");
    title.textContent = view.title;
    tab.appendChild(title);

    const close = document.createElement("span");
    close.classList.add("close");
    close.innerHTML = `
        <svg width="8" height="8" viewBox="0 0 12 12">
            <path d="M1 1l10 10m0-10L1 11" stroke="currentColor" stroke-width="2" fill="none"/>
        </svg>
    `;
    close.addEventListener("click", (event) => {
        event.stopPropagation();
        views.splice(views.indexOf(view), 1);
        tab.remove();
        view.remove();
        if (focusedView === view) {
            focusedView = null;
            focusedTab = null;
        }
    });
    tab.appendChild(close);

    tab.addEventListener("mousedown", () => focusView(view));

    return tab;
}

/** */
function registerView(view) {
    // Check if the view is a valid DocumentView instance
    if (! (view instanceof DocumentView)) {
        console.error(
            "Exception has occured:"
            + " TypeError:"
            + ` Failed to register view '${view.vid}'.`
            + " The provided view is not a valid DocumentView instance."
        );
        return;
    }

    // Check if the view is already registered
    if (views.find(p => p.vid === view.vid)) {
        console.error(
            "Exception has occured:"
            + " TypeError:"
            + ` Failed to register view '${view.vid}''.`
            + " The provided view is already registered."
        );
        return;
    }

    // Register the view
    views.push(view);

    // Add a new tab to the switcher
    const switcher = document.querySelector(".switcher");
    const tab = createTab(view);
    switcher.appendChild(tab);
}

/** */
(function() {
    window.unwebber.file.watchNewDocumentDialog((settings) => {
        const view = new DocumentView(settings);
        registerView(view);
        focusView(view);
    });
})();