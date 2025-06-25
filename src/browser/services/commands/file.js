"use strict";

/**
 * Opens a new file dialog to create a new document.
 */
export function newFile() {
    window.unwebber.file.openNewDocumentDialog();
}

/**
 * Exits the application.
 */
export function exit() {
    window.unwebber.file.exitApplication();
}