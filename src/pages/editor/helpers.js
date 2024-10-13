'use strict';

import { apiSchema, setElementData } from './globals.js';

export const isObjectEmpty = (obj) => {
    for (let _ in obj) {
        return false;
    }
    return true;
}

export const convertCamelToKebab = (camel) => camel.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();

export const convertKebabToCamel = (kebab) => kebab.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());

export const generateUniqueId = () => {
    let uniqueId = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const length = characters.length;
    for (let i = 0; i < 10; i++) {
        uniqueId += characters.charAt(Math.floor(Math.random() * length));
    }
    return uniqueId;
}

export const searchInText = (query, text) => {
    const queryChars = query.split('');
    const textChars = text.split('');
    let queryIndex = 0;
    let textIndex = 0;
    while (
        queryIndex < queryChars.length &&
        textIndex < textChars.length
    ) {
        if (queryChars[queryIndex] === textChars[textIndex]) {
            queryIndex++;
        }
        textIndex++;
    }
    return queryIndex === queryChars.length;
}

export const getAppliedStyleRules = (element) => {
    var appliedStyleRules = [];

    // Get CSS style rules from all stylesheets applied to the element
    const mainFrame = document.getElementById('main-iframe');
    var cssStyleRules = Array.from(mainFrame.contentDocument.styleSheets)
        .slice(0, -1)
        .flatMap(styleSheet => Array.from(styleSheet.cssRules))
        .filter(cssRule => element.matches(cssRule.selectorText));
    for (let i = 0; i < cssStyleRules.length; i++) {
        const cssStyleRule = cssStyleRules[i];
        appliedStyleRules.push({
            order: i,
            selector: cssStyleRule.selectorText,
            stylesheet: cssStyleRule.parentStyleSheet.href,
            styles: Object.entries(cssStyleRule.style)
                .filter(([key, value]) => value !== '' && isNaN(key))
                .reduce((style, [key, value]) => {
                    style[convertCamelToKebab(key)] = value;
                    return style;
                }, {}),
        })
    }

    // Get the inline CSS style rules applied to the element
    if (element.getAttribute('style')) {
        appliedStyleRules.push({
            order: cssStyleRules.length,
            selector: 'inline',
            stylesheet: 'inline',
            styles: element.getAttribute('style')
                .trim()
                .replace(/\n/g, '')
                .replace(/\s+/g, ' ')
                .split(';')
                .filter(rule => rule.trim() !== '')
                .reduce((style, rule) => {
                    const [property, value] = rule.split(':').map(s => s.trim());
                    style[convertCamelToKebab(property)] = value;
                    return style;
                }, {}),
        });
    }

    return appliedStyleRules;
}

export const setupDocument = (element, regenerateId = true) => {
    // Populate the dataset attribute helper
    const attributes = {};
    Array.from(element.attributes).forEach(attribute => {
        if (attribute.name === 'style') {
            return; // skip the style attribute
        }
        if (attribute.name.startsWith('data-uw-')) {
            return; // skip the editor attribute
        }
        attributes[attribute.name] = {
            value: attribute.value.trim().replace(/\s+/g, ' '),
            checked: true,
        };
    });

    // Populate the dataset property helper
    const properties = {};
    getAppliedStyleRules(element).forEach(rule => {
        Object.entries(rule.styles).forEach(([property, value]) => {
            properties[property] = { value, checked: true };
        });
    });

    // Set the dataset identifier helper
    if (! element.dataset.uwId || regenerateId) {
        element.dataset.uwId = generateUniqueId();
    }

    // Reset the IDs of the copied element and its children
    if (regenerateId) {
        element.removeAttribute('id');
        Array.from(element.querySelectorAll('[id]')).forEach(child => child.removeAttribute('id'));
    }

    // Cache the element data
    setElementData(element.dataset.uwId, {
        label: ''
            || apiSchema.htmlElements.find(htmlElement => htmlElement.tag === element.tagName.toLowerCase())?.name
            || element.tagName.toLowerCase(),
        attributes,
        properties,
    });

    // Loop through the copied element children recursively
    Array.from(element.children).forEach(child => setupDocument(child, regenerateId));
}