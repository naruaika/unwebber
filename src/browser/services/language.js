"use strict";

/**
 * Return the preferred language of the user, usually the language of the browser user interface
 *
 * In the future, for better user experience, this function will be replaced completely by
 * a function that retrieves the preferred language from the user configuration.
 *
 * @returns {string} The language code of the browser.
 */
export function getBrowserLanguage() {
    const language = navigator.language || navigator.userLanguage;
    return language.split('-')[0];
}