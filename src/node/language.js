"use strict";

const fs = require('fs');
const path = require('path');

let strings = {};

/**
 * Retrieves the string associated with the specified key and language.
 *
 * This function serves as an IPC handler for the 'language:translate' event.
 * It checks if the language file exists at the path '../../res/strings/{language}.json'.
 * If the file does not exist or if the language code is 'en', it defaults to using 'default.json'.
 * The function then reads the file and returns the string corresponding to the given key.
 * If the key is not found, it returns the string from the 'default.json' file.
 *
 * @param {string} event - The IPC event object.
 * @param {string} key - The key for the desired string.
 * @param {string} language - The language code.
 * @returns {string} The string corresponding to the specified key and language.
 */
function translate(event, key, language = 'en') {
    // Normalize the language code
    language = language.split('-')[0];
    language = language.replace(/[^a-zA-Z]/g, '');

    // Get the path to the language file
    let filePath = path.join(__dirname, '../../res/strings', `${language}.json`);

    // Check if the language file exists
    if (! fs.existsSync(filePath) || language === 'en') {
        // Use the default language file
        filePath = path.join(__dirname, '../../res/strings', 'default.json');
    }

    // Check if the file is already cached
    if (! strings[filePath]) {
        // Read the language file
        const data = fs.readFileSync(filePath, 'utf8');

        // Parse the JSON data and cache it
        strings[filePath] = JSON.parse(data);
    }

    // Get the string associated with the key
    const string = strings[filePath][key];

    // Return the string
    return string;
}

module.exports = { translate };