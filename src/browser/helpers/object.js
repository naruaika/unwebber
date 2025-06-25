"use strict";

/**
 * Determines if the specified object is empty.
 *
 * @param {Object} obj - An object to evaluate.
 * @returns {Boolean} A value indicating if the object is empty.
 */
export const isObjectEmpty = (obj) => {
    for (let _ in obj) {
        return false;
    }
    return true;
}