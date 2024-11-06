'use strict';

import { apiSchema, metadata, setMetadata } from './globals.js';

export const debounce = (func, wait, immediate) => {
    let timeout;
    return function(...args) {
        const context = this;
        const later = function() {
            timeout = null;
            if (! immediate) func.apply(context, args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    };
}

export const isObjectEmpty = (obj) => {
    for (let _ in obj) {
        return false;
    }
    return true;
}

export const isElementTextable = (element) => {
    if (! element) {
        return false;
    }

    // Check if the element has no text node
    if (! Array
            .from(element.childNodes)
            .some(child =>
                child.nodeType === Node.TEXT_NODE &&
                child.textContent.trim() !== ''
            )
    ) {
        return false;
    }

    const tagName = element.tagName.toLowerCase();
    const tagSpecs = apiSchema.htmlElements?.find(htmlElement => htmlElement.tag === tagName);

    //
    if (
        tagName !== 'html' &&
        tagName !== 'body' &&
        ! tagSpecs?.categories.includes('void') &&
        ! tagSpecs?.categories.includes('embedded') &&
        ! element.classList.contains('uw-ignore')
    ) {
        return true;
    }

    return false;
}

export const isElementVoid = (element) => {
    if (! element) {
        return false;
    }

    // Check if the element is a text node
    if (element.nodeType === Node.TEXT_NODE) {
        return true;
    }

    const tagName = element.tagName.toLowerCase();
    const tagSpecs = apiSchema.htmlElements?.find(htmlElement => htmlElement.tag === tagName);

    if (tagSpecs?.categories.includes('void')) {
        return true;
    }

    return false;
}

export const convertCamelToKebab = (camel) => camel.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();

export const convertKebabToCamel = (kebab) => kebab.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());

export const generateUniqueId = (length = 10) => {
    let uniqueId = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charLength = characters.length;
    for (let i = 0; i < length; i++) {
        uniqueId += characters.charAt(Math.floor(Math.random() * charLength));
    }
    return uniqueId;
}

export const hexToRgba = (hex) => {
    hex = hex.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const a = parseInt(hex.substring(6, 8) || 'ff', 16) / 255;
    return `rgba(${r}, ${g}, ${b}, ${a})`;
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
    let appliedStyleRules = [];

    // Get CSS style rules from all stylesheets applied to the element
    const mainFrame = document.getElementById('main-iframe');
    let cssStyleRules = Array.from(mainFrame.contentDocument.styleSheets)
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
    setMetadata(element.dataset.uwId, {
        label: ''
            || apiSchema.htmlElements.find(htmlElement => htmlElement.tag === element.tagName.toLowerCase())?.name
            || element.tagName.toLowerCase(),
        attributes,
        properties,
    });

    // Loop through the copied element children recursively
    Array.from(element.children).forEach(child => setupDocument(child, regenerateId));
}

export const styleElement = (element, property, value = null, checked = null) => {
    // Skip non-element nodes
    if (element.nodeType !== Node.ELEMENT_NODE) {
        return;
    }

    if (! value) {
        // Remove the property from the element
        element.style.removeProperty(property);

        // Remove the property from the metadata
        const _metadata = metadata[element.dataset.uwId];
        _metadata.properties[property] = {
            value: 'unset',
            checked: checked || _metadata.properties[property]?.checked || false,
        };
        setMetadata(element.dataset.uwId, _metadata);

        return;
    }

    // Set the property to the element
    element.style[property] = value;

    // Set the property to the metadata
    const _metadata = metadata[element.dataset.uwId];
    _metadata.properties[property] = {
        value,
        checked: checked || _metadata.properties[property]?.checked || true,
    };
    setMetadata(element.dataset.uwId, _metadata);
}