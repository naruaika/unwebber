"use strict";

/**
 * Rounds a number to the specified number of decimal places.
 *
 * @param {number} value - The value to round.
 * @param {number} precision - The number of decimal places to round to.
 * @returns {number} The rounded value.
 */
export function round(value, precision = 1) {
    value = parseFloat(value);
    const multiplier = Math.pow(10, precision);
    return Math.round(value * multiplier) / multiplier;
}